(function(){
  const VERSION='1.1.0';
  const SESSION_KEY='atom-pa-requirements-team-filter';
  const STABLE_KEY='atom-requirements-stable-team-filter';
  const PENDING_KEY='atom-requirements-team-filter-pending';
  const ALL='__all__';
  let restoring=false;
  let queued=false;
  let lockUntil=0;

  function inRequirements(){return location.hash.startsWith('#management/requirements');}
  function currentSelect(){return document.getElementById('req-enh-team')||document.getElementById('pa-req-team');}
  function validOption(select,value){return Boolean(select&&[...select.options].some(o=>o.value===value));}

  function remember(value,stable=true){
    if(!value)return;
    sessionStorage.setItem(SESSION_KEY,value);
    if(stable)sessionStorage.setItem(STABLE_KEY,value);
  }

  function desired(){
    const pending=sessionStorage.getItem(PENDING_KEY)||'';
    if(pending)return pending;
    return sessionStorage.getItem(STABLE_KEY)||sessionStorage.getItem(SESSION_KEY)||ALL;
  }

  function restore(){
    if(restoring||!inRequirements())return;
    const select=currentSelect();if(!select)return;
    const wanted=desired();if(!wanted||!validOption(select,wanted))return;
    if(select.value===wanted)return;
    restoring=true;
    select.value=wanted;
    sessionStorage.setItem(SESSION_KEY,wanted);
    select.dispatchEvent(new Event('change',{bubbles:true}));
    setTimeout(()=>{restoring=false;},0);
  }

  // This listener MUST run before the status-directory capture listener.
  // It snapshots the visible team before status processing causes a complete re-render.
  document.addEventListener('change',e=>{
    const team=e.target.closest('#req-enh-team,#pa-req-team');
    if(team&&!restoring){
      const value=team.value||ALL;
      // During a status save another module can briefly recreate the selector as "Все".
      // Do not let that transient value overwrite a concrete user filter.
      if(value===ALL&&Date.now()<lockUntil&&sessionStorage.getItem(STABLE_KEY)!==ALL)return;
      remember(value,true);
      return;
    }

    const status=e.target.closest('[data-req-enh-status],select[data-pa-req-status],.core-raci-table select[data-core-field="statusId"]');
    if(status&&inRequirements()){
      const select=currentSelect();
      if(select){
        const value=select.value||ALL;
        remember(value,true);
        if(value!==ALL)lockUntil=Date.now()+2500;
      }
      [0,40,120,300,700,1400].forEach(ms=>setTimeout(restore,ms));
    }
  },true);

  function queue(){
    if(queued)return;queued=true;
    requestAnimationFrame(()=>{queued=false;restore();});
  }
  new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});
  ['atom-core-data-changed','atom-sync-update','atom-view-rendered','hashchange','atom-project-reconciled'].forEach(ev=>window.addEventListener(ev,()=>{
    [0,80,250,700].forEach(ms=>setTimeout(restore,ms));
  }));

  window.ATOM_REQUIREMENTS_FILTER_PERSISTENCE={version:VERSION,restore,remember};
  setTimeout(restore,200);setTimeout(restore,700);setTimeout(restore,1500);
})();