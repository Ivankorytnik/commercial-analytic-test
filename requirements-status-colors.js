(function(){
  const VERSION='1.0.0';
  const STATUS_CLASSES=['req-status-not-requested','req-status-prepared','req-status-sent','req-status-in-progress','req-status-answered','req-status-clarify','req-status-blocker','req-status-done','req-status-not-actual'];
  const MAP={
    not_requested:'req-status-not-requested',
    prepared:'req-status-prepared',
    sent:'req-status-sent',
    in_progress:'req-status-in-progress',
    answered:'req-status-answered',
    clarify:'req-status-clarify',
    blocker:'req-status-blocker',
    done:'req-status-done',
    __not_actual__:'req-status-not-actual'
  };

  function styles(){
    if(document.getElementById('requirements-status-colors-css'))return;
    const s=document.createElement('style');
    s.id='requirements-status-colors-css';
    s.textContent=`
      .req-status-select{font-weight:700!important;transition:background-color .15s ease,border-color .15s ease,color .15s ease;}
      .req-status-not-requested{background:#f2f5f5!important;border-color:#cbd5d5!important;color:#657477!important;}
      .req-status-prepared{background:#edf4fb!important;border-color:#b8cde3!important;color:#365f86!important;}
      .req-status-sent{background:#e7f0ff!important;border-color:#9fbde8!important;color:#245c9e!important;}
      .req-status-in-progress{background:#e1f8f5!important;border-color:#8fd4cb!important;color:#0d6f67!important;}
      .req-status-answered{background:#eeeafd!important;border-color:#b8acef!important;color:#5b4aa4!important;}
      .req-status-clarify{background:#fff5dc!important;border-color:#e9c66f!important;color:#8a6414!important;}
      .req-status-blocker{background:#fde8e6!important;border-color:#e9a39b!important;color:#a53228!important;}
      .req-status-done{background:#e3f6ea!important;border-color:#91d1a8!important;color:#247044!important;}
      .req-status-not-actual{background:#ecefef!important;border-color:#b8c1c2!important;color:#626d6e!important;}
      tr.req-row-status-blocker td:first-child{box-shadow:inset 4px 0 0 #c74438;}
      tr.req-row-status-done td:first-child{box-shadow:inset 4px 0 0 #3d9b62;}
      tr.req-row-status-clarify td:first-child{box-shadow:inset 4px 0 0 #d7a62d;}
      tr.req-row-status-in-progress td:first-child{box-shadow:inset 4px 0 0 #18a596;}
      tr.req-row-status-not-actual td:first-child{box-shadow:inset 4px 0 0 #9ba7a8;}
      .req-status-legend{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:2px;font-size:9px;color:var(--muted);}
      .req-status-legend span{display:inline-flex;align-items:center;gap:5px;padding:3px 7px;border-radius:999px;border:1px solid transparent;font-weight:700;}
      .req-status-legend .req-status-not-requested,.req-status-legend .req-status-prepared,.req-status-legend .req-status-sent,.req-status-legend .req-status-in-progress,.req-status-legend .req-status-answered,.req-status-legend .req-status-clarify,.req-status-legend .req-status-blocker,.req-status-legend .req-status-done,.req-status-legend .req-status-not-actual{display:inline-flex;}
    `;
    document.head.appendChild(s);
  }

  function clean(el){
    STATUS_CLASSES.forEach(c=>el.classList.remove(c));
  }

  function applySelect(select){
    if(!select)return;
    clean(select);
    select.classList.add('req-status-select');
    const cls=MAP[select.value]||'req-status-not-requested';
    select.classList.add(cls);

    const row=select.closest('tr');
    if(row){
      [...row.classList].filter(c=>c.startsWith('req-row-status-')).forEach(c=>row.classList.remove(c));
      row.classList.add(`req-row-status-${select.value==='__not_actual__'?'not-actual':select.value.replaceAll('_','-')}`);
    }
  }

  function legend(){
    if(!location.hash.startsWith('#management/requirements'))return;
    const root=document.getElementById('req-enhanced-root');
    if(!root||root.querySelector('.req-status-legend'))return;
    const toolbar=root.querySelector('.req-enh-toolbar');
    if(!toolbar)return;
    const div=document.createElement('div');
    div.className='req-status-legend';
    div.innerHTML=`
      <span class="req-status-not-requested">Не запрошено</span>
      <span class="req-status-prepared">Запрос подготовлен</span>
      <span class="req-status-sent">Запрос отправлен</span>
      <span class="req-status-in-progress">В работе</span>
      <span class="req-status-answered">Ответ получен</span>
      <span class="req-status-clarify">Требует уточнения</span>
      <span class="req-status-blocker">Блокер</span>
      <span class="req-status-done">Готово</span>
      <span class="req-status-not-actual">Не актуально</span>`;
    toolbar.insertAdjacentElement('afterend',div);
  }

  function patch(){
    styles();
    document.querySelectorAll('[data-req-enh-status], .core-raci-table select[data-core-field="statusId"], select[data-pa-req-status]').forEach(applySelect);
    legend();
  }

  document.addEventListener('change',e=>{
    const select=e.target.closest('[data-req-enh-status], .core-raci-table select[data-core-field="statusId"], select[data-pa-req-status]');
    if(select)setTimeout(()=>applySelect(select),0);
  },true);

  let queued=false;
  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;patch();});}
  new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});
  ['hashchange','atom-core-ready','atom-sync-update','atom-view-rendered','atom-core-data-changed'].forEach(ev=>window.addEventListener(ev,queue));
  window.ATOM_REQUIREMENTS_STATUS_COLORS={version:VERSION,patch};
  setTimeout(queue,300);setTimeout(queue,1000);setTimeout(queue,1800);
})();