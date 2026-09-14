(function(){
  const VERSION='1.0.0';
  const NOT_ACTUAL='__not_actual__';
  const QUEUE='__inactive__';
  let installed=false;
  let original={};

  const core=()=>window.ATOM_CORE;
  const activity=()=>window.ATOM_TEAM_ACTIVITY;
  const norm=s=>String(s||'').trim().toLowerCase();
  const excludedLabel=id=>norm(localStorage.getItem(`atom-requirement-excluded-label-${id}`));
  const manualStatus=id=>{try{return JSON.parse(localStorage.getItem(`atom-requirement-status-manual-${id}`)||'null')}catch{return null}};

  function effectiveStatus(req){
    const c=core();
    const manual=manualStatus(req.id);
    if(manual?.value)return manual.value;
    if(localStorage.getItem(`atom-requirement-not-actual-${req.id}`)==='1'){
      const label=excludedLabel(req.id);
      return (label==='в очереди'||label==='не активно')?QUEUE:NOT_ACTUAL;
    }
    return c?.getState?.(req.id)?.statusId||'not_requested';
  }

  function isCounted(req){
    if(!req)return false;
    if(activity()?.isActive&&!activity().isActive(req.team))return false;
    const status=effectiveStatus(req);
    return ![NOT_ACTUAL,QUEUE,'done'].includes(status);
  }

  function rawByTeam(team){
    if(original.requirementsByTeam)return original.requirementsByTeam(team)||[];
    return [];
  }
  function rawByStage(stageId){
    if(original.requirementsByStage)return original.requirementsByStage(stageId)||[];
    return [];
  }
  function countedByTeam(team){return rawByTeam(team).filter(isCounted);}
  function countedByStage(stageId){return rawByStage(stageId).filter(isCounted);}

  function requirementProgress(id){
    const c=core(),req=c?.requirement?.(id);
    if(!isCounted(req))return 0;
    return original.requirementProgress?original.requirementProgress(id):0;
  }

  function requirementProblem(reqOrId){
    const c=core(),req=typeof reqOrId==='string'?c?.requirement?.(reqOrId):reqOrId;
    if(!isCounted(req))return false;
    return original.requirementProblem?original.requirementProblem(req):false;
  }

  function teamSummary(team){
    const c=core(),rows=countedByTeam(team),states=rows.map(r=>c.getState(r.id));
    const total=rows.length;
    const progress=total?Math.round(rows.reduce((n,r)=>n+requirementProgress(r.id),0)/total):0;
    const all=rawByTeam(team);
    return {
      team,
      teamId:c.TEAM_IDS?.[team]||team,
      total,
      progress,
      done:0,
      work:states.filter(x=>x.statusId!=='not_requested').length,
      problem:rows.filter(requirementProblem).length,
      owner:c.teamOwner(team),
      active:activity()?.isActive?activity().isActive(team):true,
      excluded:activity()?.isActive?!activity().isActive(team):false,
      excludedDone:all.filter(r=>effectiveStatus(r)==='done').length,
      excludedQueue:all.filter(r=>effectiveStatus(r)===QUEUE).length,
      excludedNotActual:all.filter(r=>effectiveStatus(r)===NOT_ACTUAL).length
    };
  }

  function linkedSummary(stageId){
    const rows=countedByStage(stageId);
    if(!rows.length)return{total:0,progress:0,problem:false,done:0};
    return {
      total:rows.length,
      progress:Math.round(rows.reduce((n,r)=>n+requirementProgress(r.id),0)/rows.length),
      problem:rows.some(requirementProblem),
      done:0
    };
  }

  function avg(parts){const x=parts.filter(Number.isFinite);return x.length?Math.round(x.reduce((a,b)=>a+b,0)/x.length):0;}

  function stageRelevant(stageId){
    const c=core();stageId=Number(stageId);
    if((activity()?.activeCount?.()??1)===0)return false;
    if(countedByStage(stageId).length)return true;
    if(stageId===2)return (c.ownersSummary?.().total||0)>0;
    if(stageId===3)return (c.sourcesSummary?.().total||0)>0;
    if(stageId===5)return (c.dictionarySummary?.().total||0)>0;
    if(stageId===6)return (c.criticalIdsSummary?.().total||0)>0;
    if(stageId===7)return (c.sourcesSummary?.().total||0)>0;
    return false;
  }

  function stageSummary(stageId){
    const c=core();stageId=Number(stageId);
    const linked=linkedSummary(stageId),relevant=stageRelevant(stageId);
    if(!relevant)return{id:stageId,name:c.stageName(stageId),progress:0,status:'В очереди',problem:false,relevant:false,linked};
    let progress=linked.total?linked.progress:0,problem=linked.problem;
    if(stageId===2){const x=c.ownersSummary();progress=x.total?Math.round(x.ready/x.total*100):0;problem=false;}
    if(stageId===3){const x=c.sourcesSummary();progress=x.total?Math.round(x.identified/x.total*100):0;problem=x.problem>0;}
    if(stageId===5){const d=c.dictionarySummary();progress=avg([linked.total?linked.progress:NaN,d.total?Math.round(d.ready/d.total*100):NaN]);}
    if(stageId===6){const x=c.criticalIdsSummary();progress=avg([linked.total?linked.progress:NaN,x.total?Math.round(x.ready/x.total*100):NaN]);}
    if(stageId===7){const s=c.sourcesSummary();progress=avg([linked.total?linked.progress:NaN,s.total?Math.round(s.ready/s.total*100):NaN]);problem=problem||s.problem>0;}
    const g=window.ATOM_GANTT?.getTaskState?.(stageId),started=Boolean(localStorage.getItem('atom-project-started-at'));
    if(progress<100&&started&&g?.due&&Date.now()>Number(g.due))problem=true;
    const status=progress>=100?'Завершено':problem?'Блокер':progress<=0?'Не начато':'В работе';
    return{id:stageId,name:c.stageName(stageId),progress,status,problem,relevant:true,linked};
  }

  function projectProgress(){
    const stages=Array.from({length:12},(_,i)=>stageSummary(i+1)).filter(x=>x.relevant);
    return stages.length?Math.round(stages.reduce((n,x)=>n+x.progress,0)/stages.length):0;
  }

  function install(){
    const c=core();if(installed||!c)return;
    original={
      requirementsByTeam:c.requirementsByTeam?.bind(c),
      requirementsByStage:c.requirementsByStage?.bind(c),
      requirementProgress:c.requirementProgress?.bind(c),
      requirementProblem:c.requirementProblem?.bind(c)
    };
    c.requirementProgress=requirementProgress;
    c.requirementProblem=requirementProblem;
    c.teamSummary=teamSummary;
    c.linkedSummary=linkedSummary;
    c.stageSummary=stageSummary;
    c.projectProgress=projectProgress;
    c.isRequirementCounted=isCounted;
    c.countedRequirementsByTeam=countedByTeam;
    c.countedRequirementsByStage=countedByStage;
    installed=true;
    window.dispatchEvent(new CustomEvent('atom-project-progress-rules-ready',{detail:{version:VERSION}}));
  }

  function refresh(){install();if(!installed)return;window.dispatchEvent(new CustomEvent('atom-view-rendered'));}
  ['atom-core-ready','atom-core-data-changed','atom-team-activity-changed','atom-reference-data-changed','hashchange'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(install,0)));
  window.ATOM_REQUIREMENT_PROGRESS_RULES={version:VERSION,install,isCounted,effectiveStatus,projectProgress};
  setTimeout(install,900);setTimeout(install,1800);
})();