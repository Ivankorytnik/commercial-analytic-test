(function(){
  const PROJECT_DAYS=91;
  const AUDIT_KEY='atom-audit-log-v1';
  const STATUS_PROGRESS={
    'Не начато':0,'Подготовка':10,'В работе':40,'Ожидание данных':50,'На согласовании':75,'Завершено':100
  };
  const WATCH_PREFIXES=['atom-stage-status-','atom-source-status-','atom-responsible-','atom-dictionary-ready-','atom-raci-requirement-state-','atom-custom-sources-','atom-custom-dictionary-','atom-blockers','atom-gantt-due-','atom-project-started-at'];
  const previousSet=Storage.prototype.setItem;
  const previousRemove=Storage.prototype.removeItem;
  let writingAudit=false;

  const safeJson=(raw,fallback)=>{try{return JSON.parse(raw||'')||fallback}catch{return fallback}};
  const watched=key=>WATCH_PREFIXES.some(p=>String(key).startsWith(p));
  const stageStatus=id=>localStorage.getItem(`atom-stage-status-${id}`)||'Не начато';
  const sourceStatus=id=>localStorage.getItem(`atom-source-status-${id}`)||'Не начато';
  const started=()=>Boolean(localStorage.getItem('atom-project-started-at'));
  const startTs=()=>Number(localStorage.getItem('atom-project-started-at')||0)||null;

  function appendAudit(key,oldValue,newValue,action){
    if(writingAudit||key===AUDIT_KEY||!watched(key)||oldValue===newValue)return;
    writingAudit=true;
    try{
      const rows=safeJson(localStorage.getItem(AUDIT_KEY),[]);
      rows.push({ts:new Date().toISOString(),key:String(key),action,oldValue:oldValue??null,newValue:newValue??null});
      const trimmed=rows.slice(-1200);
      previousSet.call(localStorage,AUDIT_KEY,JSON.stringify(trimmed));
    }finally{writingAudit=false;}
  }

  Storage.prototype.setItem=function(key,value){
    const old=this===localStorage?this.getItem(key):null;
    if(this===localStorage&&String(key).startsWith('atom-stage-status-')&&String(value)==='Блокер'&&old&&old!=='Блокер'){
      const id=String(key).replace('atom-stage-status-','');
      previousSet.call(localStorage,`atom-stage-prev-status-${id}`,old);
    }
    previousSet.call(this,key,value);
    if(this===localStorage)appendAudit(key,old,String(value),'set');
  };

  Storage.prototype.removeItem=function(key){
    const old=this===localStorage?this.getItem(key):null;
    previousRemove.call(this,key);
    if(this===localStorage)appendAudit(key,old,null,'remove');
  };

  function stageProgress(id){
    if(!started())return 0;
    const status=stageStatus(id);
    if(status==='Блокер'){
      const prev=localStorage.getItem(`atom-stage-prev-status-${id}`)||'Не начато';
      return STATUS_PROGRESS[prev]??0;
    }
    return STATUS_PROGRESS[status]??0;
  }

  function projectProgress(){
    if(!started()||typeof DATA==='undefined'||!Array.isArray(DATA?.stages)||!DATA.stages.length)return 0;
    return Math.round(DATA.stages.reduce((sum,s)=>sum+stageProgress(s.id),0)/DATA.stages.length);
  }

  function ownersSummary(){
    const teams=Array.isArray(DATA?.teams)?DATA.teams:[];
    const ready=teams.filter((_,i)=>{const v=localStorage.getItem(`atom-responsible-${i}`);return v&&v!=='Не назначен';}).length;
    return {ready,total:teams.length};
  }

  function sourcesSummary(){
    const base=Array.isArray(DATA?.sources_list)?DATA.sources_list:[];
    const custom=safeJson(localStorage.getItem('atom-custom-sources-v1'),[]);
    const baseReady=base.filter((_,i)=>sourceStatus(i)==='Готово').length;
    const customReady=custom.filter(x=>(localStorage.getItem(`atom-source-status-custom-${x.id}`)||'Не начато')==='Готово').length;
    return {ready:baseReady+customReady,total:base.length+custom.length};
  }

  function dictionarySummary(){
    const base=Array.isArray(DATA?.dictionary)?DATA.dictionary:[];
    const custom=safeJson(localStorage.getItem('atom-custom-dictionary-v1'),[]);
    const baseReady=base.filter((_,i)=>localStorage.getItem(`atom-dictionary-ready-${i}`)==='1').length;
    const customReady=custom.filter(x=>x.ready).length;
    return {ready:baseReady+customReady,total:base.length+custom.length};
  }

  function activeBlockers(){
    const rows=safeJson(localStorage.getItem('atom-blockers'),[]);
    return rows.filter(x=>!['Решен','Закрыт'].includes(x.status));
  }

  function ganttStates(){
    const states=window.ATOM_GANTT?.getAllStates?.()||[];
    return states.map(s=>({...s,percent:stageProgress(s.id)}));
  }

  function dodEvaluation(){
    const src=sourcesSummary(),own=ownersSummary(),dict=dictionarySummary();
    const idNames=['Lead ID','Client ID','Deal ID','Payment ID'];
    const idsReady=idNames.every(name=>{
      const i=(DATA?.dictionary||[]).findIndex(r=>r[0]===name);
      return i>=0&&localStorage.getItem(`atom-dictionary-ready-${i}`)==='1';
    });
    const stageDone=id=>stageStatus(id)==='Завершено';
    return [
      {ok:src.total>0&&src.ready===src.total,detail:`Источники готовы ${src.ready}/${src.total}`},
      {ok:own.total>0&&own.ready===own.total,detail:`Ответственные назначены ${own.ready}/${own.total}`},
      {ok:stageDone(4),detail:`Этап «Единая воронка»: ${stageStatus(4)}`},
      {ok:dict.total>0&&dict.ready===dict.total,detail:`Data Dictionary готов ${dict.ready}/${dict.total}`},
      {ok:idsReady,detail:'Lead ID, Client ID, Deal ID и Payment ID должны быть подтверждены'},
      {ok:stageDone(7),detail:`Этап «Интеграции»: ${stageStatus(7)}`},
      {ok:stageDone(8),detail:`Этап «DWH и модель данных»: ${stageStatus(8)}`},
      {ok:stageDone(9),detail:`Этап «Контроль качества»: ${stageStatus(9)}`},
      {ok:stageDone(10),detail:`Этап «Единый BI-дашборд»: ${stageStatus(10)}`},
      {ok:stageDone(11),detail:`Этап «Валидация с бизнесом»: ${stageStatus(11)}`},
      {ok:stageDone(10)&&stageDone(9),detail:'Обновление и контроль качества считаются закрытыми после этапов BI и качества'},
      {ok:stageDone(12),detail:`Финальная приемка: ${stageStatus(12)}`}
    ];
  }

  function patchHeader(){
    const p=projectProgress();
    const label=document.getElementById('header-progress');
    const bar=document.getElementById('header-progress-bar');
    if(label)label.textContent=`${p}%`;
    if(bar)bar.style.width=`${p}%`;
  }

  function patchGantt(){
    document.querySelectorAll('.gantt-row').forEach(row=>{
      const id=Number(row.querySelector('.gantt-details-btn')?.dataset.id||0);
      if(!id)return;
      const pct=stageProgress(id);
      const cell=row.querySelector('.gantt-meta .gantt-cell:nth-child(2)');
      if(cell){
        const b=cell.querySelector('b');if(b)b.textContent=`${pct}%`;
        const mini=cell.querySelector('.gantt-mini-progress > span');if(mini)mini.style.width=`${pct}%`;
      }
      const label=row.querySelector('.gantt-bar-label');if(label)label.textContent=`${pct}%`;
    });
  }

  function patch(){patchHeader();patchGantt();}
  const observer=new MutationObserver(()=>requestAnimationFrame(patch));
  observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('atom-sync-update',patch);

  window.ATOM_LOGIC={
    PROJECT_DAYS,stageStatus,stageProgress,projectProgress,ownersSummary,sourcesSummary,dictionarySummary,
    activeBlockers,ganttStates,dodEvaluation,audit:()=>safeJson(localStorage.getItem(AUDIT_KEY),[]),patch
  };
  patch();
})();