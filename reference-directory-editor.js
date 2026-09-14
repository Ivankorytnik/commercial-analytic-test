(function(){
  const VERSION='1.1.0';
  const REF_KEY='atom-reference-data-v1';
  const GROUPS=[
    {key:'stage',title:'Статусы этапов'},
    {key:'blocker',title:'Статусы блокеров'},
    {key:'source',title:'Статусы источников'},
    {key:'severity',title:'Критичность блокеров'}
  ];
  let lastSignature='';
  let queued=false;

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const readRefs=()=>{try{return JSON.parse(localStorage.getItem(REF_KEY)||'{}')||{}}catch{return{}}};
  const writeRefs=refs=>{
    localStorage.setItem(REF_KEY,JSON.stringify(refs));
    window.dispatchEvent(new CustomEvent('atom-core-data-changed',{detail:{type:'reference-data'}}));
    window.dispatchEvent(new CustomEvent('atom-reference-data-changed'));
  };
  const isDirectories=()=>location.hash.startsWith('#management/directories');
  const openKey=key=>`ref-directory-open-${key}`;
  const isOpen=key=>sessionStorage.getItem(openKey(key))==='1';
  const setOpen=(key,value)=>sessionStorage.setItem(openKey(key),value?'1':'0');

  function styles(){
    if(document.getElementById('reference-directory-editor-css'))return;
    const s=document.createElement('style');
    s.id='reference-directory-editor-css';
    s.textContent=`
      .ref-directory-editor{display:grid;gap:8px}.ref-directory-title{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin-top:2px}.ref-directory-title h3{margin:0;font-size:14px}.ref-directory-title small{color:var(--muted);font-size:10px}
      details.ref-accordion{background:#fff;border:1px solid var(--line);border-radius:10px;overflow:hidden}.ref-accordion-head{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;color:var(--text);cursor:pointer;user-select:none}.ref-accordion-head::-webkit-details-marker{display:none}.ref-accordion-head:hover{background:#f8fbfb}.ref-accordion-name{font-size:12px;font-weight:700}.ref-accordion-meta{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:10px}.ref-accordion-arrow{width:22px;height:22px;border-radius:6px;background:#eef5f4;color:#0f6962;display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;transition:transform .15s ease}.ref-accordion[open] .ref-accordion-arrow{transform:rotate(180deg)}
      .ref-accordion-body{border-top:1px solid var(--line);padding:12px 14px;background:#fbfdfd}.ref-directory-controls{display:grid;grid-template-columns:minmax(220px,1fr) minmax(220px,1fr) auto;gap:8px;align-items:end}.ref-field label{display:block;color:var(--muted);font-size:9px;margin-bottom:4px}.ref-field select,.ref-field input{width:100%;box-sizing:border-box;padding:8px 9px;border:1px solid #ccd9d9;border-radius:7px;background:#fff;font:inherit;font-size:11px;color:var(--text)}.ref-directory-hint{margin-top:7px;color:var(--muted);font-size:9px}.ref-hidden-system-card{display:none!important}
      @media(max-width:800px){.ref-directory-controls{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function options(items,selected=''){
    return (items||[]).map(x=>`<option value="${esc(x)}" ${x===selected?'selected':''}>${esc(x)}</option>`).join('');
  }

  function signature(refs){
    return JSON.stringify(GROUPS.map(g=>[g.key,Array.isArray(refs[g.key])?refs[g.key]:[]]));
  }

  function hideLegacyCards(){
    const titles=new Set(GROUPS.map(x=>x.title));
    document.querySelectorAll('#pa-panel .pa-setting').forEach(card=>{
      const h=card.querySelector('h3')?.textContent.trim();
      if(titles.has(h))card.classList.add('ref-hidden-system-card');
    });
  }

  function renderEditor(force=false){
    if(!isDirectories())return;
    const host=document.getElementById('pa-panel');
    if(!host)return;
    styles();
    hideLegacyCards();
    const refs=readRefs();
    const sig=signature(refs);
    let editor=document.getElementById('reference-directory-editor');
    if(editor&&!force&&editor.dataset.version===VERSION&&lastSignature===sig)return;

    if(!editor){
      editor=document.createElement('section');
      editor.id='reference-directory-editor';
      editor.className='ref-directory-editor';
      host.appendChild(editor);
    }
    editor.dataset.version=VERSION;
    editor.innerHTML=`
      <div class="ref-directory-title"><div><h3>Системные справочники</h3><small>Нажмите на строку, чтобы развернуть или свернуть блок</small></div></div>
      ${GROUPS.map(g=>{
        const items=Array.isArray(refs[g.key])?refs[g.key]:[];
        return `<details class="ref-accordion" data-ref-group="${g.key}" ${isOpen(g.key)?'open':''}>
          <summary class="ref-accordion-head">
            <span class="ref-accordion-name">${esc(g.title)}</span>
            <span class="ref-accordion-meta"><span>${items.length} знач.</span><span class="ref-accordion-arrow">⌄</span></span>
          </summary>
          <div class="ref-accordion-body">
            <div class="ref-directory-controls">
              <div class="ref-field"><label>Текущие значения</label><select data-ref-select="${g.key}">${options(items)}</select></div>
              <div class="ref-field"><label>Добавить новое значение</label><input data-ref-input="${g.key}" placeholder="Введите новый вариант"></div>
              <button type="button" class="btn primary" data-ref-add="${g.key}">Добавить</button>
            </div>
            <div class="ref-directory-hint">Добавленное значение сохраняется в общем справочнике и синхронизируется между устройствами.</div>
          </div>
        </details>`;
      }).join('')}`;
    lastSignature=sig;
  }

  function addValue(key){
    const input=document.querySelector(`[data-ref-input="${key}"]`);
    const value=input?.value.trim();
    if(!value)return alert('Введите новое значение');
    const refs=readRefs();
    const list=Array.isArray(refs[key])?refs[key].slice():[];
    if(list.some(x=>String(x).toLowerCase()===value.toLowerCase()))return alert('Такое значение уже есть');
    list.push(value);
    refs[key]=list;
    setOpen(key,true);
    writeRefs(refs);
    lastSignature='';
    renderEditor(true);
    patchRuntimeDropdowns();
    const select=document.querySelector(`[data-ref-select="${key}"]`);
    if(select)select.value=value;
  }

  function syncSelect(select,items){
    if(!select||!Array.isArray(items))return;
    const current=select.value;
    const normalized=items.slice();
    if(current&&!normalized.includes(current))normalized.push(current);
    const sig=JSON.stringify(normalized);
    if(select.dataset.refSignature===sig)return;
    select.dataset.refSignature=sig;
    select.innerHTML=options(normalized,current);
    if(current)select.value=current;
  }

  function patchRuntimeDropdowns(){
    const refs=readRefs();
    document.querySelectorAll('.stage-status-select').forEach(x=>syncSelect(x,refs.stage||[]));
    document.querySelectorAll('.source-status-select,[data-pa-source-status],[data-cs-status]').forEach(x=>syncSelect(x,refs.source||[]));
    document.querySelectorAll('.blocker-status').forEach(x=>syncSelect(x,refs.blocker||[]));
    document.querySelectorAll('.blocker-severity,#bl-severity').forEach(x=>syncSelect(x,refs.severity||[]));
  }

  document.addEventListener('toggle',e=>{
    const details=e.target.closest?.('details[data-ref-group]');
    if(!details)return;
    setOpen(details.dataset.refGroup,details.open);
  },true);

  document.addEventListener('click',e=>{
    const add=e.target.closest('[data-ref-add]');
    if(add){e.preventDefault();e.stopPropagation();addValue(add.dataset.refAdd);}
  });

  document.addEventListener('keydown',e=>{
    const input=e.target.closest('[data-ref-input]');
    if(input&&e.key==='Enter'){e.preventDefault();addValue(input.dataset.refInput);}
  });

  function patch(force=false){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      renderEditor(force);
      patchRuntimeDropdowns();
    });
  }

  const observer=new MutationObserver(()=>{
    if(!isDirectories())return;
    const host=document.getElementById('pa-panel');
    const editor=document.getElementById('reference-directory-editor');
    if(host&&!editor)patch(true);
  });
  observer.observe(document.body,{childList:true,subtree:true});

  window.addEventListener('hashchange',()=>{lastSignature='';patch(true)});
  window.addEventListener('atom-sync-update',()=>{lastSignature='';patch(true)});
  window.addEventListener('atom-reference-data-changed',()=>{lastSignature='';patch(true)});
  window.addEventListener('atom-view-rendered',()=>patch(false));

  window.ATOM_REFERENCE_DIRECTORY_EDITOR={version:VERSION,patch:()=>patch(false),render:()=>renderEditor(true)};
  styles();
  setTimeout(()=>patch(true),400);
  setTimeout(()=>patch(false),1200);
})();