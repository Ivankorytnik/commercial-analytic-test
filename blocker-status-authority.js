(function(){
  const VERSION='1.1.0';
  const BLOCKERS_KEY='atom-blockers';
  const MANUAL_KEY='atom-blocker-manual-status-v1';
  const syncSet=Storage.prototype.setItem;
  let restoring=false;

  const read=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key)||'');return v??fallback}catch{return fallback}};
  const manualMap=()=>read(MANUAL_KEY,{});

  function mergeManual(rows){
    const map=manualMap();
    let changed=false;
    (rows||[]).forEach(b=>{
      const item=map[String(b.id)];
      if(!item?.status)return;
      if(b.status!==item.status){b.status=item.status;changed=true;}
      if(!b.statusManual){b.statusManual=true;changed=true;}
      if(b.manualStatusValue!==item.status){b.manualStatusValue=item.status;changed=true;}
      if(item.updatedAt&&b.statusManualAt!==item.updatedAt){b.statusManualAt=item.updatedAt;changed=true;}
    });
    return changed;
  }

  // Final guard for atom-blockers writes. Automatic modules may try to rewrite a manual
  // status, but the final serialized value is compared with the current value before the
  // sync layer is called. This prevents endless "Сохраняется" loops on identical data.
  Storage.prototype.setItem=function(key,value){
    if(this===window.localStorage&&String(key)===BLOCKERS_KEY){
      try{
        const rows=JSON.parse(String(value)||'[]');
        if(Array.isArray(rows)){
          mergeManual(rows);
          const serialized=JSON.stringify(rows);
          if(localStorage.getItem(BLOCKERS_KEY)===serialized)return;
          return syncSet.call(this,key,serialized);
        }
      }catch{}
    }
    return syncSet.call(this,key,value);
  };

  function saveManual(id,status){
    if(!id||!status)return;
    const rows=read(BLOCKERS_KEY,[]);
    const b=rows.find(x=>String(x.id)===String(id));
    const map=manualMap();
    const previous=map[String(id)];
    const alreadyApplied=b&&b.status===status&&b.statusManual&&b.manualStatusValue===status;
    if(previous?.status===status&&alreadyApplied)return;

    const updatedAt=new Date().toISOString();
    map[String(id)]={status,updatedAt};
    localStorage.setItem(MANUAL_KEY,JSON.stringify(map));

    if(b){
      b.status=status;
      b.statusManual=true;
      b.manualStatusValue=status;
      b.statusManualAt=updatedAt;
      localStorage.setItem(BLOCKERS_KEY,JSON.stringify(rows));
    }
    window.dispatchEvent(new CustomEvent('atom-blocker-status-manual',{detail:{id,status}}));
  }

  function clearManual(id){
    if(!id)return;
    const map=manualMap();
    if(!Object.prototype.hasOwnProperty.call(map,String(id)))return;
    delete map[String(id)];
    localStorage.setItem(MANUAL_KEY,JSON.stringify(map));
  }

  function restore(){
    if(restoring)return;
    restoring=true;
    try{
      const rows=read(BLOCKERS_KEY,[]);
      if(mergeManual(rows))localStorage.setItem(BLOCKERS_KEY,JSON.stringify(rows));
    }finally{restoring=false;}
  }

  document.addEventListener('change',e=>{
    const sel=e.target.closest('.blocker-status');
    if(!sel)return;
    saveManual(sel.dataset.id,sel.value);
  },true);

  document.addEventListener('click',e=>{
    const btn=e.target.closest('.delete-blocker');
    if(btn)clearManual(btn.dataset.id);
  },true);

  ['atom-sync-ready','atom-sync-update','atom-project-reconciled','hashchange'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(restore,0)));
  setTimeout(restore,100);
  setTimeout(restore,800);

  window.ATOM_BLOCKER_STATUS_AUTHORITY={version:VERSION,restore,saveManual};
})();