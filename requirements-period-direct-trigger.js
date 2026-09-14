(function(){
  const VERSION='1.1.0';
  let queued=false;

  function styles(){
    if(document.getElementById('requirements-period-direct-trigger-css'))return;
    const s=document.createElement('style');
    s.id='requirements-period-direct-trigger-css';
    s.textContent=`
      .req-period-inline,.req-period-row-edit{display:none!important}
      .req-enh-period{white-space:nowrap!important}
      .req-period-direct-action{display:inline-flex!important;align-items:center;justify-content:center;margin-top:7px;padding:5px 9px;border:1px solid #168f85;border-radius:7px;background:#fff;color:#0f756d;font:inherit;font-size:9px;font-weight:700;line-height:1.2;cursor:pointer;white-space:nowrap;visibility:visible!important;opacity:1!important}
      .req-period-direct-action:hover{background:#e8f9f6;border-color:#0f756d;color:#095d56}
      .req-period-direct-action:focus-visible{outline:2px solid rgba(53,216,199,.4);outline-offset:2px}
      .req-period-direct-action:before{content:'📅';margin-right:5px;font-size:10px}
    `;
    document.head.appendChild(s);
  }

  function openEditor(id){
    const ed=window.ATOM_REQUIREMENTS_PERIOD_EDITOR;
    if(!id||!ed?.open)return false;
    ed.open(id);
    return true;
  }

  function patchRow(row){
    const id=row?.dataset?.reqEnhRow;
    const cell=row?.querySelector?.('.req-enh-period');
    if(!id||!cell)return;

    let btn=cell.querySelector('.req-period-direct-action');
    if(!btn){
      const br=document.createElement('br');
      br.dataset.periodActionBreak='1';
      btn=document.createElement('button');
      btn.type='button';
      btn.className='req-period-direct-action';
      btn.textContent='Изменить период';
      cell.appendChild(br);
      cell.appendChild(btn);
    }
    btn.dataset.reqPeriodDirect=id;
    btn.dataset.reqPeriodEdit=id;
    btn.title='Изменить дату начала и дату окончания';
  }

  function patch(){
    if(!location.hash.startsWith('#management/requirements'))return;
    styles();
    document.querySelectorAll('[data-req-enh-row]').forEach(patchRow);
  }

  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('.req-period-direct-action');
    if(!btn)return;
    e.preventDefault();
    e.stopPropagation();
    openEditor(btn.dataset.reqPeriodDirect);
  },true);

  new MutationObserver(()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;patch();});
  }).observe(document.body,{childList:true,subtree:true});

  ['hashchange','atom-core-ready','atom-core-data-changed','atom-view-rendered','atom-sync-update','atom-requirement-period-editor-ready'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(patch,0)));

  window.ATOM_REQUIREMENTS_PERIOD_DIRECT_TRIGGER={version:VERSION,patch,open:openEditor};
  styles();
  setInterval(patch,1000);
  setTimeout(patch,100);
  setTimeout(patch,500);
})();