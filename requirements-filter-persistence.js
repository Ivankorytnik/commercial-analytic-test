(function(){
  const VERSION='1.0.0';
  const SESSION_KEY='atom-pa-requirements-team-filter';
  const PENDING_KEY='atom-requirements-team-filter-pending';
  const ALL='__all__';
  let restoring=false;
  let queued=false;

  function inRequirements(){return location.hash.startsWith('#management/requirements');}
  function currentSelect(){return document.getElementById('req-enh-team')||document.getElementById('pa-req-team');}
  function validOption(select,value){return Boolean(select&&[...select.options].some(o=>o.value===value));}

  function remember(value){
    if(!value)return;
    sessionStorage.setItem(SESSION_KEY,value);
  }

  function desired(){
    const pending=sessionStorage.getItem(PENDING_KEY)||'';
    if(pending)return pending;
    return sessionStorage.getItem(SESSION_KEY)||'';
  }

  function restore(){
    if(restoring||!inRequirements())return;
    const select=currentSelect();if(!select)return;
    const wanted=desired();if(!wanted||!validOption(select,wanted))return;
    if(select.value===wanted)return;
    restoring=true;
    select.value=wanted;
    select.dispatchEvent(new Event('change',{bubbles:true}));
    setTimeout(()=>{restoring=false;},0);
  }

  // Capture the currently selected team before any status handler triggers a re-render.
  document.addEventListener('change',e=>{
    const team=e.target.closest('#req-enh-team,#pa-req-team');
    if(team&&!restoring){remember(team.value||ALL);return;}

    const status=e.target.closest('[data-req-enh-status],select[data-pa-req-status],.core-raci-table select[data-core-field="statusId"]');
    if(status&&inRequirements()){
      const select=currentSelect();
      if(select)remember(select.value||ALL);
      setTimeout(restore,0);
      setTimeout(restore,100);
    }
  },true);

  // After project/status/sync re-renders, re-apply the user's current filter.
  function queue(){
    if(queued)return;queued=true;
    requestAnimationFrame(()=>{queued=false;restore();});
  }
  new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});
  ['atom-core-data-changed','atom-sync-update','atom-view-rendered','hashchange'].forEach(ev=>window.addEventListener(ev,()=>{
    setTimeout(restore,0);setTimeout(restore,120);
  }));

  window.ATOM_REQUIREMENTS_FILTER_PERSISTENCE={version:VERSION,restore,remember};
  setTimeout(restore,300);setTimeout(restore,900);
})();