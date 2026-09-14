(function(){
  const VERSION='1.0.0';
  let queued=false;

  const pad=n=>String(n).padStart(2,'0');
  const toDateTime=(value,end=false)=>{
    if(!value)return'';
    const s=String(value);
    if(s.includes('T'))return s.slice(0,16);
    return `${s}T${end?'23:59':'00:00'}`;
  };
  const fromTs=(ts,end=false)=>{
    const d=new Date(Number(ts));
    if(!Number.isFinite(d.getTime()))return'';
    if(end&&d.getHours()===0&&d.getMinutes()===0)d.setHours(23,59,0,0);
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  function defaultsForStage(stageId){
    const c=window.ATOM_CORE;
    const id=Number(stageId)||1;
    let p=null;
    try{p=c?.periodForRequirement?.({id:'__new_time_form__',stageId:id,custom:false})||null;}catch{}
    if(!p){
      const g=window.ATOM_GANTT?.getTaskState?.(id);
      if(g)p={start:g.start,due:g.due,startDate:g.startDate,endDate:g.endDate};
    }
    let start='',end='';
    if(Number.isFinite(Number(p?.start)))start=fromTs(p.start,false);
    else if(p?.startDate)start=toDateTime(p.startDate,false);
    if(Number.isFinite(Number(p?.end)))end=fromTs(p.end,true);
    else if(Number.isFinite(Number(p?.due)))end=fromTs(p.due,true);
    else if(p?.endDate)end=toDateTime(p.endDate,true);
    return{start,end};
  }

  function ensureInputs(){
    if(!location.hash.startsWith('#management/requirements'))return;
    const start=document.getElementById('req-enh-new-start');
    const end=document.getElementById('req-enh-new-end');
    if(!start||!end)return;

    const currentStart=start.value;
    const currentEnd=end.value;
    if(start.type!=='datetime-local')start.type='datetime-local';
    if(end.type!=='datetime-local')end.type='datetime-local';
    start.step='60';
    end.step='60';

    const stage=document.getElementById('req-enh-new-stage');
    const d=defaultsForStage(stage?.value||1);
    if(currentStart)start.value=toDateTime(currentStart,false);
    else if(!start.value)start.value=d.start;
    if(currentEnd)end.value=toDateTime(currentEnd,true);
    else if(!end.value)end.value=d.end;

    const startLabel=start.closest('.pa-field')?.querySelector('label');
    const endLabel=end.closest('.pa-field')?.querySelector('label');
    if(startLabel)startLabel.textContent='Начало: дата и время';
    if(endLabel)endLabel.textContent='Окончание: дата и время';

    start.required=true;
    end.required=true;
    start.title='Укажите дату и время начала';
    end.title='Укажите дату и время окончания';
  }

  function refreshStageDefaults(){
    const stage=document.getElementById('req-enh-new-stage');
    const start=document.getElementById('req-enh-new-start');
    const end=document.getElementById('req-enh-new-end');
    if(!stage||!start||!end)return;
    const d=defaultsForStage(stage.value);
    if(d.start)start.value=d.start;
    if(d.end)end.value=d.end;
  }

  document.addEventListener('change',e=>{
    if(!e.target.closest('#req-enh-new-stage'))return;
    setTimeout(()=>{ensureInputs();refreshStageDefaults();},0);
  });

  function patch(){ensureInputs();}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;patch();});}
  new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});
  ['hashchange','atom-view-rendered','atom-sync-update','atom-core-data-changed'].forEach(ev=>window.addEventListener(ev,queue));
  window.ATOM_REQUIREMENTS_TIME_FORM_FIX={version:VERSION,patch};
  setTimeout(queue,200);setTimeout(queue,700);setTimeout(queue,1500);
})();