(function(){
  const STATE_KEY='atom-raci-requirement-state-v2';
  const CUSTOM_RACI='atom-raci-custom-requirements-v2';
  const CUSTOM_SOURCES='atom-custom-sources-v1';
  const CUSTOM_DICT='atom-custom-dictionary-v1';
  const BLOCKERS='atom-blockers';
  const BASE_COUNTS={'Коммерческий блок':5,'B2B продажи':8,'B2C продажи':8,'Маркетинг':8,'Сайт':8,'Метрики':8,'1 линия':8,'2 линия':8,'ELMA':11,'Альфа-Авто':12,'1С / финансы':11,'DATA / DWH':11,'BI':10,'ИБ':11};
  let running=false;

  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'')||fallback}catch{return fallback}};
  const setStage=(id,status)=>{
    const key=`atom-stage-status-${id}`;
    const current=localStorage.getItem(key)||'Не начато';
    if(current===status)return false;
    if(status==='Завершено'||current==='Не начато'||current==='Подготовка'||current==='В работе'||current==='Ожидание данных'||current==='На согласовании'){
      localStorage.setItem(key,status);return true;
    }
    return false;
  };

  function raciSummary(){
    const states=read(STATE_KEY,{}),custom=read(CUSTOM_RACI,{}),teams=Array.isArray(DATA?.teams)?DATA.teams:[];
    let total=0,done=0,started=0;
    teams.forEach(([team])=>{
      const vals=Object.values(states[team]||{});
      total+=(BASE_COUNTS[team]||0)+(Array.isArray(custom[team])?custom[team].length:0);
      vals.forEach(s=>{if(s.status&&s.status!=='Не запрошено')started++;if(s.status==='Готово')done++;});
    });
    const owners=window.ATOM_LOGIC?.ownersSummary?.()||{ready:0,total:teams.length};
    return {total,done,started,owners};
  }

  function sourceProgress(){
    const base=Array.isArray(DATA?.sources_list)?DATA.sources_list:[];
    const custom=read(CUSTOM_SOURCES,[]);
    const statuses=[...base.map((_,i)=>localStorage.getItem(`atom-source-status-${i}`)||'Не начато'),...custom.map(x=>localStorage.getItem(`atom-source-status-custom-${x.id}`)||'Не начато')];
    return {total:statuses.length,ready:statuses.filter(x=>x==='Готово').length,started:statuses.filter(x=>x!=='Не начато').length};
  }

  function dictionaryProgress(){
    const base=Array.isArray(DATA?.dictionary)?DATA.dictionary:[];
    const custom=read(CUSTOM_DICT,[]);
    return {total:base.length+custom.length,ready:base.filter((_,i)=>localStorage.getItem(`atom-dictionary-ready-${i}`)==='1').length+custom.filter(x=>x.ready).length};
  }

  function reconcileStages(){
    let changed=false;
    const r=raciSummary();
    if(r.total>0&&r.owners.total>0&&r.owners.ready===r.owners.total&&r.done===r.total)changed=setStage(2,'Завершено')||changed;
    else if(r.owners.ready>0||r.started>0)changed=setStage(2,'В работе')||changed;

    const s=sourceProgress();
    if(s.total&&s.ready===s.total)changed=setStage(3,'Завершено')||changed;
    else if(s.started>0)changed=setStage(3,'В работе')||changed;

    const d=dictionaryProgress();
    if(d.total&&d.ready===d.total)changed=setStage(5,'Завершено')||changed;
    else if(d.ready>0)changed=setStage(5,'В работе')||changed;
    return changed;
  }

  function closeAuto(blocker,comment){
    if(['Решен','Закрыт'].includes(blocker.status))return false;
    blocker.status='Решен';
    blocker.comment=(blocker.comment?blocker.comment+'\n':'')+comment;
    return true;
  }

  function reconcileBlockers(){
    const list=read(BLOCKERS,[]);let changed=false;
    const stages=Array.isArray(DATA?.stages)?DATA.stages:[];
    const sources=Array.isArray(DATA?.sources_list)?DATA.sources_list:[];
    const gantt=window.ATOM_GANTT?.getAllStates?.()||[];
    list.forEach(b=>{
      if(!b.autoKey)return;
      if(b.autoKey.startsWith('Этап: ')){
        const name=b.autoKey.slice(6),stage=stages.find(x=>x.name===name);
        if(stage&&window.ATOM_LOGIC?.stageStatus?.(stage.id)!=='Блокер')changed=closeAuto(b,'Закрыт автоматически: этап больше не находится в статусе «Блокер».')||changed;
      }
      if(b.autoKey.startsWith('Источник: ')){
        const name=b.autoKey.slice(10),i=sources.findIndex(x=>x[0]===name);
        if(i>=0&&(localStorage.getItem(`atom-source-status-${i}`)||'Не начато')!=='Блокер')changed=closeAuto(b,'Закрыт автоматически: источник больше не находится в статусе «Блокер».')||changed;
      }
      if(b.autoKey.startsWith('Гант: ')){
        const name=b.autoKey.slice(6),state=gantt.find(x=>x.name===name);
        if(state&&!state.overdue&&state.status!=='Блокер')changed=closeAuto(b,'Закрыт автоматически: просрочка или блокирующий статус сняты.')||changed;
      }
    });
    if(changed)localStorage.setItem(BLOCKERS,JSON.stringify(list));
    return changed;
  }

  function run(){
    if(running||typeof DATA==='undefined'||!window.ATOM_LOGIC)return;
    running=true;
    try{
      const a=reconcileStages();const b=reconcileBlockers();
      if(a||b)window.dispatchEvent(new CustomEvent('atom-project-reconciled'));
      window.ATOM_LOGIC?.patch?.();
    }finally{running=false;}
  }

  const root=document.getElementById('app');if(root)new MutationObserver(()=>requestAnimationFrame(run)).observe(root,{childList:true,subtree:true});
  window.addEventListener('atom-sync-update',run);
  setInterval(run,20000);
  setTimeout(run,1200);
  window.ATOM_RECONCILE={run,raciSummary,sourceProgress,dictionaryProgress};
})();