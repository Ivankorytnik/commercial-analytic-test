(function(){
  const VERSION='1.0.0';
  const PREFIX='atom-requirement-period-override-';
  const DAY=86400000;
  let installed=false;
  let base={};
  let modal=null;

  const core=()=>window.ATOM_CORE;
  const key=id=>`${PREFIX}${id}`;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const fmt=v=>{if(!v)return'Не задано';const p=String(v).split('-');return p.length===3?`${p[2]}.${p[1]}.${p[0]}`:String(v)};
  const today=()=>{const d=new Date();d.setHours(0,0,0,0);return d.getTime();};
  const toTs=v=>{const n=new Date(`${v}T00:00:00`).getTime();return Number.isFinite(n)?n:0;};

  function read(id){
    try{
      const v=JSON.parse(localStorage.getItem(key(id))||'null');
      return v&&v.startDate&&v.endDate?v:null;
    }catch{return null;}
  }

  function write(id,startDate,endDate){
    localStorage.setItem(key(id),JSON.stringify({startDate,endDate,updatedAt:new Date().toISOString()}));
  }

  function clear(id,clearLegacy=false){
    localStorage.removeItem(key(id));
    if(clearLegacy){
      const mk=`atom-core-requirement-meta-${id}`;
      try{
        const m=JSON.parse(localStorage.getItem(mk)||'null');
        if(m){delete m.customStartDate;delete m.customEndDate;localStorage.setItem(mk,JSON.stringify(m));}
      }catch{}
    }
  }

  function styles(){
    if(document.getElementById('requirements-period-editor-css'))return;
    const s=document.createElement('style');
    s.id='requirements-period-editor-css';
    s.textContent=`
      .req-period-edit{display:inline-flex;align-items:center;gap:4px;margin-top:5px;padding:4px 7px;border:1px solid #cbd9d9;border-radius:6px;background:#fff;color:#355253;font:inherit;font-size:9px;cursor:pointer}
      .req-period-edit:hover{background:#eef9f7;border-color:#7fded4;color:#0f6962}
      .req-period-edit.manual{background:#e7faf6;border-color:#92dfd6;color:#0f6962;font-weight:700}
      .req-period-overlay{position:fixed;inset:0;z-index:2147483200;background:rgba(24,42,43,.38);display:flex;align-items:center;justify-content:center;padding:18px}
      .req-period-dialog{width:min(520px,calc(100vw - 28px));background:#fff;border:1px solid #ccd9d9;border-radius:14px;box-shadow:0 22px 60px rgba(18,38,39,.28);padding:18px}
      .req-period-dialog h3{margin:0 0 5px;font-size:18px}.req-period-sub{font-size:10px;color:var(--muted);margin-bottom:14px;line-height:1.5}.req-period-base{background:#f4f8f8;border-radius:8px;padding:9px 10px;margin-bottom:12px;font-size:10px;color:#526768}
      .req-period-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}.req-period-field label{display:block;font-size:9px;color:var(--muted);margin-bottom:5px}.req-period-field input{width:100%;box-sizing:border-box;border:1px solid #c9d7d7;border-radius:7px;padding:9px;font:inherit;font-size:11px;background:#fff}
      .req-period-error{display:none;margin-top:8px;padding:7px 9px;border-radius:7px;background:#fff0ed;color:#a43a2f;font-size:10px}.req-period-actions{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-top:14px}.req-period-actions-right{display:flex;gap:7px}.req-period-dialog .btn{cursor:pointer}
      @media(max-width:560px){.req-period-fields{grid-template-columns:1fr}.req-period-actions{align-items:stretch}.req-period-actions-right{width:100%}.req-period-actions-right .btn{flex:1}}
    `;
    document.head.appendChild(s);
  }

  function requirement(reqOrId){
    const c=core();
    return typeof reqOrId==='string'?c?.requirement?.(reqOrId):reqOrId;
  }

  function effectivePeriod(reqOrId){
    const req=requirement(reqOrId);if(!req)return null;
    const p=base.periodForRequirement?base.periodForRequirement(req):null;
    const o=read(req.id);if(!o)return p;
    return {
      ...(p||{}),
      start:toTs(o.startDate),
      end:toTs(o.endDate),
      startDate:o.startDate,
      endDate:o.endDate,
      stageId:req.stageId,
      stageName:p?.stageName||core()?.stageName?.(req.stageId)||'',
      changed:true,
      customDates:true,
      periodOverride:true
    };
  }

  function isActive(req){return window.ATOM_TEAM_ACTIVITY?.isActive?window.ATOM_TEAM_ACTIVITY.isActive(req.team):true;}
  function isNotActual(id){return core()?.isRequirementNotActual?.(id)||localStorage.getItem(`atom-requirement-not-actual-${id}`)==='1';}

  function requirementOverdue(reqOrId){
    const req=requirement(reqOrId);if(!req||isNotActual(req.id)||!isActive(req))return false;
    const o=read(req.id);if(!o)return base.requirementOverdue?base.requirementOverdue(req):false;
    const state=core()?.getState?.(req.id);if(['answered','done'].includes(state?.statusId))return false;
    return toTs(o.endDate)<today();
  }

  function requirementProblem(reqOrId){
    const req=requirement(reqOrId);if(!req||isNotActual(req.id)||!isActive(req))return false;
    if(core()?.getState?.(req.id)?.statusId==='blocker')return true;
    if(read(req.id))return requirementOverdue(req);
    return base.requirementProblem?base.requirementProblem(req):false;
  }

  function syncOverrideBlockers(){
    const c=core();if(!c)return false;
    let rows=[];try{rows=JSON.parse(localStorage.getItem('atom-blockers')||'[]')||[];}catch{}
    let changed=false;
    const reqs=c.requirements?.()||[];
    reqs.forEach(req=>{
      if(!read(req.id))return;
      const autoKey=`CORE:RACI:${req.id}`;
      const existing=rows.find(x=>x.autoKey===autoKey);
      const problem=requirementProblem(req);
      const p=effectivePeriod(req);
      const st=c.getState?.(req.id)||{};
      const owner=c.personName?.(st.respondentId)||c.teamOwner?.(req.team)||'';
      if(problem&&!existing){
        rows.push({id:Date.now()+Math.floor(Math.random()*100000),autoKey,source:`RACI: ${req.team}`,description:`${req.text}. Плановый срок: ${p?.endDate||'не задан'}`,severity:'Высокая',owner,due:p?.endDate||'',status:'Открыт',comment:`Этап Ганта: ${p?.stageId||req.stageId}. ${p?.stageName||c.stageName?.(req.stageId)||''}`,createdAt:new Date().toISOString()});
        changed=true;
      }else if(problem&&existing){
        if(existing.due!==(p?.endDate||'')||existing.owner!==owner||!String(existing.description||'').includes(p?.endDate||'')){
          existing.due=p?.endDate||'';existing.owner=owner;existing.description=`${req.text}. Плановый срок: ${p?.endDate||'не задан'}`;changed=true;
        }
        if(['Решен','Закрыт'].includes(existing.status)){existing.status='Открыт';changed=true;}
      }else if(!problem&&existing&&!['Решен','Закрыт'].includes(existing.status)){
        existing.status='Решен';
        const note='Закрыт автоматически после корректировки периода требования.';
        if(!String(existing.comment||'').includes(note))existing.comment=(existing.comment?existing.comment+'\n':'')+note;
        changed=true;
      }
    });
    if(changed)localStorage.setItem('atom-blockers',JSON.stringify(rows));
    return changed;
  }

  function install(){
    const c=core();
    if(installed||!c||!window.ATOM_REQUIREMENTS_ENHANCED||typeof c.isRequirementNotActual!=='function')return false;
    base={
      periodForRequirement:c.periodForRequirement?.bind(c),
      requirementOverdue:c.requirementOverdue?.bind(c),
      requirementProblem:c.requirementProblem?.bind(c),
      reconcile:c.reconcile?.bind(c)
    };
    if(!base.periodForRequirement||!base.reconcile)return false;
    c.periodForRequirement=effectivePeriod;
    c.requirementOverdue=requirementOverdue;
    c.requirementProblem=requirementProblem;
    c.reconcile=function(){const a=base.reconcile?base.reconcile():false;const b=syncOverrideBlockers();return Boolean(a||b);};
    c.requirementPeriodOverride=read;
    installed=true;
    window.dispatchEvent(new CustomEvent('atom-requirement-period-editor-ready',{detail:{version:VERSION}}));
    setTimeout(()=>window.ATOM_REQUIREMENTS_ENHANCED?.render?.(),0);
    return true;
  }

  function decorate(){
    if(!location.hash.startsWith('#management/requirements'))return;
    document.querySelectorAll('[data-req-enh-row]').forEach(row=>{
      const id=row.dataset.reqEnhRow,cell=row.querySelector('.req-enh-period');if(!id||!cell||cell.querySelector('.req-period-edit'))return;
      const b=document.createElement('button');b.type='button';b.className=`req-period-edit${read(id)?' manual':''}`;b.dataset.reqPeriodEdit=id;b.textContent=read(id)?'Изменить период':'Корректировать';cell.appendChild(document.createElement('br'));cell.appendChild(b);
    });
  }

  function closeModal(){modal?.remove();modal=null;}

  function openModal(id){
    styles();
    const c=core(),req=c?.requirement?.(id);if(!req)return;
    closeModal();
    const current=c.periodForRequirement?.(req)||{};
    const baseP=base.periodForRequirement?base.periodForRequirement(req):null;
    const hasOverride=Boolean(read(id));
    modal=document.createElement('div');
    modal.className='req-period-overlay';
    modal.innerHTML=`<div class="req-period-dialog" role="dialog" aria-modal="true">
      <h3>Корректировка периода</h3>
      <div class="req-period-sub"><b>${esc(req.team||'')}</b><br>${esc(req.text||'')}</div>
      <div class="req-period-base">Срок по этапу / исходный срок: <b>${fmt(baseP?.startDate)} - ${fmt(baseP?.endDate)}</b><br>Этап: ${esc(req.stageId)}. ${esc(current?.stageName||c.stageName?.(req.stageId)||'')}</div>
      <div class="req-period-fields">
        <div class="req-period-field"><label>Дата начала</label><input type="date" data-req-period-start value="${esc(current?.startDate||baseP?.startDate||'')}"></div>
        <div class="req-period-field"><label>Дата окончания</label><input type="date" data-req-period-end value="${esc(current?.endDate||baseP?.endDate||'')}"></div>
      </div>
      <div class="req-period-error" data-req-period-error></div>
      <div class="req-period-actions">
        <button type="button" class="btn" data-req-period-reset ${hasOverride||req.custom?'':'disabled'}>Вернуть срок этапа</button>
        <div class="req-period-actions-right"><button type="button" class="btn" data-req-period-cancel>Отмена</button><button type="button" class="btn primary" data-req-period-save>Сохранить</button></div>
      </div>
    </div>`;
    modal.dataset.reqId=id;
    document.body.appendChild(modal);
  }

  function error(msg){const el=modal?.querySelector('[data-req-period-error]');if(!el)return;el.textContent=msg;el.style.display='block';}

  function rerender(id,type){
    const c=core();
    c?.reconcile?.();
    window.dispatchEvent(new CustomEvent('atom-core-data-changed',{detail:{type,id}}));
    closeModal();
    setTimeout(()=>{window.ATOM_REQUIREMENTS_ENHANCED?.render?.();setTimeout(decorate,0);},0);
  }

  document.addEventListener('click',e=>{
    const edit=e.target.closest?.('[data-req-period-edit]');
    if(edit){e.preventDefault();openModal(edit.dataset.reqPeriodEdit);return;}
    if(e.target.closest?.('[data-req-period-cancel]')){e.preventDefault();closeModal();return;}
    if(e.target===modal){closeModal();return;}
    if(e.target.closest?.('[data-req-period-save]')){
      e.preventDefault();const id=modal?.dataset.reqId;if(!id)return;
      const start=modal.querySelector('[data-req-period-start]')?.value||'';
      const end=modal.querySelector('[data-req-period-end]')?.value||'';
      if(!start||!end)return error('Укажите дату начала и дату окончания.');
      if(end<start)return error('Дата окончания не может быть раньше даты начала.');
      write(id,start,end);rerender(id,'requirement-period-override');return;
    }
    if(e.target.closest?.('[data-req-period-reset]')){
      e.preventDefault();const id=modal?.dataset.reqId;if(!id)return;
      clear(id,true);rerender(id,'requirement-period-reset');return;
    }
  });

  document.addEventListener('keydown',e=>{if(modal&&e.key==='Escape')closeModal();});

  let q=false;
  function patch(){
    if(q)return;q=true;requestAnimationFrame(()=>{q=false;install();styles();decorate();});
  }
  new MutationObserver(patch).observe(document.body,{childList:true,subtree:true});
  ['atom-core-ready','atom-core-data-changed','atom-sync-update','hashchange','atom-view-rendered'].forEach(ev=>window.addEventListener(ev,patch));
  window.ATOM_REQUIREMENTS_PERIOD_EDITOR={version:VERSION,read,write,clear,open:openModal,install};
  styles();
  const timer=setInterval(()=>{if(install()){clearInterval(timer);decorate();}},50);
  setTimeout(()=>clearInterval(timer),5000);
  setTimeout(patch,100);
})();
