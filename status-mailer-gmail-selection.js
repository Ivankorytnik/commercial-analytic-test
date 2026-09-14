(function(){
  const VERSION='1.0.0';
  const HASH='#status-mailer';
  const STORAGE_KEY='atom-status-mailer-selected-v1';
  let queued=false;

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const data=()=>window.ATOM_STATUS_MAILER_DATA||[];

  function rowKey(row,index){
    return String(row?.person?.id||row?.person?.email||row?.person?.name||index);
  }
  function readSelected(){
    try{return new Set(JSON.parse(sessionStorage.getItem(STORAGE_KEY)||'[]'))}catch{return new Set()}
  }
  function saveSelected(set){sessionStorage.setItem(STORAGE_KEY,JSON.stringify([...set]));}
  function hasEmail(row){return Boolean(String(row?.person?.email||'').trim());}

  function styles(){
    if(document.getElementById('status-mailer-gmail-selection-css'))return;
    const s=document.createElement('style');
    s.id='status-mailer-gmail-selection-css';
    s.textContent=`
      .status-mailer-bulk{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:10px 12px;background:#fff;border:1px solid var(--line);border-radius:10px}
      .status-mailer-bulk-left,.status-mailer-bulk-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.status-mailer-selected-count{font-size:11px;font-weight:700}.status-mailer-gmail-note{font-size:9px;color:var(--muted)}
      .status-mailer-card-head.gmail-select-enabled{grid-template-columns:34px minmax(180px,1fr) minmax(200px,1fr) auto!important}
      .status-mailer-pick{display:flex;align-items:center;justify-content:center}.status-mailer-pick input{width:18px;height:18px;cursor:pointer;accent-color:#11a99a}.status-mailer-card.mail-selected{border-color:#71d8cf;box-shadow:0 0 0 1px #c8f0ec inset}.status-mailer-card.mail-no-email{opacity:.76}.status-mailer-gmail-main{font-weight:700}.status-mailer-gmail-main:disabled{opacity:.5;cursor:not-allowed}
      @media(max-width:900px){.status-mailer-card-head.gmail-select-enabled{grid-template-columns:34px 1fr!important}.status-mailer-pick{grid-row:1 / span 3}.status-mailer-bulk{align-items:flex-start}}
    `;
    document.head.appendChild(s);
  }

  function gmailUrl(row){
    const email=String(row?.person?.email||'').trim();
    const subject=row?.mail?.subject||'';
    const body=row?.mail?.body||'';
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function updateUi(){
    const rows=data();
    const selected=readSelected();
    let count=0;
    document.querySelectorAll('.status-mailer-card[data-mail-index]').forEach(card=>{
      const index=Number(card.dataset.mailIndex),row=rows[index],key=rowKey(row,index),email=hasEmail(row);
      const box=card.querySelector('[data-mail-select]');
      const checked=email&&selected.has(key);
      if(box){box.checked=checked;box.disabled=!email;box.title=email?'Выбрать получателя':'E-mail не указан';}
      card.classList.toggle('mail-selected',checked);
      card.classList.toggle('mail-no-email',!email);
      if(checked)count++;
    });
    const countEl=document.getElementById('status-mailer-selected-count');
    if(countEl)countEl.textContent=`Выбрано: ${count}`;
    const bulk=document.getElementById('status-mailer-open-gmail-selected');
    if(bulk)bulk.disabled=count===0;
  }

  function ensureToolbar(){
    if(location.hash!==HASH)return;
    const page=document.querySelector('.status-mailer-page');
    const list=page?.querySelector('.status-mailer-list');
    if(!page||!list)return;
    let bar=document.getElementById('status-mailer-bulk');
    if(!bar){
      bar=document.createElement('div');
      bar.id='status-mailer-bulk';
      bar.className='status-mailer-bulk';
      bar.innerHTML=`<div class="status-mailer-bulk-left"><b class="status-mailer-selected-count" id="status-mailer-selected-count">Выбрано: 0</b><button type="button" class="btn" id="status-mailer-select-all">Выбрать все</button><button type="button" class="btn" id="status-mailer-clear-all">Снять все</button></div><div class="status-mailer-bulk-actions"><span class="status-mailer-gmail-note">Письма откроются в Gmail из аккаунта Google, в который вы вошли в браузере.</span><button type="button" class="btn primary status-mailer-gmail-main" id="status-mailer-open-gmail-selected" disabled>Открыть выбранные в Gmail</button></div>`;
      list.insertAdjacentElement('beforebegin',bar);
    }
  }

  function ensureCheckboxes(){
    if(location.hash!==HASH)return;
    const rows=data(),selected=readSelected();
    document.querySelectorAll('.status-mailer-card[data-mail-index]').forEach(card=>{
      const head=card.querySelector('.status-mailer-card-head');if(!head)return;
      head.classList.add('gmail-select-enabled');
      const index=Number(card.dataset.mailIndex),row=rows[index],key=rowKey(row,index),email=hasEmail(row);
      let pick=head.querySelector('.status-mailer-pick');
      if(!pick){
        pick=document.createElement('label');pick.className='status-mailer-pick';
        pick.innerHTML=`<input type="checkbox" data-mail-select="${index}" aria-label="Выбрать ${esc(row?.person?.name||'получателя')}">`;
        head.insertAdjacentElement('afterbegin',pick);
      }
      const box=pick.querySelector('[data-mail-select]');
      if(box){box.dataset.mailKey=key;box.disabled=!email;box.checked=email&&selected.has(key);}
      const open=head.querySelector('[data-mail-open]');
      if(open){open.textContent='Открыть в Gmail';open.title=email?'Открыть готовое письмо в Gmail':'E-mail не указан';}
    });
  }

  function selectAll(){
    const rows=data(),set=new Set();
    rows.forEach((row,index)=>{if(hasEmail(row))set.add(rowKey(row,index));});
    saveSelected(set);updateUi();
  }
  function clearAll(){saveSelected(new Set());updateUi();}

  function openSelectedInGmail(){
    const rows=data(),selected=readSelected();
    const chosen=rows.map((row,index)=>({row,index,key:rowKey(row,index)})).filter(x=>hasEmail(x.row)&&selected.has(x.key));
    if(!chosen.length)return alert('Выберите хотя бы одного получателя с указанным e-mail.');
    let opened=0;
    chosen.forEach(({row})=>{
      const w=window.open(gmailUrl(row),'_blank','noopener');
      if(w)opened++;
    });
    if(opened<chosen.length){
      alert(`Открыто писем: ${opened} из ${chosen.length}. Разрешите всплывающие окна для этого сайта и нажмите кнопку еще раз.`);
    }
  }

  function openOne(index){
    const row=data()[Number(index)];if(!row||!hasEmail(row))return;
    window.open(gmailUrl(row),'_blank','noopener');
  }

  document.addEventListener('change',e=>{
    const box=e.target.closest('[data-mail-select]');if(!box)return;
    const rows=data(),index=Number(box.dataset.mailSelect),row=rows[index];if(!row)return;
    const key=rowKey(row,index),set=readSelected();
    if(box.checked&&hasEmail(row))set.add(key);else set.delete(key);
    saveSelected(set);updateUi();
  });

  document.addEventListener('click',e=>{
    if(e.target.closest('#status-mailer-select-all')){e.preventDefault();selectAll();return;}
    if(e.target.closest('#status-mailer-clear-all')){e.preventDefault();clearAll();return;}
    if(e.target.closest('#status-mailer-open-gmail-selected')){e.preventDefault();openSelectedInGmail();return;}
  });

  // Capture the old individual "open mail" action and route it to Gmail instead of mailto/default client.
  document.addEventListener('click',e=>{
    const open=e.target.closest('[data-mail-open]');
    if(!open||location.hash!==HASH||open.disabled)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    openOne(open.dataset.mailOpen);
  },true);

  function patch(){
    if(location.hash!==HASH)return;
    styles();ensureToolbar();ensureCheckboxes();updateUi();
  }
  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;patch();});}
  new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});
  ['hashchange','atom-sync-update','atom-core-data-changed','atom-project-reconciled','atom-view-rendered'].forEach(ev=>window.addEventListener(ev,queue));
  window.ATOM_STATUS_MAILER_GMAIL_SELECTION={version:VERSION,patch,selectAll,clearAll,openSelectedInGmail};
  setTimeout(queue,400);setTimeout(queue,1100);
})();