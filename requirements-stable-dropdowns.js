(function(){
  const VERSION='1.0.0';
  const TEAM_SESSION='atom-pa-requirements-team-filter';
  const TEAM_STABLE='atom-requirements-stable-team-filter';
  const TARGETS='#req-enh-team,#pa-req-team,[data-req-enh-status],select[data-pa-req-status],[data-req-enh-person],select[data-pa-req-person]';
  let menu=null;
  let context=null;

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const cssEsc=s=>window.CSS?.escape?CSS.escape(String(s)):String(s).replace(/(["\\])/g,'\\$1');
  const inRequirements=()=>location.hash.startsWith('#management/requirements');

  function styles(){
    if(document.getElementById('requirements-stable-dropdowns-css'))return;
    const s=document.createElement('style');
    s.id='requirements-stable-dropdowns-css';
    s.textContent=`
      .req-stable-menu{position:fixed;z-index:2147483000;min-width:180px;max-width:min(420px,calc(100vw - 20px));max-height:min(420px,60vh);overflow:auto;background:#fff;border:1px solid #bfcfcf;border-radius:9px;box-shadow:0 14px 36px rgba(27,51,52,.22);padding:5px;font:inherit}
      .req-stable-option{display:block;width:100%;border:0;background:#fff;color:#233d3e;text-align:left;padding:8px 10px;border-radius:6px;font:inherit;font-size:11px;cursor:pointer;white-space:normal}
      .req-stable-option:hover,.req-stable-option:focus{background:#e9f8f6;outline:0}
      .req-stable-option.selected{background:#dff7f3;color:#0f6962;font-weight:700}
      .req-stable-menu-title{padding:5px 9px 6px;color:#718384;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
      .req-stable-open{outline:2px solid rgba(53,216,199,.32)!important;outline-offset:1px}
    `;
    document.head.appendChild(s);
  }

  function identify(select){
    if(select.matches('#req-enh-team,#pa-req-team'))return{kind:'team'};
    const row=select.closest('[data-req-enh-row],[data-pa-req]');
    const id=select.dataset.reqEnhStatus||select.dataset.reqEnhPerson||row?.dataset.reqEnhRow||row?.dataset.paReq||'';
    if(select.matches('[data-req-enh-status],select[data-pa-req-status]'))return{kind:'status',id};
    if(select.matches('[data-req-enh-person],select[data-pa-req-person]'))return{kind:'person',id};
    return null;
  }

  function currentSelect(ctx){
    if(!ctx)return null;
    if(ctx.kind==='team')return document.querySelector('#req-enh-team,#pa-req-team');
    if(!ctx.id)return null;
    const id=cssEsc(ctx.id);
    if(ctx.kind==='status')return document.querySelector(`[data-req-enh-status="${id}"]`)||document.querySelector(`[data-pa-req="${id}"] select[data-pa-req-status]`);
    if(ctx.kind==='person')return document.querySelector(`[data-req-enh-person="${id}"]`)||document.querySelector(`[data-pa-req="${id}"] select[data-pa-req-person]`);
    return null;
  }

  function close(){
    document.querySelectorAll('.req-stable-open').forEach(x=>x.classList.remove('req-stable-open'));
    menu?.remove();menu=null;context=null;
  }

  function position(select){
    if(!menu||!select)return;
    const r=select.getBoundingClientRect();
    const margin=8;
    const width=Math.max(r.width,180);
    menu.style.width=`${Math.min(width,Math.max(180,window.innerWidth-margin*2))}px`;
    menu.style.left=`${Math.max(margin,Math.min(r.left,window.innerWidth-menu.offsetWidth-margin))}px`;
    const below=window.innerHeight-r.bottom;
    const h=Math.min(menu.scrollHeight,Math.min(420,window.innerHeight-margin*2));
    const top=below>=Math.min(h,220)?r.bottom+4:Math.max(margin,r.top-h-4);
    menu.style.top=`${top}px`;
  }

  function titleFor(ctx){return ctx.kind==='team'?'Команда':ctx.kind==='status'?'Статус':'Ответственный за ответ';}

  function open(select){
    if(!inRequirements())return;
    styles();close();
    const ctx=identify(select);if(!ctx)return;
    context=ctx;
    const selected=select.value;
    const options=[...select.options].map(o=>({value:o.value,label:o.textContent||o.label||o.value,disabled:o.disabled}));
    menu=document.createElement('div');
    menu.className='req-stable-menu';
    menu.setAttribute('role','listbox');
    menu.innerHTML=`<div class="req-stable-menu-title">${esc(titleFor(ctx))}</div>${options.map(o=>`<button type="button" class="req-stable-option ${o.value===selected?'selected':''}" data-value="${esc(o.value)}" ${o.disabled?'disabled':''}>${esc(o.label)}</button>`).join('')}`;
    document.body.appendChild(menu);
    select.classList.add('req-stable-open');
    position(select);
    const current=menu.querySelector('.selected');
    if(current)setTimeout(()=>current.scrollIntoView({block:'nearest'}),0);
  }

  function apply(value){
    const ctx=context;if(!ctx)return close();
    const select=currentSelect(ctx);
    if(ctx.kind==='team'){
      sessionStorage.setItem(TEAM_SESSION,value);
      sessionStorage.setItem(TEAM_STABLE,value);
      try{window.ATOM_REQUIREMENTS_FILTER_PERSISTENCE?.remember?.(value,true);}catch{}
    }
    if(select){
      select.value=value;
      select.dispatchEvent(new Event('change',{bubbles:true}));
    }else if(ctx.kind==='status'&&ctx.id){
      try{
        const c=window.ATOM_CORE;
        if(value==='__not_actual__'||value==='__inactive__'){
          localStorage.setItem(`atom-requirement-not-actual-${ctx.id}`,'1');
          localStorage.setItem(`atom-requirement-excluded-label-${ctx.id}`,value==='__inactive__'?'В очереди':'Не актуально');
        }else if(c?.STATUS?.some(x=>x.id===value)){
          localStorage.removeItem(`atom-requirement-not-actual-${ctx.id}`);
          localStorage.removeItem(`atom-requirement-excluded-label-${ctx.id}`);
          c.setState?.(ctx.id,{statusId:value});
          c.reconcile?.();
        }
      }catch{}
    }else if(ctx.kind==='person'&&ctx.id){
      try{window.ATOM_CORE?.setState?.(ctx.id,{respondentId:value});window.ATOM_CORE?.reconcile?.();}catch{}
    }
    close();
    if(ctx.kind==='status')setTimeout(()=>window.ATOM_REQUIREMENTS_ENHANCED?.render?.(),30);
  }

  // Capture pointerdown before the browser opens the native dropdown. We intentionally
  // replace only the popup interaction; the original select remains the source of truth.
  document.addEventListener('pointerdown',e=>{
    const select=e.target.closest?.(TARGETS);
    if(!select||!inRequirements())return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    open(select);
  },true);

  document.addEventListener('mousedown',e=>{
    const select=e.target.closest?.(TARGETS);
    if(!select||!inRequirements())return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  },true);

  document.addEventListener('click',e=>{
    const option=e.target.closest?.('.req-stable-option');
    if(option&&menu){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      apply(option.dataset.value||'');
      return;
    }
    if(menu&&!e.target.closest?.('.req-stable-menu')&&!e.target.closest?.(TARGETS))close();
  },true);

  document.addEventListener('keydown',e=>{
    const select=e.target.closest?.(TARGETS);
    if(select&&inRequirements()&&(e.key==='Enter'||e.key===' '||e.key==='ArrowDown')){
      e.preventDefault();open(select);return;
    }
    if(menu&&e.key==='Escape'){e.preventDefault();close();}
  },true);

  window.addEventListener('resize',()=>{const s=currentSelect(context);if(menu&&s)position(s);});
  window.addEventListener('scroll',()=>{const s=currentSelect(context);if(menu&&s)position(s);},true);
  window.addEventListener('hashchange',close);
  window.ATOM_REQUIREMENTS_STABLE_DROPDOWNS={version:VERSION,open,close};
})();
