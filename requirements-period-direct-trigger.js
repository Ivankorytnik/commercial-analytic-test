(function(){
  const VERSION='2.1.0';
  let modal=null;
  let activeId='';

  const core=()=>window.ATOM_CORE;
  const time=()=>window.ATOM_REQUIREMENTS_TIME;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  function styles(){
    if(document.getElementById('req-period-modal-css'))return;
    const s=document.createElement('style');
    s.id='req-period-modal-css';
    s.textContent=`
      .req-period-modal-overlay{position:fixed;inset:0;z-index:2147483600;background:rgba(22,38,39,.42);display:flex;align-items:center;justify-content:center;padding:20px}
      .req-period-modal{width:min(460px,calc(100vw - 28px));background:#fff;border:1px solid #cbd8d8;border-radius:14px;box-shadow:0 24px 70px rgba(18,38,39,.30);padding:18px}
      .req-period-modal h3{margin:0 0 5px;font-size:18px;color:#183536}.req-period-modal-sub{font-size:10px;color:#66797a;line-height:1.45;margin-bottom:14px}
      .req-period-modal-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.req-period-modal-field label{display:block;font-size:9px;color:#647778;margin-bottom:5px}.req-period-modal-field input{width:100%;box-sizing:border-box;border:1px solid #c6d5d5;border-radius:8px;padding:10px;font:inherit;font-size:12px;background:#fff;color:#183536}
      .req-period-modal-info{margin-top:10px;padding:8px 10px;border-radius:8px;background:#f2f7f7;color:#526768;font-size:9px;line-height:1.45}.req-period-modal-error{display:none;margin-top:8px;padding:8px 10px;border-radius:8px;background:#fff0ed;color:#a33b30;font-size:10px}
      .req-period-modal-actions{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:14px;flex-wrap:wrap}.req-period-modal-right{display:flex;gap:7px}.req-period-modal .btn{cursor:pointer}.req-period-modal .btn.primary{background:#0f756d;color:#fff;border-color:#0f756d}
      @media(max-width:560px){.req-period-modal-grid{grid-template-columns:1fr}.req-period-modal-actions{align-items:stretch}.req-period-modal-right{width:100%}.req-period-modal-right .btn{flex:1}}
    `;
    document.head.appendChild(s);
  }

  function close(){modal?.remove();modal=null;activeId='';}
  function dateOnly(v){return String(v||'').slice(0,10);}

  function open(id){
    const c=core(),req=c?.requirement?.(id);if(!req)return false;
    styles();close();activeId=id;
    const p=c.periodForRequirement?.(req)||{};
    modal=document.createElement('div');
    modal.className='req-period-modal-overlay';
    modal.innerHTML=`<div class="req-period-modal" role="dialog" aria-modal="true">
      <h3>Изменить период</h3>
      <div class="req-period-modal-sub"><b>${esc(req.team||'')}</b><br>${esc(req.text||'')}</div>
      <div class="req-period-modal-grid">
        <div class="req-period-modal-field"><label>Дата начала</label><input type="date" data-rpm-start value="${esc(dateOnly(p.startDate||p.startAt))}"></div>
        <div class="req-period-modal-field"><label>Дата окончания</label><input type="date" data-rpm-end value="${esc(dateOnly(p.endDate||p.endAt))}"></div>
      </div>
      <div class="req-period-modal-info">После сохранения начало устанавливается на 00:00, окончание на 23:59. Индивидуальный период используется для срока требования, просрочки и связанных блокеров.</div>
      <div class="req-period-modal-error" data-rpm-error></div>
      <div class="req-period-modal-actions">
        <button type="button" class="btn" data-rpm-reset ${p.customTimes?'':'disabled'}>По Ганту</button>
        <div class="req-period-modal-right"><button type="button" class="btn" data-rpm-cancel>Отмена</button><button type="button" class="btn primary" data-rpm-save>Сохранить</button></div>
      </div>
    </div>`;
    document.body.appendChild(modal);
    try{modal.querySelector('[data-rpm-start]')?.showPicker?.();}catch{}
    return true;
  }

  function showError(text){const el=modal?.querySelector('[data-rpm-error]');if(!el)return;el.textContent=text;el.style.display='block';}

  function refresh(){
    try{core()?.reconcile?.();}catch{}
    try{window.ATOM_REQUIREMENTS_ENHANCED?.render?.();}catch{}
    setTimeout(()=>{try{time()?.patch?.();}catch{}},0);
  }

  function save(){
    if(!modal||!activeId)return;
    const start=modal.querySelector('[data-rpm-start]')?.value||'';
    const end=modal.querySelector('[data-rpm-end]')?.value||'';
    if(!start||!end)return showError('Выберите дату начала и дату окончания.');
    if(end<start)return showError('Дата окончания не может быть раньше даты начала.');
    const ok=time()?.saveTimes?.(activeId,`${start}T00:00`,`${end}T23:59`);
    if(ok===false)return showError('Не удалось сохранить период.');
    close();refresh();
  }

  function reset(){
    if(!activeId)return;
    time()?.resetTimes?.(activeId);
    close();refresh();
  }

  // Window capture runs before document capture. This prevents requirements-time.js
  // from replacing the table cell inline and avoids MutationObserver redraw conflicts.
  window.addEventListener('click',e=>{
    const edit=e.target?.closest?.('.req-period-edit');
    if(edit){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      open(edit.dataset.id);
      return;
    }
    if(!modal)return;
    if(e.target.closest?.('[data-rpm-save]')){e.preventDefault();e.stopImmediatePropagation();save();return;}
    if(e.target.closest?.('[data-rpm-reset]')){e.preventDefault();e.stopImmediatePropagation();reset();return;}
    if(e.target.closest?.('[data-rpm-cancel]')){e.preventDefault();e.stopImmediatePropagation();close();return;}
    if(e.target===modal){e.preventDefault();e.stopImmediatePropagation();close();}
  },true);

  window.addEventListener('keydown',e=>{if(modal&&e.key==='Escape'){e.preventDefault();close();}},true);

  window.ATOM_REQUIREMENTS_PERIOD_DIRECT_TRIGGER={version:VERSION,modal:true,open,close};
  styles();
})();