(function(){
  const VERSION='1.2.0';
  const REF_KEY='atom-reference-data-v1';
  const NOT_ACTUAL='__not_actual__';
  const INACTIVE='__inactive__';
  const REL_PREFIX='atom-requirement-not-actual-';
  const EXCLUDED_LABEL_PREFIX='atom-requirement-excluded-label-';
  const CUSTOM_STATUS_PREFIX='atom-requirement-custom-status-';
  const MANUAL_PREFIX='atom-requirement-status-manual-';
  const DEFAULTS=['Не запрошено','Запрос подготовлен','Запрос отправлен','В работе','Ответ получен','Требует уточнения','Блокер','Готово','Не актуально'];
  let queued=false;
  let corePatched=false;
  let originalGetState=null;

  const core=()=>window.ATOM_CORE;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const norm=s=>String(s||'').trim().toLowerCase();
  const readJson=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||'');return v??f}catch{return f}};
  const readRefs=()=>readJson(REF_KEY,{});
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
  function knownIds(){return new Set((core()?.STATUS||[]).map(x=>x.id));}
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
  function manualFor(id){return readJson(`${MANUAL_PREFIX}${id}`,null);}
  function saveManual(id,value,label){
    localStorage.setItem(`${MANUAL_PREFIX}${id}`,JSON.stringify({value,label:label||'',updatedAt:new Date().toISOString()}));
  }

  function patchCore(){
    const c=core();if(corePatched||!c?.getState)return Boolean(corePatched);
    originalGetState=c.getState.bind(c);
    c.getState=function(id){
      const base=originalGetState(id);
      const manual=manualFor(id);
      if(!manual?.value)return base;
      if(knownIds().has(manual.value))return {...base,statusId:manual.value};
      return base;
    };
    corePatched=true;
    return true;
  }

  function requirementId(select){
    const row=select.closest('[data-req-enh-row],[data-pa-req],[data-core-id]');
    return row?.dataset.reqEnhRow||row?.dataset.paReq||row?.dataset.coreId||'';
  }
  function currentValue(id){
    const manual=manualFor(id);
    if(manual?.value)return manual.value;
    if(localStorage.getItem(`${REL_PREFIX}${id}`)==='1'){
      return norm(localStorage.getItem(`${EXCLUDED_LABEL_PREFIX}${id}`))==='не активно'?INACTIVE:NOT_ACTUAL;
    }
    const custom=localStorage.getItem(`${CUSTOM_STATUS_PREFIX}${id}`);
    if(custom)return valueForLabel(custom);
    return originalGetState?originalGetState(id)?.statusId:(core()?.getState?.(id)?.statusId||'not_requested');
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
    if(String(selected).startsWith('custom:')&&!values.some(x=>x.value===selected))values.push({value:selected,label:labelForCustomValue(selected)});
    return values.map(x=>`<option value="${esc(x.value)}" ${x.value===selected?'selected':''}>${esc(x.label)}</option>`).join('');
  }

  function patchSelect(select){
    const id=requirementId(select);if(!id)return;
    const selected=currentValue(id);
    const html=requirementOptions(id);
    const sig=`${selected}|${html}`;
    if(select.dataset.requirementRefSig!==sig){
      select.dataset.requirementRefSig=sig;
      select.innerHTML=html;
    }
    select.value=selected;
  }
  function patchSelects(){
    if(!location.hash.startsWith('#management/requirements')&&!location.hash.startsWith('#teams/'))return;
    document.querySelectorAll('[data-req-enh-status],select[data-pa-req-status],.core-raci-table select[data-core-field="statusId"]').forEach(patchSelect);
  }

  function applyStatus(select){
    const c=core(),id=requirementId(select);if(!c||!id)return;
    patchCore();
    const value=select.value;
    const label=select.options[select.selectedIndex]?.textContent?.trim()||'';
    saveManual(id,value,label);

    if(value===NOT_ACTUAL||value===INACTIVE){
      localStorage.setItem(`${REL_PREFIX}${id}`,'1');
      localStorage.setItem(`${EXCLUDED_LABEL_PREFIX}${id}`,label||(value===INACTIVE?'Не активно':'Не актуально'));
      localStorage.removeItem(`${CUSTOM_STATUS_PREFIX}${id}`);
      c.setState?.(id,{statusId:'not_requested'});
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

    select.value=value;
    window.dispatchEvent(new CustomEvent('atom-core-data-changed',{detail:{type:'requirement-status',id,status:value,label}}));
    setTimeout(patchSelects,0);
  }

  function removeLegacyDuplicate(){
    const duplicate=document.getElementById('requirement-status-directory');
    if(duplicate)duplicate.remove();
  }

  document.addEventListener('change',e=>{
    const select=e.target.closest('[data-req-enh-status],select[data-pa-req-status],.core-raci-table select[data-core-field="statusId"]');
    if(!select)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    applyStatus(select);
  },true);

  function patch(){patchCore();ensureRefs();removeLegacyDuplicate();patchSelects();}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;patch();});}
  new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});
  ['hashchange','atom-sync-update','atom-view-rendered','atom-core-data-changed','atom-reference-data-changed'].forEach(ev=>window.addEventListener(ev,queue));
  window.ATOM_REQUIREMENTS_STATUS_DIRECTORY={version:VERSION,patch,currentValue};
  setTimeout(queue,300);setTimeout(queue,900);setTimeout(queue,1600);
})();