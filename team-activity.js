(function(){
  if(window.ATOM_TEAM_ACTIVITY?.version)return;

  const VERSION='1.0.0';
  const KEY_PREFIX='atom-team-active-';
  let core=null;
  let patched=false;
  let originalGantt=null;
  const original={};

  const read=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||'');return v??f}catch{return f}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  function teamId(team){return core?.TEAM_IDS?.[team]||String(team||'').toLowerCase().replace(/[^a-zа-я0-9]+/gi,'-')}
  function key(team){return `${KEY_PREFIX}${teamId(team)}`}
  function isActive(team){return localStorage.getItem(key(team))!=='0'}
  function activeTeams(){return (core?.teams?.()||[]).filter(isActive)}
  function activeCount(){return activeTeams().length}
  function setActive(team,value){
    localStorage.setItem(key(team),value?'1':'0');
    applyCalculatedStatuses();
    reconcileInactiveBlockers();
    window.dispatchEvent(new CustomEvent('atom-team-activity-changed',{detail:{team,active:Boolean(value)}}));
    window.dispatchEvent(new CustomEvent('atom-core-data-changed',{detail:{type:'team-activity',team,active:Boolean(value)}}));
    refreshCurrentView();
  }

  function allRequirements(){return original.requirements?original.requirements():[]}
  function activeRequirements(){return allRequirements().filter(r=>isActive(r.team))}
  function activeRequirementsByStage(stageId){return activeRequirements().filter(r=>Number(r.stageId)===Number(stageId))}
  function avg(parts){const x=parts.filter(Number.isFinite);return x.length?Math.round(x.reduce((a,b)=>a+b,0)/x.length):0}

  function linkedSummary(stageId){
    const rows=activeRequirementsByStage(stageId);
    if(!rows.length)return{total:0,progress:0,problem:false,done:0};
    return {
      total:rows.length,
      progress:Math.round(rows.reduce((n,r)=>n+original.requirementProgress(r.id),0)/rows.length),
      problem:rows.some(r=>original.requirementProblem(r)),
      done:rows.filter(r=>core.getState(r.id).statusId==='done').length
    };
  }

  function ownersSummary(){
    const rows=(Array.isArray(DATA?.teams)?DATA.teams:[]).filter(r=>isActive(r[0]));
    const ready=rows.filter(r=>{
      const i=(DATA?.teams||[]).findIndex(x=>x[0]===r[0]);
      const v=i>=0?localStorage.getItem(`atom-responsible-${i}`):'';
      return v&&v!=='Не назначен';
    }).length;
    return{ready,total:rows.length};
  }

  function stageRelevant(stageId){
    if(!activeCount())return false;
    const linked=activeRequirementsByStage(stageId);
    if(linked.length)return true;
    if(stageId===2)return ownersSummary().total>0;
    if(stageId===3)return (original.sourcesSummary?.().total||0)>0;
    if(stageId===5)return (original.dictionarySummary?.().total||0)>0;
    if(stageId===6)return (original.criticalIdsSummary?.().total||0)>0;
    if(stageId===7)return (original.sourcesSummary?.().total||0)>0;
    return false;
  }

  function stageSummary(stageId){
    stageId=Number(stageId);
    const linked=linkedSummary(stageId);
    const relevant=stageRelevant(stageId);
    if(!relevant)return{id:stageId,name:core.stageName(stageId),progress:0,status:'Не активно',problem:false,relevant:false,linked};

    let progress=linked.total?linked.progress:0;
    let problem=linked.problem;

    if(stageId===2){
      const x=ownersSummary();
      progress=x.total?Math.round(x.ready/x.total*100):0;
      problem=false;
    }
    if(stageId===3){
      const x=original.sourcesSummary();
      progress=x.total?Math.round(x.identified/x.total*100):0;
      problem=x.problem>0;
    }
    if(stageId===5){
      const d=original.dictionarySummary();
      progress=avg([linked.total?linked.progress:NaN,d.total?Math.round(d.ready/d.total*100):NaN]);
    }
    if(stageId===6){
      const c=original.criticalIdsSummary();
      progress=avg([linked.total?linked.progress:NaN,c.total?Math.round(c.ready/c.total*100):NaN]);
    }
    if(stageId===7){
      const s=original.sourcesSummary();
      progress=avg([linked.total?linked.progress:NaN,s.total?Math.round(s.ready/s.total*100):NaN]);
      problem=problem||s.problem>0;
    }

    const g=window.ATOM_GANTT?.getTaskState?.(stageId);
    const started=Boolean(localStorage.getItem('atom-project-started-at'));
    if(progress<100&&started&&g?.due&&Date.now()>Number(g.due))problem=true;
    const status=progress>=100?'Завершено':problem?'Блокер':progress<=0?'Не начато':'В работе';
    return{id:stageId,name:core.stageName(stageId),progress,status,problem,relevant:true,linked};
  }

  function projectProgress(){
    const rows=Array.from({length:12},(_,i)=>stageSummary(i+1)).filter(x=>x.relevant);
    return rows.length?Math.round(rows.reduce((n,x)=>n+x.progress,0)/rows.length):0;
  }

  function teamSummary(team){
    const base=original.teamSummary(team);
    return {...base,active:isActive(team),excluded:!isActive(team)};
  }

  function requirementProblem(reqOrId){
    const req=typeof reqOrId==='string'?original.requirement(reqOrId):reqOrId;
    if(req&&!isActive(req.team))return false;
    return original.requirementProblem(reqOrId);
  }

  function requirementOverdue(reqOrId){
    const req=typeof reqOrId==='string'?original.requirement(reqOrId):reqOrId;
    if(req&&!isActive(req.team))return false;
    return original.requirementOverdue(reqOrId);
  }

  function dodEvaluation(){
    const src=original.sourcesSummary(),own=ownersSummary(),dict=original.dictionarySummary();
    const rows=Array.isArray(DATA?.dictionary)?DATA.dictionary:[];
    const ids=['Lead ID','Client ID','Deal ID'];
    const idsReady=ids.every(name=>{const i=rows.findIndex(r=>r[0]===name);return i>=0&&localStorage.getItem(`atom-dictionary-ready-${i}`)==='1'});
    const done=id=>{const s=stageSummary(id);return !s.relevant||s.progress>=100};
    return [
      {ok:src.total>0&&src.identified===src.total,detail:`Источники определены ${src.identified}/${src.total}`},
      {ok:own.total===0||own.ready===own.total,detail:`Ответственные назначены ${own.ready}/${own.total} активных команд`},
      {ok:done(4),detail:`Единая воронка: ${stageSummary(4).relevant?stageSummary(4).progress+'%':'не активна'}`},
      {ok:dict.total>0&&dict.ready===dict.total,detail:`Data Dictionary готов ${dict.ready}/${dict.total}`},
      {ok:idsReady,detail:'Подтверждены Lead ID, Client ID и Deal ID'},
      {ok:done(7),detail:`Интеграции: ${stageSummary(7).relevant?stageSummary(7).progress+'%':'не активны'}`},
      {ok:done(8),detail:`DWH и модель данных: ${stageSummary(8).relevant?stageSummary(8).progress+'%':'не активны'}`},
      {ok:done(9),detail:`Контроль качества: ${stageSummary(9).relevant?stageSummary(9).progress+'%':'не активен'}`},
      {ok:done(10),detail:`Единый BI-дашборд: ${stageSummary(10).relevant?stageSummary(10).progress+'%':'не активен'}`},
      {ok:done(11),detail:`Валидация с бизнесом: ${stageSummary(11).relevant?stageSummary(11).progress+'%':'не активна'}`},
      {ok:done(7)&&done(10),detail:'Активные интеграции и BI работают в автоматическом контуре'},
      {ok:done(12),detail:`Финальная приемка: ${stageSummary(12).relevant?stageSummary(12).progress+'%':'не активна'}`}
    ];
  }

  function applyCalculatedStatuses(){
    if(!core)return;
    for(let id=1;id<=12;id++){
      const s=stageSummary(id);
      localStorage.setItem(`atom-stage-status-${id}`,s.relevant?s.status:'Завершено');
    }
  }

  function reconcileInactiveBlockers(){
    const rows=read('atom-blockers',[]);
    let changed=false;
    rows.forEach(b=>{
      if(b.autoKey?.startsWith('CORE:RACI:')){
        const id=b.autoKey.slice('CORE:RACI:'.length),req=original.requirement(id);
        if(req&&!isActive(req.team)&&!['Решен','Закрыт'].includes(b.status)){
          b.status='Решен';
          if(!String(b.comment||'').includes('Команда не активна'))b.comment=(b.comment?b.comment+'\n':'')+'Команда не активна и исключена из расчета проекта.';
          changed=true;
        }
      }
      if(b.autoKey?.startsWith('Гант: ')){
        const name=b.autoKey.slice('Гант: '.length),task=window.ATOM_GANTT?.tasks?.find(x=>x.name===name);
        if(task&&!stageRelevant(task.id)&&!['Решен','Закрыт'].includes(b.status)){
          b.status='Решен';
          if(!String(b.comment||'').includes('Этап исключен'))b.comment=(b.comment?b.comment+'\n':'')+'Этап исключен из расчета, так как связанных активных команд нет.';
          changed=true;
        }
      }
    });
    if(changed)write('atom-blockers',rows);
  }

  function patchCore(){
    if(patched||!window.ATOM_CORE)return false;
    core=window.ATOM_CORE;
    ['requirements','requirement','requirementsByStage','requirementProgress','requirementProblem','requirementOverdue','teamSummary','ownersSummary','sourcesSummary','dictionarySummary','criticalIdsSummary','linkedSummary','stageSummary','projectProgress','dodEvaluation','reconcile'].forEach(k=>original[k]=core[k]?.bind(core));
    if(!original.requirements||!original.stageSummary)return false;

    core.requirements=activeRequirements;
    core.requirementsByStage=activeRequirementsByStage;
    core.requirementProblem=requirementProblem;
    core.requirementOverdue=requirementOverdue;
    core.teamSummary=teamSummary;
    core.ownersSummary=ownersSummary;
    core.linkedSummary=linkedSummary;
    core.stageSummary=stageSummary;
    core.projectProgress=projectProgress;
    core.dodEvaluation=dodEvaluation;
    core.isTeamActive=isActive;
    core.activeTeams=activeTeams;
    core.reconcile=function(){
      const changed=original.reconcile?original.reconcile():false;
      applyCalculatedStatuses();
      reconcileInactiveBlockers();
      return changed;
    };

    patched=true;
    applyCalculatedStatuses();
    reconcileInactiveBlockers();
    wrapGantt();
    return true;
  }

  function wrapGantt(){
    if(originalGantt||typeof window.gantt!=='function')return;
    originalGantt=window.gantt;
    window.gantt=function(){
      applyCalculatedStatuses();
      reconcileInactiveBlockers();
      return originalGantt.apply(this,arguments);
    };
  }

  function styles(){
    if(document.getElementById('team-activity-css'))return;
    const s=document.createElement('style');s.id='team-activity-css';s.textContent=`
      .team-active-cell{min-width:92px;text-align:center!important;vertical-align:middle!important}.team-active-toggle{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;font-size:10px;font-weight:700;color:#425959}.team-active-toggle input{width:16px!important;height:16px;margin:0}.pa-team-inactive{background:#f3f5f5!important;color:#7a898a}.pa-team-inactive td{opacity:.72}.pa-team-inactive .team-active-cell{opacity:1}.core-team-card.team-inactive{background:#f1f3f3!important;border-color:#c8d1d1!important;opacity:.72}.core-team-card.team-inactive .core-team-pct{font-size:12px;color:#6b7a7b}.team-inactive-badge{display:inline-flex;margin-top:6px;padding:3px 6px;border-radius:999px;background:#dde3e3;color:#5d6a6b;font-size:9px;font-weight:700}.gantt-row.team-stage-inactive{opacity:.48}.gantt-row.team-stage-inactive .gantt-bar{background:#d7dede!important;box-shadow:none}.gantt-row.team-stage-inactive .gantt-status-badge{background:#e7ebeb!important;color:#6b7778!important}.gantt-row.team-stage-inactive .gantt-details-btn{opacity:.55}
    `;document.head.appendChild(s);
  }

  function patchManagementTeams(){
    if(!location.hash.startsWith('#management/teams'))return;
    const table=document.querySelector('#pa-panel .pa-table');
    if(!table||table.dataset.teamActivityPatched==='1')return;
    const head=table.querySelector('thead tr');
    if(!head)return;
    const h=document.createElement('th');h.textContent='Активна';h.className='team-active-cell';head.insertBefore(h,head.children[1]||null);
    table.querySelectorAll('tbody tr').forEach(row=>{
      const team=row.children[0]?.textContent.trim();
      if(!team)return;
      const td=document.createElement('td');td.className='team-active-cell';
      td.innerHTML=`<label class="team-active-toggle"><input type="checkbox" data-team-active="${esc(team)}" ${isActive(team)?'checked':''}><span>${isActive(team)?'Да':'Нет'}</span></label>`;
      row.insertBefore(td,row.children[1]||null);
      row.classList.toggle('pa-team-inactive',!isActive(team));
    });
    table.dataset.teamActivityPatched='1';

    const firstKpi=document.querySelector('#pa-panel .pa-kpi');
    if(firstKpi){const b=firstKpi.querySelector('b');if(b)b.textContent=`${activeCount()} / ${core.teams().length}`;const span=firstKpi.querySelector('span');if(span)span.textContent='Активные команды';}
  }

  function patchOverviewCards(){
    if(!core)return;
    document.querySelectorAll('.core-team-card').forEach(card=>{
      const team=card.querySelector('.core-team-name')?.textContent.trim();
      if(!team)return;
      const inactive=!isActive(team);
      card.classList.toggle('team-inactive',inactive);
      const pct=card.querySelector('.core-team-pct');
      if(pct) pct.textContent=inactive?'Не активна':`${core.teamSummary(team).progress}%`;
      let badge=card.querySelector('.team-inactive-badge');
      if(inactive&&!badge){badge=document.createElement('span');badge.className='team-inactive-badge';badge.textContent='Исключена из Ганта';card.appendChild(badge);}
      if(!inactive&&badge)badge.remove();
    });
  }

  function patchGantt(){
    if(!core||!document.querySelector('.gantt-dashboard'))return;
    const summaries=Array.from({length:12},(_,i)=>stageSummary(i+1));
    const relevant=summaries.filter(x=>x.relevant);
    const counts={work:0,problem:0,done:0,notstarted:0};
    relevant.forEach(s=>{if(s.problem)counts.problem++;else if(s.progress>=100)counts.done++;else if(s.progress>0)counts.work++;else counts.notstarted++;});

    document.querySelectorAll('.gantt-row').forEach(row=>{
      const name=row.querySelector('.gantt-name-cell b')?.textContent.trim();
      const task=window.ATOM_GANTT?.tasks?.find(x=>x.name===name);
      if(!task)return;
      const s=stageSummary(task.id),inactive=!s.relevant;
      row.classList.toggle('team-stage-inactive',inactive);
      const cells=row.querySelectorAll('.gantt-meta .gantt-cell');
      const pct=cells[1]?.querySelector(':scope > b');if(pct)pct.textContent=inactive?'0%':`${s.progress}%`;
      const badge=cells[1]?.querySelector('.gantt-status-badge');if(badge){badge.textContent=inactive?'Не активно':s.status;badge.className=`gantt-status-badge ${inactive?'notstarted':s.problem?'problem':s.progress>=100?'done':s.progress>0?'work':'notstarted'}`;}
      const mini=cells[1]?.querySelector('.gantt-mini-progress > span');if(mini)mini.style.width=`${inactive?0:s.progress}%`;
      row.querySelectorAll('.gantt-bar-label').forEach(x=>x.textContent=inactive?'Не активно':`${s.progress}%`);
    });

    const kpis=document.querySelectorAll('.gantt-kpi b');
    if(kpis[0])kpis[0].textContent=String(relevant.length);
    if(kpis[1])kpis[1].textContent=String(counts.work);
    if(kpis[2])kpis[2].textContent=String(counts.problem);
    if(kpis[3])kpis[3].textContent=String(counts.done);

    document.querySelectorAll('.gantt-filter-btn').forEach(btn=>{
      const f=btn.dataset.filter;
      const label=f==='all'?'Все':f==='work'?'В работе':f==='problem'?'Проблемные':f==='done'?'Завершено':f==='notstarted'?'Не начато':'';
      const n=f==='all'?relevant.length:counts[f]??0;
      if(label)btn.textContent=`${label} ${n}`;
    });
  }

  function patchRoadmapInactive(){
    if(!core)return;
    document.querySelectorAll('#app table.table tbody tr').forEach(row=>{
      const id=Number(row.children[0]?.textContent||0);if(!id||id>12)return;
      const s=stageSummary(id);
      if(!s.relevant){row.style.opacity='.55';const sel=row.querySelector('.stage-status-select');if(sel)sel.disabled=true;}
    });
  }

  function patchDom(){
    if(!patchCore())return;
    wrapGantt();
    patchManagementTeams();
    patchOverviewCards();
    patchGantt();
    patchRoadmapInactive();
  }

  function refreshCurrentView(){
    const h=decodeURIComponent(location.hash.slice(1));
    if(h==='expanded-gantt'){setTimeout(()=>window.ATOM_CORE_UI?.renderExpanded?.(),0);return;}
    if(h.startsWith('management/')){setTimeout(()=>window.ATOM_PROJECT_ADMIN?.open?.(),0);return;}
    const activeNav=document.querySelector('.nav.active');
    if(activeNav?.dataset.view&&typeof window.render==='function')setTimeout(()=>window.render(activeNav.dataset.view),0);
    setTimeout(patchDom,40);
  }

  document.addEventListener('change',e=>{
    const cb=e.target.closest('[data-team-active]');
    if(!cb)return;
    const team=cb.dataset.teamActive;
    cb.closest('label')?.querySelector('span')?.replaceChildren(document.createTextNode(cb.checked?'Да':'Нет'));
    setActive(team,cb.checked);
  });

  let queued=false;
  function queuePatch(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;patchDom();});}
  const mo=new MutationObserver(queuePatch);mo.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('atom-core-ready',queuePatch);
  window.addEventListener('atom-sync-update',()=>{applyCalculatedStatuses();reconcileInactiveBlockers();queuePatch();});
  window.addEventListener('hashchange',queuePatch);
  window.addEventListener('atom-view-rendered',queuePatch);

  styles();
  window.ATOM_TEAM_ACTIVITY={version:VERSION,isActive,setActive,activeTeams,activeCount,stageRelevant,stageSummary,refresh:refreshCurrentView};
  setTimeout(queuePatch,800);
})();