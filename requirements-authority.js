(function(){
  const VERSION='1.0.0';
  const META_PREFIX='atom-core-requirement-meta-';
  const DAY=86400000;
  const STAGE_WINDOWS={1:[0,7],2:[0,14],3:[7,21],4:[14,28],5:[21,35],6:[28,42],7:[35,63],8:[42,70],9:[56,77],10:[63,84],11:[77,91],12:[84,91]};
  let installed=false;
  let originalAddRequirement=null;

  const core=()=>window.ATOM_CORE;
  const read=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||'');return v??f}catch{return f}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const pad=n=>String(n).padStart(2,'0');
  const dateInput=ts=>{const d=new Date(Number(ts));return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
  const startOfDay=ts=>{const d=new Date(Number(ts));return new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime()};
  const endOfDay=ts=>{const d=new Date(Number(ts));return new Date(d.getFullYear(),d.getMonth(),d.getDate(),23,59,59,999).getTime()};
  const addDays=(ts,n)=>{const d=new Date(startOfDay(ts));d.setDate(d.getDate()+Number(n||0));return d.getTime()};
  const parseDate=(v,end=false)=>{
    if(!v)return NaN;
    const raw=String(v);
    const d=new Date(raw.includes('T')?raw:`${raw}T${end?'23:59:59.999':'00:00:00'}`);
    return d.getTime();
  };

  function allRequirements(){
    const c=core();if(!c)return[];
    const rows=[],seen=new Set();
    (c.teams?.()||[]).forEach(team=>{
      (c.requirementsByTeam?.(team)||[]).forEach(req=>{
        if(!req?.id||seen.has(req.id))return;
        seen.add(req.id);rows.push(req);
      });
    });
    return rows;
  }

  function staticPeriod(req){
    const c=core();if(!c||!req)return null;
    const stageId=Number(req.stageId||1);
    const [a,b]=STAGE_WINDOWS[stageId]||[0,7];
    const projectStart=Number(c.startTs?.()||Date.now());
    const start=addDays(projectStart,a),end=endOfDay(addDays(projectStart,b));
    return {
      start,end,
      startDate:dateInput(start),endDate:dateInput(end),
      startAt:`${dateInput(start)}T00:00`,endAt:`${dateInput(end)}T23:59`,
      stageId,stageName:c.stageName?.(stageId)||`Этап ${stageId}`,
      changed:false,customDates:true,customTimes:true,periodOverride:true,
      authority:'requirements',source:'stage-default'
    };
  }

  function metaPeriod(req){
    const c=core();if(!c||!req)return null;
    const m=read(`${META_PREFIX}${req.id}`,{})||{};
    const startAt=m.customStartAt||m.customStartDate||'';
    const endAt=m.customEndAt||m.customEndDate||'';
    if(!startAt||!endAt)return null;
    const start=parseDate(startAt,false),end=parseDate(endAt,true);
    if(!Number.isFinite(start)||!Number.isFinite(end)||end<start)return null;
    const stageId=Number(m.stageId||req.stageId||1);
    return {
      start,end,
      startDate:dateInput(start),endDate:dateInput(end),
      startAt:m.customStartAt||`${dateInput(start)}T00:00`,
      endAt:m.customEndAt||`${dateInput(end)}T23:59`,
      stageId,stageName:c.stageName?.(stageId)||`Этап ${stageId}`,
      changed:false,customDates:true,customTimes:true,periodOverride:true,
      authority:'requirements',source:'requirement'
    };
  }

  function requirementPeriod(reqOrId){
    const c=core();
    const req=typeof reqOrId==='string'?c?.requirement?.(reqOrId):reqOrId;
    if(!req)return null;
    return metaPeriod(req)||staticPeriod(req);
  }

  function seedRequirement(req,preserveLegacy=true){
    if(!req?.id)return false;
    const key=`${META_PREFIX}${req.id}`;
    const m=read(key,{})||{};
    if(m.customStartAt&&m.customEndAt)return false;
    const p=staticPeriod(req);if(!p)return false;
    let endDate=p.endDate;
    if(preserveLegacy){
      const legacy=localStorage.getItem(`atom-gantt-due-${Number(req.stageId||1)}`);
      if(/^\d{4}-\d{2}-\d{2}$/.test(String(legacy||'')))endDate=legacy;
    }
    m.stageId=Number(m.stageId||req.stageId||1);
    m.customStartDate=p.startDate;
    m.customEndDate=endDate;
    m.customStartAt=`${p.startDate}T00:00`;
    m.customEndAt=`${endDate}T23:59`;
    m.periodOverride=true;
    m.periodAuthority='requirements';
    m.periodAuthorityMigratedAt=m.periodAuthorityMigratedAt||new Date().toISOString();
    write(key,m);
    return true;
  }

  function ensureOwnPeriods(preserveLegacy=false){
    let changed=0;
    allRequirements().forEach(req=>{if(seedRequirement(req,preserveLegacy))changed++;});
    return changed;
  }

  function isCounted(req){
    if(!req)return false;
    const rules=window.ATOM_REQUIREMENT_PROGRESS_RULES;
    if(rules?.isCounted){try{return Boolean(rules.isCounted(req));}catch{}}
    const activity=window.ATOM_TEAM_ACTIVITY;
    if(activity?.isActive&&!activity.isActive(req.team))return false;
    if(core()?.isRequirementNotActual?.(req.id))return false;
    if(localStorage.getItem(`atom-requirement-not-actual-${req.id}`)==='1')return false;
    return true;
  }

  function stageRows(stageId){
    const id=Number(stageId),rows=[];
    allRequirements().forEach(req=>{if(Number(req.stageId)===id&&isCounted(req))rows.push(req);});
    return rows;
  }

  function stageRange(stageId){
    const c=core();if(!c)return null;
    const id=Number(stageId);
    const rows=stageRows(id);
    const periods=rows.map(requirementPeriod).filter(p=>p&&Number.isFinite(p.start)&&Number.isFinite(p.end));
    if(periods.length){
      const start=Math.min(...periods.map(p=>p.start));
      const end=Math.max(...periods.map(p=>p.end));
      return {stageId:id,start,end,startDate:dateInput(start),endDate:dateInput(end),count:periods.length,source:'requirements'};
    }
    const fallback=staticPeriod({id:`__stage-${id}`,stageId:id});
    return fallback?{stageId:id,start:fallback.start,end:fallback.end,startDate:fallback.startDate,endDate:fallback.endDate,count:0,source:'stage-default'}:null;
  }

  function install(){
    const c=core();if(installed||!c?.periodForRequirement||!c?.addRequirement)return false;

    // One-time migration: every existing row receives its own dates. Legacy Gantt
    // due dates are used only to preserve the currently visible plan during migration.
    ensureOwnPeriods(true);

    c.periodForRequirement=requirementPeriod;
    c.requirementPeriod=requirementPeriod;
    c.stagePeriod=stageRange;

    originalAddRequirement=c.addRequirement.bind(c);
    c.addRequirement=function(){
      const req=originalAddRequirement(...arguments);
      if(req)seedRequirement(req,false);
      return req;
    };

    installed=true;
    window.ATOM_REQUIREMENTS_AUTHORITY={
      version:VERSION,
      isPrimary:true,
      requirementPeriod,
      stageRange,
      stageRows,
      ensureOwnPeriods:()=>ensureOwnPeriods(false)
    };
    window.dispatchEvent(new CustomEvent('atom-requirements-authority-ready',{detail:{version:VERSION}}));
    return true;
  }

  function refreshDerived(){
    if(!installed){install();return;}
    ensureOwnPeriods(false);
    if(location.hash==='#gantt'){
      try{window.render?.('gantt');}catch{}
    }
  }

  ['atom-core-ready','atom-core-data-changed','atom-sync-update','atom-team-activity-changed'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(refreshDerived,0)));
  const timer=setInterval(()=>{if(install())clearInterval(timer);},50);
  setTimeout(()=>clearInterval(timer),5000);
})();