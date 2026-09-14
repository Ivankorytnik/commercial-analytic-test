(function(){
  const VERSION='1.0.0';
  const REQ_SNAPSHOT='atom-requirement-status-snapshot-';
  const BLOCKERS_KEY='atom-blockers';
  const NOT_ACTUAL='__not_actual__';
  const INACTIVE='__inactive__';
  let restoring=false;

  const read=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||'');return v??f}catch{return f}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const core=()=>window.ATOM_CORE;

  function flushSoon(){
    setTimeout(()=>{try{window.ATOM_SYNC?.flush?.();}catch{}},0);
    setTimeout(()=>{try{window.ATOM_SYNC?.flush?.();}catch{}},150);
  }

  function saveRequirementSnapshot(detail){
    const id=detail?.id,status=detail?.status;
    if(!id||!status)return;
    write(`${REQ_SNAPSHOT}${id}`,{status,label:detail.label||'',updatedAt:new Date().toISOString()});
    flushSoon();
  }

  function restoreRequirementSnapshot(id,snap){
    const c=core();if(!c||!id||!snap?.status)return false;
    const status=snap.status,label=String(snap.label||'');
    let changed=false;
    if(status===NOT_ACTUAL||status===INACTIVE){
      if(localStorage.getItem(`atom-requirement-not-actual-${id}`)!=='1'){localStorage.setItem(`atom-requirement-not-actual-${id}`,'1');changed=true;}
      const wanted=label||(status===INACTIVE?'Не активно':'Не актуально');
      if(localStorage.getItem(`atom-requirement-excluded-label-${id}`)!==wanted){localStorage.setItem(`atom-requirement-excluded-label-${id}`,wanted);changed=true;}
      if(localStorage.getItem(`atom-requirement-custom-status-${id}`)!==null){localStorage.removeItem(`atom-requirement-custom-status-${id}`);changed=true;}
    }else if(String(status).startsWith('custom:')){
      const wanted=label||decodeURIComponent(String(status).slice(7));
      if(localStorage.getItem(`atom-requirement-not-actual-${id}`)!==null){localStorage.removeItem(`atom-requirement-not-actual-${id}`);changed=true;}
      if(localStorage.getItem(`atom-requirement-excluded-label-${id}`)!==null){localStorage.removeItem(`atom-requirement-excluded-label-${id}`);changed=true;}
      if(localStorage.getItem(`atom-requirement-custom-status-${id}`)!==wanted){localStorage.setItem(`atom-requirement-custom-status-${id}`,wanted);changed=true;}
      if(c.getState?.(id)?.statusId!=='not_requested'){c.setState?.(id,{statusId:'not_requested'});changed=true;}
    }else{
      if(localStorage.getItem(`atom-requirement-not-actual-${id}`)!==null){localStorage.removeItem(`atom-requirement-not-actual-${id}`);changed=true;}
      if(localStorage.getItem(`atom-requirement-excluded-label-${id}`)!==null){localStorage.removeItem(`atom-requirement-excluded-label-${id}`);changed=true;}
      if(localStorage.getItem(`atom-requirement-custom-status-${id}`)!==null){localStorage.removeItem(`atom-requirement-custom-status-${id}`);changed=true;}
      if(c.getState?.(id)?.statusId!==status){c.setState?.(id,{statusId:status});changed=true;}
    }
    return changed;
  }

  function restoreRequirements(){
    const c=core();if(!c||restoring)return false;
    restoring=true;let changed=false;
    try{
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i);if(!key?.startsWith(REQ_SNAPSHOT))continue;
        const id=key.slice(REQ_SNAPSHOT.length),snap=read(key,null);
        if(restoreRequirementSnapshot(id,snap))changed=true;
      }
    }finally{restoring=false;}
    return changed;
  }

  function restoreBlockers(){
    const rows=read(BLOCKERS_KEY,[]);let changed=false;
    rows.forEach(b=>{
      if(!b?.statusManual||!b.manualStatusValue)return;
      if(b.status!==b.manualStatusValue){b.status=b.manualStatusValue;changed=true;}
    });
    if(changed)write(BLOCKERS_KEY,rows);
    return changed;
  }

  function restoreAll(){
    const changedReq=restoreRequirements();
    const changedBl=restoreBlockers();
    if(changedReq||changedBl){
      try{core()?.reconcile?.();}catch{}
      try{window.ATOM_REQUIREMENTS_STATUS_DIRECTORY?.patch?.();}catch{}
      try{window.ATOM_LOGIC_CLEANUP?.patch?.();}catch{}
      flushSoon();
    }
  }

  window.addEventListener('atom-core-data-changed',e=>{
    if(e.detail?.type==='requirement-status'){
      saveRequirementSnapshot(e.detail);
      setTimeout(restoreAll,0);
    }
  });
  window.addEventListener('atom-blocker-status-manual',()=>{restoreBlockers();flushSoon();});
  ['atom-sync-ready','atom-sync-update','atom-project-reconciled','hashchange'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(restoreAll,0)));
  setInterval(()=>{restoreBlockers();},2000);

  window.ATOM_STATUS_PERSISTENCE_GUARD={version:VERSION,restoreAll,flush:flushSoon};
  setTimeout(restoreAll,600);setTimeout(restoreAll,1600);
})();