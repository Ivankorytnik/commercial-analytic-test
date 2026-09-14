(function(){
  const VERSION='1.0.0';
  let popup=null;
  let activeId='';

  const core=()=>window.ATOM_CORE;
  const editor=()=>window.ATOM_REQUIREMENTS_PERIOD_EDITOR;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const fmt=v=>{if(!v)return'—';const p=String(v).slice(0,10).split('-');return p.length===3?`${p[2]}.${p[1]}.${p[0]}`:String(v)};
  const dateOnly=v=>String(v||'').slice(0,10);

  function styles(){
    if(document.getElementById('requirements-period-click-picker-css'))return;
    const s=document.createElement('style');
    s.id='requirements-period-click-picker-css';
    s.textContent=`
      .req-enh-period{cursor:pointer;position:relative;transition:background .12s ease,border-color .12s ease}
      .req-enh-period:hover{background:#eefaf8!important}
      .req-enh-period[data-period-clickable="1"]:after{content:'▾';display:inline-block;margin-left:6px;color:#0f756d;font-size:10px;vertical-align:middle}
      .req-period-row-edit{display:none!important}
      .req-period-inline{display:none!important}
      .req-period-picker{position:fixed;z-index:2147483500;width:310px;max-width:calc(100vw - 24px);background:#fff;border:1px solid #cbd9d9;border-radius:12px;box-shadow:0 16px 45px rgba(18,38,39,.24);padding:12px}
      .req-period-picker-title{font-size:12px;font-weight:700;color:#183536;margin-bottom:3px}.req-period-picker-sub{font-size:9px;color:#6b7d7e;line-height:1.4;margin-bottom:10px}
      .req-period-picker-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.req-period-picker-field label{display:block;font-size:9px;color:#66797a;margin-bottom:4px}.req-period-picker-field input{width:100%;box-sizing:border-box;border:1px solid #c7d5d5;border-radius:7px;padding:8px;font:inherit;font-size:11px;background:#fff;color:#183536}
      .req-period-picker-hint{margin-top:8px;padding:7px 8px;border-radius:7px;background:#f3f8f8;color:#5b7071;font-size:9px;line-height:1.4}.req-period-picker-hint b{color:#294747}
      .req-period-picker-error{display:none;margin-top:7px;padding:7px 8px;border-radius:7px;background:#fff0ed;color:#a33b30;font-size:9px}
      .req-period-picker-actions{display:flex;justify-content:space-between;gap:7px;margin-top:10px}.req-period-picker-actions-right{display:flex;gap:6px}.req-period-picker .btn{padding:6px 9px;font-size:9px;cursor:pointer}
      @media(max-width:520px){.req-period-picker{left:12px!important;right:12px!important;width:auto}.req-period-picker-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function close(){
    popup?.remove();
    popup=null;
    activeId='';
  }

  function periodFor(id){
    const c=core();
    const req=c?.requirement?.(id);
    return req?c?.periodForRequirement?.(req):null;
  }

  function basePeriodFor(id){
    const c=core();
    const req=c?.requirement?.(id);
    if(!req)return null;
    const current=periodFor(id);
    const manual=editor()?.read?.(id);
    if(!manual)return current;
    const savedStart=manual.startDate,savedEnd=manual.endDate;
    editor()?.clear?.(id,false);
    const base=req?c?.periodForRequirement?.(req):null;
    if(savedStart&&savedEnd)editor()?.write?.(id,savedStart,savedEnd);
    return base||current;
  }

  function position(anchor){
    if(!popup||!anchor)return;
    const r=anchor.getBoundingClientRect();
    const pw=Math.min(310,window.innerWidth-24);
    let left=Math.min(Math.max(12,r.left),window.innerWidth-pw-12);
    let top=r.bottom+6;
    const ph=popup.offsetHeight||230;
    if(top+ph>window.innerHeight-12)top=Math.max(12,r.top-ph-6);
    popup.style.left=`${left}px`;
    popup.style.top=`${top}px`;
  }

  function open(id,anchor){
    const c=core(),req=c?.requirement?.(id),ed=editor();
    if(!req||!ed)return;
    close();styles();activeId=id;
    const p=periodFor(id)||{};
    const manual=ed.read?.(id);
    const base=basePeriodFor(id)||p;
    popup=document.createElement('div');
    popup.className='req-period-picker';
    popup.dataset.reqPeriodPicker=id;
    popup.innerHTML=`
      <div class="req-period-picker-title">Изменить период</div>
      <div class="req-period-picker-sub">${esc(req.text||'')}</div>
      <div class="req-period-picker-grid">
        <div class="req-period-picker-field"><label>Дата начала</label><input type="date" data-period-start value="${esc(dateOnly(p.startDate||base.startDate||''))}"></div>
        <div class="req-period-picker-field"><label>Дата окончания</label><input type="date" data-period-end value="${esc(dateOnly(p.endDate||base.endDate||''))}"></div>
      </div>
      <div class="req-period-picker-hint">Срок этапа: <b>${esc(fmt(base.startDate))} - ${esc(fmt(base.endDate))}</b></div>
      <div class="req-period-picker-error" data-period-error></div>
      <div class="req-period-picker-actions">
        <button type="button" class="btn" data-period-reset ${manual?'':'disabled'}>Вернуть срок этапа</button>
        <div class="req-period-picker-actions-right"><button type="button" class="btn" data-period-cancel>Отмена</button><button type="button" class="btn primary" data-period-save>Сохранить</button></div>
      </div>`;
    document.body.appendChild(popup);
    position(anchor);
    const start=popup.querySelector('[data-period-start]');
    setTimeout(()=>{try{start?.showPicker?.();}catch{}},50);
  }

  function error(msg){
    const el=popup?.querySelector('[data-period-error]');
    if(!el)return;
    el.textContent=msg;el.style.display='block';
  }

  function refresh(id,type){
    try{core()?.reconcile?.();}catch{}
    window.dispatchEvent(new CustomEvent('atom-core-data-changed',{detail:{type,id}}));
    close();
    setTimeout(()=>{window.ATOM_REQUIREMENTS_ENHANCED?.render?.();setTimeout(patch,0);},0);
  }

  function save(){
    if(!popup||!activeId)return;
    const start=popup.querySelector('[data-period-start]')?.value||'';
    const end=popup.querySelector('[data-period-end]')?.value||'';
    if(!start||!end)return error('Выберите дату начала и дату окончания.');
    if(end<start)return error('Дата окончания не может быть раньше даты начала.');
    editor()?.write?.(activeId,start,end);
    refresh(activeId,'requirement-period-override');
  }

  function reset(){
    if(!popup||!activeId)return;
    editor()?.clear?.(activeId,true);
    refresh(activeId,'requirement-period-reset');
  }

  function patch(){
    if(!location.hash.startsWith('#management/requirements'))return;
    styles();
    document.querySelectorAll('[data-req-enh-row]').forEach(row=>{
      const id=row.dataset.reqEnhRow;
      const cell=row.querySelector('.req-enh-period');
      if(!id||!cell)return;
      cell.dataset.periodClickable='1';
      cell.dataset.reqPeriodCell=id;
      cell.title='Нажмите, чтобы изменить период';
    });
  }

  document.addEventListener('click',e=>{
    if(popup&&e.target.closest?.('.req-period-picker')){
      if(e.target.closest('[data-period-save]')){e.preventDefault();save();}
      else if(e.target.closest('[data-period-reset]')){e.preventDefault();reset();}
      else if(e.target.closest('[data-period-cancel]')){e.preventDefault();close();}
      return;
    }
    const cell=e.target.closest?.('[data-req-period-cell]');
    if(cell&&location.hash.startsWith('#management/requirements')){
      e.preventDefault();e.stopPropagation();open(cell.dataset.reqPeriodCell,cell);return;
    }
    if(popup)close();
  },true);

  document.addEventListener('keydown',e=>{if(popup&&e.key==='Escape')close();});
  window.addEventListener('resize',close);
  window.addEventListener('scroll',()=>{if(popup)close();},true);

  let queued=false;
  new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;patch();});}).observe(document.body,{childList:true,subtree:true});
  ['hashchange','atom-core-ready','atom-core-data-changed','atom-view-rendered','atom-sync-update','atom-requirement-period-editor-ready'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(patch,0)));

  window.ATOM_REQUIREMENTS_PERIOD_CLICK_PICKER={version:VERSION,patch,open,close};
  styles();setTimeout(patch,100);setTimeout(patch,800);
})();