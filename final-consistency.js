(function(){
  const VERSION='1.0.0';

  const core=()=>window.ATOM_CORE;
  const activity=()=>window.ATOM_TEAM_ACTIVITY;

  function stageRelevant(id){
    const c=core();
    if(!c)return false;
    try{return Boolean(c.stageSummary(Number(id))?.relevant);}catch{return false;}
  }

  function syncStageStatuses(){
    const c=core();if(!c)return;
    for(let id=1;id<=12;id++){
      let s=null;try{s=c.stageSummary(id);}catch{}
      if(!s)continue;
      localStorage.setItem(`atom-stage-status-${id}`,s.relevant?s.status:'В очереди');
    }
  }

  function patchActivityPublicApi(){
    const a=activity();if(!a)return;
    a.stageRelevant=stageRelevant;
  }

  function patchRequirementsUiOwner(){
    if(!location.hash.startsWith('#management/requirements'))return;
    const panel=document.getElementById('pa-panel');if(!panel)return;
    // If an old cached enhanced renderer replaced the current table, restore the
    // canonical project-admin view once. Current builds no longer auto-render it.
    if(panel.querySelector('#req-enhanced-root')&&window.ATOM_PROJECT_ADMIN?.open){
      try{window.ATOM_PROJECT_ADMIN.open();}catch{}
      return;
    }
    try{window.ATOM_REQUIREMENTS_TIME?.patch?.();}catch{}
    try{window.ATOM_REQUIREMENTS_STATUS_DIRECTORY?.patch?.();}catch{}
  }

  function patch(){
    patchActivityPublicApi();
    syncStageStatuses();
    patchRequirementsUiOwner();
    try{window.ATOM_REQUIREMENT_PROGRESS_RULES?.recalc?.();}catch{}
  }

  ['atom-core-ready','atom-core-data-changed','atom-team-activity-changed','atom-source-activity-changed','atom-sync-update','atom-view-rendered','hashchange'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(patch,0)));
  window.ATOM_FINAL_CONSISTENCY={version:VERSION,patch,stageRelevant};
  setTimeout(patch,1000);setTimeout(patch,2200);
})();