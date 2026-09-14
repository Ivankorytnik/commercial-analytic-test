(function(){
  const VERSION='1.0.0';

  function styles(){
    if(document.getElementById('requirements-period-row-buttons-css'))return;
    const s=document.createElement('style');
    s.id='requirements-period-row-buttons-css';
    s.textContent=`
      .req-period-inline .req-period-edit{display:none!important}
      .req-period-row-edit{display:inline-flex;align-items:center;justify-content:center;margin-top:7px;padding:5px 8px;border:1px solid #bfcfcf;border-radius:6px;background:#fff;color:#294748;font:inherit;font-size:9px;font-weight:700;cursor:pointer;white-space:nowrap}
      .req-period-row-edit:hover{background:#eaf9f7;border-color:#6fd7cc;color:#0f6962}
      .req-period-row-edit.manual{background:#e7faf6;border-color:#92dfd6;color:#0f6962}
      .req-period-row-edit:focus{outline:2px solid rgba(53,216,199,.32);outline-offset:1px}
    `;
    document.head.appendChild(s);
  }

  function isManual(id){
    try{return Boolean(window.ATOM_REQUIREMENTS_PERIOD_EDITOR?.read?.(id));}catch{return false;}
  }

  function patchRow(row){
    const id=row?.dataset?.reqEnhRow;
    if(!id)return;
    const cell=row.querySelector('.req-enh-period');
    if(!cell)return;
    let btn=cell.querySelector('.req-period-row-edit');
    const manual=isManual(id);
    if(!btn){
      cell.appendChild(document.createElement('br'));
      btn=document.createElement('button');
      btn.type='button';
      btn.className='req-period-row-edit';
      btn.dataset.reqPeriodEdit=id;
      btn.textContent='Изменить период';
      cell.appendChild(btn);
    }
    btn.dataset.reqPeriodEdit=id;
    btn.classList.toggle('manual',manual);
    btn.title=manual?'Изменить индивидуальный период':'Задать индивидуальный период';
  }

  function patch(){
    if(!location.hash.startsWith('#management/requirements'))return;
    styles();
    document.querySelectorAll('[data-req-enh-row]').forEach(patchRow);
  }

  let queued=false;
  new MutationObserver(()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;patch();});
  }).observe(document.body,{childList:true,subtree:true});

  ['hashchange','atom-core-ready','atom-core-data-changed','atom-view-rendered','atom-sync-update','atom-requirement-period-editor-ready'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(patch,0)));

  window.ATOM_REQUIREMENTS_PERIOD_ROW_BUTTONS={version:VERSION,patch};
  styles();
  setTimeout(patch,100);
  setTimeout(patch,800);
})();