(function(){
  const VERSION='1.0.0';
  const ALL='__all__';
  const SESSION_KEY='atom-pa-requirements-team-filter';
  const STABLE_KEY='atom-requirements-stable-team-filter';
  const SELECTOR=[
    '#req-enh-team','#pa-req-team',
    '[data-req-enh-status]','select[data-pa-req-status]',
    '[data-req-enh-person]','select[data-pa-req-person]',
    '[data-req-enh-stage]','select[data-pa-req-stage]',
    '#req-enh-new-team','#req-enh-new-stage'
  ].join(',');
  const GUARDED_EVENTS=[
    'atom-core-data-changed','atom-sync-update','atom-view-rendered',
    'atom-reference-data-changed','atom-project-reconciled'
  ];

  let lockUntil=0;
  let activeSelect=null;
  const pending=new Map();
  let flushQueued=false;

  const inRequirements=()=>location.hash.startsWith('#management/requirements');
  const isSelect=el=>Boolean(el?.matches?.(SELECTOR));
  const isLocked=()=>inRequirements()&&Date.now()<lockUntil;

  function rememberTeam(select){
    if(!select?.matches?.('#req-enh-team,#pa-req-team'))return;
    const value=select.value||ALL;
    sessionStorage.setItem(SESSION_KEY,value);
    sessionStorage.setItem(STABLE_KEY,value);
    try{window.ATOM_REQUIREMENTS_FILTER_PERSISTENCE?.remember?.(value,true);}catch{}
  }

  function lock(select,ms=30000){
    if(!inRequirements()||!isSelect(select))return;
    activeSelect=select;
    lockUntil=Math.max(lockUntil,Date.now()+ms);
    rememberTeam(select);
    try{select.focus({preventScroll:true});}catch{try{select.focus();}catch{}}
  }

  function unlock(){
    lockUntil=0;
    activeSelect=null;
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

  // Native <select> receives focus slightly after pointerdown. Existing project scripts
  // use document.activeElement as a guard, so focus it synchronously before their queued
  // render callbacks can detach/rebuild its row.
  document.addEventListener('pointerdown',e=>{
    const select=e.target.closest?.(SELECTOR);
    if(select)lock(select);
  },true);

  document.addEventListener('mousedown',e=>{
    const select=e.target.closest?.(SELECTOR);
    if(select)lock(select);
  },true);

  document.addEventListener('focusin',e=>{
    const select=e.target.closest?.(SELECTOR);
    if(select)lock(select);
  },true);

  document.addEventListener('keydown',e=>{
    if(isSelect(e.target))lock(e.target);
  },true);

  // By the time change fires, the user has made a choice. Let the normal handlers save
  // and filter, then replay any project refresh event that was postponed while open.
  document.addEventListener('change',e=>{
    const select=e.target.closest?.(SELECTOR);
    if(!select)return;
    rememberTeam(select);
    lockUntil=0;
    activeSelect=null;
    setTimeout(flushPending,0);
  },true);

  document.addEventListener('focusout',e=>{
    if(!isSelect(e.target))return;
    setTimeout(()=>{
      if(document.activeElement===e.target)return;
      unlock();
    },80);
  },true);

  // Suppress background refresh events only while a native dropdown is actually being
  // interacted with. They are replayed immediately after the choice/focus change.
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
    active:()=>activeSelect
  };
})();
