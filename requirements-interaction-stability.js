(function(){
  const VERSION='1.1.0';
  const ALL='__all__';
  const SESSION_KEY='atom-pa-requirements-team-filter';
  const STABLE_KEY='atom-requirements-stable-team-filter';
  const SELECTOR=[
    '#req-enh-team','#pa-req-team',
    '[data-req-enh-status]','select[data-pa-req-status]',
    '[data-req-enh-person]','select[data-pa-req-person]',
    '[data-req-enh-stage]','select[data-pa-req-stage]',
    '#req-enh-new-team','#req-enh-new-stage',
    '#pa-new-req','#pa-new-req-stage','[data-pa-req-comment]',
    '#pa-panel input','#pa-panel textarea','#pa-panel select'
  ].join(',');
  const DRAFT_SELECTOR='#req-enh-new-team,#req-enh-new-stage,#pa-new-req,#pa-new-req-stage';
  const GUARDED_EVENTS=[
    'atom-core-data-changed','atom-sync-update','atom-view-rendered',
    'atom-reference-data-changed','atom-project-reconciled'
  ];

  let lockUntil=0;
  let activeControl=null;
  const pending=new Map();
  let flushQueued=false;

  const inRequirements=()=>location.hash.startsWith('#management/requirements');
  const isGuarded=el=>Boolean(el?.matches?.(SELECTOR));
  const hasActiveFocus=()=>Boolean(activeControl?.isConnected&&document.activeElement===activeControl);
  const isLocked=()=>inRequirements()&&(Date.now()<lockUntil||hasActiveFocus());
  const isDraft=el=>Boolean(el?.matches?.(DRAFT_SELECTOR));

  function rememberTeam(control){
    if(!control?.matches?.('#req-enh-team,#pa-req-team'))return;
    const value=control.value||ALL;
    sessionStorage.setItem(SESSION_KEY,value);
    sessionStorage.setItem(STABLE_KEY,value);
    try{window.ATOM_REQUIREMENTS_FILTER_PERSISTENCE?.remember?.(value,true);}catch{}
  }

  function lock(control,ms=30000){
    if(!inRequirements()||!isGuarded(control))return;
    activeControl=control;
    lockUntil=Math.max(lockUntil,Date.now()+ms);
    rememberTeam(control);
    try{control.focus({preventScroll:true});}catch{try{control.focus();}catch{}}
  }

  function unlock(){
    lockUntil=0;
    activeControl=null;
    flushPending();
  }

  function queuePending(type,detail){
    pending.set(type,detail);
  }

  function flushPending(){
    if(flushQueued||!pending.size)return;
    flushQueued=true;
    setTimeout(()=>{
      flushQueued=false;
      if(isLocked())return;
      const events=[...pending.entries()];
      pending.clear();
      events.forEach(([type,detail])=>{
        try{window.dispatchEvent(new CustomEvent(type,{detail}));}catch{}
      });
    },0);
  }

  // Protect any requirements form control from background re-render while the user is
  // actively editing it. This includes the unsaved "new requirement" draft fields.
  document.addEventListener('pointerdown',e=>{
    const control=e.target.closest?.(SELECTOR);
    if(control)lock(control);
  },true);

  document.addEventListener('mousedown',e=>{
    const control=e.target.closest?.(SELECTOR);
    if(control)lock(control);
  },true);

  document.addEventListener('focusin',e=>{
    const control=e.target.closest?.(SELECTOR);
    if(control)lock(control);
  },true);

  document.addEventListener('keydown',e=>{
    if(isGuarded(e.target))lock(e.target);
  },true);

  // Saved row dropdowns may unlock after change because their normal handler persists
  // the value. Draft controls and text fields remain protected until focus leaves them.
  document.addEventListener('change',e=>{
    const control=e.target.closest?.(SELECTOR);
    if(!control)return;
    rememberTeam(control);
    if(isDraft(control)||control.matches('input,textarea'))return;
    lockUntil=0;
    activeControl=null;
    setTimeout(flushPending,0);
  },true);

  document.addEventListener('focusout',e=>{
    if(!isGuarded(e.target))return;
    setTimeout(()=>{
      const next=document.activeElement;
      if(next&&isGuarded(next)){
        lock(next);
        return;
      }
      if(document.activeElement===e.target)return;
      unlock();
    },120);
  },true);

  // Suppress background refresh events while the user is editing. They are replayed
  // after the active control is left so cloud state is still applied without data loss.
  GUARDED_EVENTS.forEach(type=>{
    window.addEventListener(type,e=>{
      if(!isLocked())return;
      queuePending(type,e.detail);
      e.stopImmediatePropagation();
    },true);
  });

  function teamFromHash(){
    const prefix='#management/requirements/';
    const h=location.hash||'';
    if(!h.startsWith(prefix))return'';
    try{return decodeURIComponent(h.slice(prefix.length));}catch{return h.slice(prefix.length);}
  }

  function applyHashTeam(){
    if(isLocked())return setTimeout(applyHashTeam,180);
    const team=teamFromHash();if(!team)return;
    const select=document.getElementById('req-enh-team')||document.getElementById('pa-req-team');
    if(!select||![...select.options].some(o=>o.value===team))return;
    if(select.value===team){rememberTeam(select);return;}
    select.value=team;
    rememberTeam(select);
    select.dispatchEvent(new Event('change',{bubbles:true}));
  }

  ['hashchange','atom-view-rendered'].forEach(type=>window.addEventListener(type,()=>setTimeout(applyHashTeam,80)));
  setTimeout(applyHashTeam,900);
  setTimeout(applyHashTeam,1800);

  window.ATOM_REQUIREMENTS_INTERACTION_STABILITY={
    version:VERSION,
    isLocked,
    lock,
    unlock,
    applyHashTeam,
    active:()=>activeControl
  };
})();
