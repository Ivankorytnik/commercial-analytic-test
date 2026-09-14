(function(){
  const VERSION='2.0.0';
  const PREFIX='atom-requirement-period-override-';
  const META_PREFIX='atom-core-requirement-meta-';

  const readJson=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key)||'');return v??fallback}catch{return fallback}};
  const writeJson=(key,value)=>localStorage.setItem(key,JSON.stringify(value));

  function read(id){
    const legacy=readJson(`${PREFIX}${id}`,null);
    if(legacy?.startDate&&legacy?.endDate)return legacy;
    const meta=readJson(`${META_PREFIX}${id}`,null);
    if(meta?.customStartDate&&meta?.customEndDate)return{startDate:meta.customStartDate,endDate:meta.customEndDate,updatedAt:meta.updatedAt||''};
    return null;
  }

  function write(id,startDate,endDate){
    if(!id||!startDate||!endDate)return;
    const key=`${META_PREFIX}${id}`;
    const meta=readJson(key,{})||{};
    meta.customStartDate=startDate;
    meta.customEndDate=endDate;
    meta.customStartAt=meta.customStartAt&&meta.customStartAt.slice(0,10)===startDate?meta.customStartAt:`${startDate}T00:00`;
    meta.customEndAt=meta.customEndAt&&meta.customEndAt.slice(0,10)===endDate?meta.customEndAt:`${endDate}T23:59`;
    meta.periodOverride=true;
    meta.updatedAt=new Date().toISOString();
    writeJson(key,meta);
  }

  function clear(id){
    localStorage.removeItem(`${PREFIX}${id}`);
    const key=`${META_PREFIX}${id}`;
    const meta=readJson(key,null);
    if(!meta)return;
    delete meta.customStartDate;
    delete meta.customEndDate;
    delete meta.customStartAt;
    delete meta.customEndAt;
    delete meta.periodOverride;
    meta.updatedAt=new Date().toISOString();
    writeJson(key,meta);
  }

  function migrateLegacy(){
    const keys=[];
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(k&&k.startsWith(PREFIX))keys.push(k);
    }
    keys.forEach(k=>{
      const id=k.slice(PREFIX.length);
      const legacy=readJson(k,null);
      if(!legacy?.startDate||!legacy?.endDate)return;
      const mk=`${META_PREFIX}${id}`;
      const meta=readJson(mk,{})||{};
      if(!meta.customStartAt||!meta.customEndAt){
        meta.customStartDate=legacy.startDate;
        meta.customEndDate=legacy.endDate;
        meta.customStartAt=`${legacy.startDate}T00:00`;
        meta.customEndAt=`${legacy.endDate}T23:59`;
        meta.periodOverride=true;
        meta.updatedAt=legacy.updatedAt||new Date().toISOString();
        writeJson(mk,meta);
      }
    });
  }

  migrateLegacy();

  // Compatibility API only. This module intentionally does not patch ATOM_CORE,
  // render DOM controls, or attach MutationObservers. requirements-time.js is the
  // single owner of requirement period editing.
  window.ATOM_REQUIREMENTS_PERIOD_EDITOR={
    version:VERSION,
    compatibilityOnly:true,
    read,
    write,
    clear,
    open:function(){return false;},
    install:function(){return true;}
  };

  window.dispatchEvent(new CustomEvent('atom-requirement-period-editor-ready',{detail:{version:VERSION,compatibilityOnly:true}}));
})();