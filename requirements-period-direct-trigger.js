(function(){
  const VERSION='1.0.0';
  let queued=false;

  function styles(){
    if(document.getElementById('requirements-period-direct-trigger-css'))return;
    const s=document.createElement('style');
    s.id='requirements-period-direct-trigger-css';
    s.textContent=`
      .req-period-row-edit,.req-period-inline{display:none!important}
      .req-enh-period{padding:0!important;white-space:normal!important}
      .req-period-direct-trigger{display:flex;width:100%;min-height:66px;box-sizing:border-box;border:0;background:transparent;padding:12px 14px;align-items:flex-start;justify-content:center;flex-direction:column;text-align:left;color:inherit;font:inherit;cursor:pointer;border-radius:0}
      .req-period-direct-trigger:hover{background:#eaf9f7;color:#123f3b}
      .req-period-direct-trigger:focus-visible{outline:2px solid #35d8c7;outline-offset:-2px}
      .req-period-direct-main{font-weight:700;white-space:nowrap}
      .req-period-direct-note{display:block;margin-top:3px;font-size:9px;color:#637879;font-weight:400}
      .req-period-direct-trigger:after{content:'  📅';font-size:11px;margin-left:4px}
    `;
    document.head.appendChild(s);
  }

  function periodHtml(cell){
    const clone=cell.cloneNode(true);
    clone.querySelectorAll('.req-period-row-edit,.req-period-edit,.req-period-inline,br:has(+ .req-period-row-edit)').forEach(x=>x.remove());
    const note=clone.querySelector('.pa-note');
    const noteText=note?.textContent?.trim()||'';
    if(note)note.remove();
    const main=clone.textContent.replace(/\s+/g,' ').trim();
    return {main,note:noteText};
  }

  function patchRow(row){
    const id=row?.dataset?.reqEnhRow;
    const cell=row?.querySelector?.('.req-enh-period');
    if(!id||!cell)return;
    let trigger=cell.querySelector('.req-period-direct-trigger');
    if(trigger){
      trigger.dataset.reqPeriodDirect=id;
      trigger.dataset.reqPeriodEdit=id;
      return;
    }
    const p=periodHtml(cell);
    cell.innerHTML='';
    trigger=document.createElement('button');
    trigger.type='button';
    trigger.className='req-period-direct-trigger';
    trigger.dataset.reqPeriodDirect=id;
    trigger.dataset.reqPeriodEdit=id;
    trigger.title='Нажмите, чтобы выбрать новый период';
    trigger.innerHTML=`<span class="req-period-direct-main"></span>${p.note?'<span class="req-period-direct-note"></span>':''}`;
    trigger.querySelector('.req-period-direct-main').textContent=p.main||'Период не задан';
    const note=trigger.querySelector('.req-period-direct-note');
    if(note)note.textContent=p.note;
    cell.appendChild(trigger);
  }

  function patch(){
    if(!location.hash.startsWith('#management/requirements'))return;
    styles();
    document.querySelectorAll('[data-req-enh-row]').forEach(patchRow);
  }

  function openEditor(id){
    const ed=window.ATOM_REQUIREMENTS_PERIOD_EDITOR;
    if(!ed?.open)return false;
    ed.open(id);
    const start=document.querySelector('.req-period-overlay [data-req-period-start]');
    try{start?.showPicker?.();}catch{}
    return true;
  }

  document.addEventListener('pointerdown',e=>{
    const trigger=e.target.closest?.('.req-period-direct-trigger');
    if(!trigger)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openEditor(trigger.dataset.reqPeriodDirect);
  },true);

  document.addEventListener('click',e=>{
    const trigger=e.target.closest?.('.req-period-direct-trigger');
    if(!trigger)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if(!document.querySelector('.req-period-overlay'))openEditor(trigger.dataset.reqPeriodDirect);
  },true);

  new MutationObserver(()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;patch();});
  }).observe(document.body,{childList:true,subtree:true});

  ['hashchange','atom-core-ready','atom-core-data-changed','atom-view-rendered','atom-sync-update','atom-requirement-period-editor-ready'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(patch,0)));

  window.ATOM_REQUIREMENTS_PERIOD_DIRECT_TRIGGER={version:VERSION,patch,open:openEditor};
  styles();
  setTimeout(patch,100);
  setTimeout(patch,700);
})();