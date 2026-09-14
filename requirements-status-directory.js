(function(){
  const VERSION='1.0.0';
  const REF_KEY='atom-reference-data-v1';
  const NOT_ACTUAL='__not_actual__';
  const INACTIVE='__inactive__';
  const REL_PREFIX='atom-requirement-not-actual-';
  const EXCLUDED_LABEL_PREFIX='atom-requirement-excluded-label-';
  const CUSTOM_STATUS_PREFIX='atom-requirement-custom-status-';
  const DEFAULTS=['Не запрошено','Запрос подготовлен','Запрос отправлен','В работе','Ответ получен','Требует уточнения','Блокер','Готово','Не актуально'];
  let queued=false;

  const core=()=>window.ATOM_CORE;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const norm=s=>String(s||'').trim().toLowerCase();
  const readRefs=()=>{try{return JSON.parse(localStorage.getItem(REF_KEY)||'{}')||{}}catch{return{}}};
  const writeRefs=refs=>{
    localStorage.setItem(REF_KEY,JSON.stringify(refs));
    window.dispatchEvent(new CustomEvent('atom-reference-data-changed'));
    window.dispatchEvent(new CustomEvent('atom-core-data-changed',{detail:{type:'requirement-status-directory'}}));
  };

  function ensureRefs(){
    const refs=readRefs();
    let changed=false;
    if(!Array.isArray(refs.requirement)||!refs.requirement.length){refs.requirement=DEFAULTS.slice();changed=true;}
    DEFAULTS.forEach(v=>{if(!refs.requirement.some(x=>norm(x)===norm(v))){refs.requirement.push(v);changed=true;}});
    // Compatibility: user previously added “Не активно” to stage statuses because a dedicated
    // requirements status directory did not exist.
    if(Array.isArray(refs.stage)&&refs.stage.some(x=>norm(x)==='не активно')&&!refs.requirement.some(x=>norm(x)==='не активно')){
      refs.requirement.push('Не активно');changed=true;
    }
    if(changed)writeRefs(refs);
    return refs;
  }

  function knownByLabel(){
    const c=core();
    const map=new Map();
    (c?.STATUS||[]).forEach(x=>map.set(norm(x.label),x.id));
    return map;
  }
  function valueForLabel(label){
    const n=norm(label);
    if(n==='не актуально')return NOT_ACTUAL;
    if(n==='не активно')return INACTIVE;
    const known=knownByLabel().get(n);
    return known||`custom:${encodeURIComponent(String(label))}`;
  }
  function labelForCustomValue(value){
    if(!String(value).startsWith('custom:'))return'';
    try{return decodeURIComponent(String(value).slice(7));}catch{return String(value).slice(7);}
  }

  function requirementId(select){
    const row=select.closest('[data-req-enh-row],[data-pa-req],[data-core-id]');
    return row?.dataset.reqEnhRow||row?.dataset.paReq||row?.dataset.coreId||'';
  }
  function currentValue(id){
    if(localStorage.getItem(`${REL_PREFIX}${id}`)==='1'){
      return norm(localStorage.getItem(`${EXCLUDED_LABEL_PREFIX}${id}`))==='не активно'?INACTIVE:NOT_ACTUAL;
    }
    const custom=localStorage.getItem(`${CUSTOM_STATUS_PREFIX}${id}`);
    if(custom)return valueForLabel(custom);
    return core()?.getState?.(id)?.statusId||'not_requested';
  }

  function requirementOptions(id){
    const refs=ensureRefs();
    const values=[];
    const seen=new Set();
    (refs.requirement||[]).forEach(label=>{
      const value=valueForLabel(label);
      const key=`${value}::${norm(label)}`;
      if(seen.has(key))return;
      seen.add(key);
      values.push({value,label:String(label)});
    });
    const selected=currentValue(id);
    if(String(selected).startsWith('custom:')&&!values.some(x=>x.value===selected)){
      values.push({value:selected,label:labelForCustomValue(selected)});
    }
    return values.map(x=>`<option value="${esc(x.value)}" ${x.value===selected?'selected':''}>${esc(x.label)}</option>`).join('');
  }

  function patchSelect(select){
    const id=requirementId(select);if(!id)return;
    const html=requirementOptions(id);
    const sig=html;
    if(select.dataset.requirementRefSig===sig)return;
    select.dataset.requirementRefSig=sig;
    select.innerHTML=html;
    select.value=currentValue(id);
  }
  function patchSelects(){
    if(!location.hash.startsWith('#management/requirements')&&!location.hash.startsWith('#teams/'))return;
    document.querySelectorAll('[data-req-enh-status],select[data-pa-req-status],.core-raci-table select[data-core-field="statusId"]').forEach(patchSelect);
  }

  function applyStatus(select){
    const c=core(),id=requirementId(select);if(!c||!id)return;
    const value=select.value;
    const label=select.options[select.selectedIndex]?.textContent?.trim()||'';
    if(value===NOT_ACTUAL||value===INACTIVE){
      localStorage.setItem(`${REL_PREFIX}${id}`,'1');
      localStorage.setItem(`${EXCLUDED_LABEL_PREFIX}${id}`,label|| (value===INACTIVE?'Не активно':'Не актуально'));
      localStorage.removeItem(`${CUSTOM_STATUS_PREFIX}${id}`);
    }else if(String(value).startsWith('custom:')){
      localStorage.removeItem(`${REL_PREFIX}${id}`);
      localStorage.removeItem(`${EXCLUDED_LABEL_PREFIX}${id}`);
      localStorage.setItem(`${CUSTOM_STATUS_PREFIX}${id}`,label||labelForCustomValue(value));
      c.setState?.(id,{statusId:'not_requested'});
    }else{
      localStorage.removeItem(`${REL_PREFIX}${id}`);
      localStorage.removeItem(`${EXCLUDED_LABEL_PREFIX}${id}`);
      localStorage.removeItem(`${CUSTOM_STATUS_PREFIX}${id}`);
      c.setState?.(id,{statusId:value});
    }
    c.reconcile?.();
    window.dispatchEvent(new CustomEvent('atom-core-data-changed',{detail:{type:'requirement-status',id,status:value,label}}));
    setTimeout(()=>{patchSelects();window.ATOM_LOGIC_CLEANUP?.patch?.();},0);
  }

  function renderDirectoryGroup(){
    if(!location.hash.startsWith('#management/directories'))return;
    const editor=document.getElementById('reference-directory-editor');if(!editor)return;
    let block=document.getElementById('requirement-status-directory');
    const refs=ensureRefs(),items=refs.requirement||[];
    if(!block){
      block=document.createElement('details');
      block.id='requirement-status-directory';
      block.className='ref-accordion';
      block.dataset.refGroup='requirement';
      const first=editor.querySelector('details.ref-accordion');
      if(first)first.insertAdjacentElement('afterend',block);else editor.appendChild(block);
    }
    const wasOpen=block.open||sessionStorage.getItem('ref-directory-open-requirement')==='1';
    block.open=wasOpen;
    block.innerHTML=`<summary class="ref-accordion-head"><span class="ref-accordion-name">Статусы требований</span><span class="ref-accordion-meta"><span>${items.length} знач.</span><span class="ref-accordion-arrow">⌄</span></span></summary><div class="ref-accordion-body"><div class="ref-directory-controls"><div class="ref-field"><label>Текущие значения</label><select id="requirement-ref-select">${items.map(x=>`<option>${esc(x)}</option>`).join('')}</select></div><div class="ref-field"><label>Добавить новое значение</label><input id="requirement-ref-input" placeholder="Введите новый статус требования"></div><button type="button" class="btn primary" id="requirement-ref-add">Добавить</button></div><div class="ref-directory-hint">Эти значения используются в выпадающем списке «Статус» раздела «Требования». «Не актуально» и «Не активно» исключают требование из расчетной логики.</div></div>`;
  }

  function addDirectoryValue(){
    const input=document.getElementById('requirement-ref-input');
    const value=input?.value.trim();if(!value)return alert('Введите новый статус требования');
    const refs=ensureRefs();
    if(refs.requirement.some(x=>norm(x)===norm(value)))return alert('Такой статус уже есть');
    refs.requirement.push(value);writeRefs(refs);
    sessionStorage.setItem('ref-directory-open-requirement','1');
    renderDirectoryGroup();patchSelects();
  }

  document.addEventListener('toggle',e=>{
    if(e.target?.id==='requirement-status-directory')sessionStorage.setItem('ref-directory-open-requirement',e.target.open?'1':'0');
  },true);
  document.addEventListener('click',e=>{
    if(e.target.closest('#requirement-ref-add')){e.preventDefault();addDirectoryValue();}
  });
  document.addEventListener('keydown',e=>{
    if(e.target.closest('#requirement-ref-input')&&e.key==='Enter'){e.preventDefault();addDirectoryValue();}
  });
  document.addEventListener('change',e=>{
    const select=e.target.closest('[data-req-enh-status],select[data-pa-req-status],.core-raci-table select[data-core-field="statusId"]');
    if(!select)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    applyStatus(select);
  },true);

  function patch(){ensureRefs();renderDirectoryGroup();patchSelects();}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;patch();});}
  new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});
  ['hashchange','atom-sync-update','atom-view-rendered','atom-core-data-changed','atom-reference-data-changed'].forEach(ev=>window.addEventListener(ev,queue));
  window.ATOM_REQUIREMENTS_STATUS_DIRECTORY={version:VERSION,patch};
  setTimeout(queue,300);setTimeout(queue,900);setTimeout(queue,1600);
})();