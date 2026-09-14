(function(){
  const VERSION='1.0.0';
  let busy=false;

  function sync(){
    if(busy)return;
    busy=true;
    setTimeout(()=>{
      try{window.ATOM_CORE?.reconcile?.();}catch{}
      try{window.ATOM_BLOCKERS_ALL_VIEW?.patch?.();}catch{}
      window.dispatchEvent(new CustomEvent('atom-requirement-blockers-synced'));
      busy=false;
    },0);
  }

  window.addEventListener('atom-core-data-changed',e=>{
    const type=String(e.detail?.type||'');
    if(type==='requirement'||type==='requirement-period-override'||type==='requirement-period-reset')sync();
  });
  window.addEventListener('atom-requirement-status-changed',sync);
  window.ATOM_REQUIREMENT_BLOCKER_LIVE_SYNC={version:VERSION,sync};
})();