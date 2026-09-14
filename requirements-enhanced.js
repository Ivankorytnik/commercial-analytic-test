(function(){
  const VERSION='1.1.0';
  const ALL='__all__';
  const NOT_ACTUAL='__not_actual__';
  const DAY=86400000;
  let selectedTeam=ALL;
  let patchedCore=false;
  let original={};

  const core=()=>window.ATOM_CORE;
  const activity=()=>window.ATOM_TEAM_ACTIVITY;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const fmt=v=>{if(!v)return'Не задано';const p=String(v).split('-');return p.length===3?`${p[2]}.${p[1]}.${p[0]}`:String(v)};
  const relKey=id=>`atom-requirement-not-actual-${id}`;
  const metaKey=id=>`atom-core-requirement-meta-${id}`;
  const isNotActual=id=>localStorage.getItem(relKey(id))==='1';
  const isTeamActive=team=>activity()?.isActive?activity().isActive(team):true;
  const isCounted=req=>Boolean(req)&&!isNotActual(req.id)&&isTeamActive(req.team);
  const todayStart=()=>{const d=new Date();d.setHours(0,0,0,0);return d.getTime()};
  const dueTs=p=>{if(!p?.endDate)return Number.MAX_SAFE_INTEGER;const d=new Date(`${p.endDate}T00:00:00`);return Number.isFinite(d.getTime())?d.getTime():Number.MAX_SAFE_INTEGER};
  const daysToDue=p=>Math.round((dueTs(p)-todayStart())/DAY);
  const readMeta=id=>{try{return JSON.parse(localStorage.getItem(metaKey(id))||'null')}catch{return null}};

  function styles(){
    if(document.getElementById('requirements-enhanced-css'))return;
    const s=document.createElement('style');s.id='requirements-enhanced-css';s.textContent=`
      .req-enh-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.req-enh-toolbar-left{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.req-enh-toolbar select{padding:8px;border:1px solid var(--line);border-radius:7px;background:#fff;font:inherit;font-size:11px}.req-enh-summary{font-size:10px;color:var(--muted)}
      .req-enh-table{min-width:1420px}.req-enh-overdue{background:#fff0ed!important}.req-enh-overdue td{border-bottom-color:#f2c5bc!important}.req-enh-not-actual{background:#f3f5f5!important;color:#7b8889}.req-enh-not-actual td{opacity:.76}.req-enh-not-actual select,.req-enh-not-actual textarea{opacity:1}.req-enh-team-inactive td:first-child{box-shadow:inset 3px 0 0 #c4cece}.req-enh-team-note{display:block;margin-top:3px;font-size:8px;color:#7b8a8b}.req-enh-due{font-weight:700;white-space:nowrap}.req-enh-due.overdue{color:#b23c2f}.req-enh-due.done{color:#25715a}.req-enh-due.na{color:#6d7b7c}.req-enh-period{white-space:nowrap}.req-enh-add{display:grid;grid-template-columns:minmax(220px,1fr) 180px 210px 150px 150px auto;gap:8px;align-items:end;background:#fff;border:1px solid var(--line);border-radius:10px;padding:10px}.req-enh-add .pa-field input,.req-enh-add .pa-field select{width:100%;box-sizing:border-box;padding:8px;border:1px solid var(--line);border-radius:7px;background:#fff;font:inherit;font-size:11px}.req-enh-raci-na{background:#f3f5f5!important;color:#7b8889}.req-enh-raci-na td{opacity:.75}.req-enh-raci-na select,.req-enh-raci-na textarea{opacity:1}
      @media(max-width:1100px){.req-enh-add{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:700px){.req-enh-add{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function rawRowsForTeam(team){
    const c=core();if(!c)return[];
    return c.requirementsByTeam(team)||[];
  }
  function allDisplayRows(){
    const c=core();if(!c)return[];
    const teams=c.teams?.()||[];
    return teams.flatMap(team=>rawRowsForTeam(team));
  }
  function displayRows(){
    const rows=selectedTeam===ALL?allDisplayRows():rawRowsForTeam(selectedTeam);
    return rows.map((req,index)=>({req,index,p:core().periodForRequirement(req)})).sort((a,b)=>dueTs(a.p)-dueTs(b.p)||a.index-b.index);
  }

  function closeNotActualBlockers(){
    let rows=[];try{rows=JSON.parse(localStorage.getItem('atom-blockers')||'[]')||[]}catch{}
    let changed=false;
    rows.forEach(b=>{
      if(!String(b.autoKey||'').startsWith('CORE:RACI:'))return;
      const id=String(b.autoKey).slice('CORE:RACI:'.length);
      if(isNotActual(id)&&!['Решен','Закрыт'].includes(b.status)){
        b.status='Решен';
        const note='Требование отмечено как «Не актуально» и исключено из логики проекта.';
        if(!String(b.comment||'').includes(note))b.comment=(b.comment?b.comment+'\n':'')+note;
        changed=true;
      }
    });
    if(changed)localStorage.setItem('atom-blockers',JSON.stringify(rows));
  }

  function setNotActual(id,value){
    if(value)localStorage.setItem(relKey(id),'1');else localStorage.removeItem(relKey(id));
    closeNotActualBlockers();
    core()?.reconcile?.();
    window.dispatchEvent(new CustomEvent('atom-core-data-changed',{detail:{type:'requirement-relevance',id,notActual:Boolean(value)}}));
  }

  function periodForRequirement(reqOrId){
    const c=core(),req=typeof reqOrId==='string'?c.requirement(reqOrId):reqOrId;
    if(!req)return null;
    if(req.custom){
      const meta=readMeta(req.id)||req;
      const startDate=meta.customStartDate||'';
      const endDate=meta.customEndDate||'';
      if(startDate&&endDate){
        const start=new Date(`${startDate}T00:00:00`).getTime();
        const end=new Date(`${endDate}T00:00:00`).getTime();
        return {start,end,startDate,endDate,stageId:req.stageId,stageName:c.stageName(req.stageId),changed:true,customDates:true};
      }
    }
    return original.periodForRequirement?original.periodForRequirement(req):null;
  }

  function avg(parts){const x=parts.filter(Number.isFinite);return x.length?Math.round(x.reduce((a,b)=>a+b,0)/x.length):0}
  function currentRequirements(){return (original.requirements?original.requirements():[]).filter(r=>!isNotActual(r.id))}
  function currentRequirementsByStage(stageId){return (original.requirementsByStage?original.requirementsByStage(stageId):[]).filter(r=>!isNotActual(r.id))}
  function requirementProgress(id){if(isNotActual(id))return 0;return original.requirementProgress?original.requirementProgress(id):0}
  function requirementOverdue(reqOrId){
    const c=core(),req=typeof reqOrId==='string'?c.requirement(reqOrId):reqOrId;if(!req||isNotActual(req.id)||!isTeamActive(req.team))return false;
    const s=c.getState(req.id);if(['answered','done'].includes(s.statusId))return false;
    const meta=req.custom?readMeta(req.id):null;
    if(meta?.customEndDate){const p=periodForRequirement(req);return Boolean(p)&&p.endDate<c.dateInput(Date.now());}
    return original.requirementOverdue?original.requirementOverdue(reqOrId):false;
  }
  function requirementProblem(reqOrId){
    const c=core(),req=typeof reqOrId==='string'?c.requirement(reqOrId):reqOrId;if(!req||isNotActual(req.id)||!isTeamActive(req.team))return false;
    if(c.getState(req.id).statusId==='blocker')return true;
    return requirementOverdue(req);
  }

  function teamSummary(team){
    const c=core(),rows=rawRowsForTeam(team).filter(r=>!isNotActual(r.id)),states=rows.map(r=>c.getState(r.id));
    const total=rows.length,progress=total?Math.round(rows.reduce((n,r)=>n+requirementProgress(r.id),0)/total):0;
    return {team,teamId:c.TEAM_IDS?.[team]||team,total,progress,done:states.filter(x=>x.statusId==='done').length,work:states.filter(x=>!['not_requested','done'].includes(x.statusId)).length,problem:rows.filter(requirementProblem).length,owner:c.teamOwner(team),active:isTeamActive(team),excluded:!isTeamActive(team)};
  }

  function linkedSummary(stageId){
    const c=core(),rows=currentRequirementsByStage(stageId);
    if(!rows.length)return{total:0,progress:0,problem:false,done:0};
    return {total:rows.length,progress:Math.round(rows.reduce((n,r)=>n+requirementProgress(r.id),0)/rows.length),problem:rows.some(requirementProblem),done:rows.filter(r=>c.getState(r.id).statusId==='done').length};
  }

  function stageRelevant(stageId){
    const c=core();stageId=Number(stageId);
    if(!(activity()?.activeCount?.()??1))return false;
    if(currentRequirementsByStage(stageId).length)return true;
    if(stageId===2)return (c.ownersSummary?.().total||0)>0;
    if(stageId===3)return (c.sourcesSummary?.().total||0)>0;
    if(stageId===5)return (c.dictionarySummary?.().total||0)>0;
    if(stageId===6)return (c.criticalIdsSummary?.().total||0)>0;
    if(stageId===7)return (c.sourcesSummary?.().total||0)>0;
    return false;
  }

  function stageSummary(stageId){
    const c=core();stageId=Number(stageId);const linked=linkedSummary(stageId),relevant=stageRelevant(stageId);
    if(!relevant)return{id:stageId,name:c.stageName(stageId),progress:0,status:'Не активно',problem:false,relevant:false,linked};
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
    const rows=Array.from({length:12},(_,i)=>stageSummary(i+1)).filter(x=>x.relevant);
    return rows.length?Math.round(rows.reduce((n,x)=>n+x.progress,0)/rows.length):0;
  }

  function dodEvaluation(){
    const c=core(),src=c.sourcesSummary(),own=c.ownersSummary(),dict=c.dictionarySummary(),rows=Array.isArray(window.DATA?.dictionary)?DATA.dictionary:[];
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

  function reconcileRequirementBlockers(){
    const c=core();let rows=[];try{rows=JSON.parse(localStorage.getItem('atom-blockers')||'[]')||[]}catch{}
    let changed=false;
    allDisplayRows().forEach(req=>{
      const key=`CORE:RACI:${req.id}`,state=c.getState(req.id),period=periodForRequirement(req),problem=requirementProblem(req),existing=rows.find(x=>x.autoKey===key),owner=c.personName(state.respondentId)||c.teamOwner(req.team);
      if(problem&&!existing){rows.push({id:Date.now()+Math.floor(Math.random()*100000),autoKey:key,source:`RACI: ${req.team}`,description:`${req.text}. Плановый срок: ${period?.endDate||'не задан'}`,severity:'Высокая',owner,due:period?.endDate||'',status:'Открыт',comment:`Этап Ганта: ${period?.stageId||req.stageId}. ${period?.stageName||c.stageName(req.stageId)}`,createdAt:new Date().toISOString()});changed=true;}
      else if(problem&&existing){if(existing.due!==(period?.endDate||'')||existing.owner!==owner){existing.due=period?.endDate||'';existing.owner=owner;existing.description=`${req.text}. Плановый срок: ${period?.endDate||'не задан'}`;changed=true;}if(['Решен','Закрыт'].includes(existing.status)){existing.status='Открыт';changed=true;}}
      else if(!problem&&existing&&!['Решен','Закрыт'].includes(existing.status)){existing.status='Решен';const note='Закрыт автоматически: требование больше не просрочено, не заблокировано или исключено из логики.';if(!String(existing.comment||'').includes(note))existing.comment=(existing.comment?existing.comment+'\n':'')+note;changed=true;}
    });
    if(changed)localStorage.setItem('atom-blockers',JSON.stringify(rows));
    return changed;
  }

  function patchCore(){
    const c=core();if(patchedCore||!c)return false;
    ['requirements','requirementsByStage','requirementProgress','periodForRequirement','requirementOverdue','requirementProblem','teamSummary','linkedSummary','stageSummary','projectProgress','dodEvaluation','reconcile'].forEach(k=>original[k]=c[k]?.bind(c));
    if(!original.requirements||!original.reconcile||!original.periodForRequirement)return false;
    c.requirements=currentRequirements;
    c.requirementsByStage=currentRequirementsByStage;
    c.requirementProgress=requirementProgress;
    c.periodForRequirement=periodForRequirement;
    c.requirementOverdue=requirementOverdue;
    c.requirementProblem=requirementProblem;
    c.teamSummary=teamSummary;
    c.linkedSummary=linkedSummary;
    c.stageSummary=stageSummary;
    c.projectProgress=projectProgress;
    c.dodEvaluation=dodEvaluation;
    if(activity())activity().stageRelevant=stageRelevant;
    c.reconcile=function(){
      const changed=original.reconcile?original.reconcile():false;
      for(let id=1;id<=12;id++){const s=stageSummary(id);localStorage.setItem(`atom-stage-status-${id}`,s.relevant?s.status:'Завершено');}
      closeNotActualBlockers();
      const blockersChanged=reconcileRequirementBlockers();
      return changed||blockersChanged;
    };
    c.isRequirementNotActual=isNotActual;
    c.setRequirementNotActual=setNotActual;
    patchedCore=true;
    c.reconcile();
    return true;
  }

  function statusOptions(req){
    const c=core(),s=c.getState(req.id),na=isNotActual(req.id);
    return [...c.STATUS.map(x=>`<option value="${x.id}" ${!na&&x.id===s.statusId?'selected':''}>${esc(x.label)}</option>`),`<option value="${NOT_ACTUAL}" ${na?'selected':''}>Не актуально</option>`].join('');
  }
  function peopleOptions(selected=''){
    const c=core();return ['<option value="">Не назначен</option>',...(c.people?.()||[]).map(x=>`<option value="${esc(x.id)}" ${x.id===selected?'selected':''}>${esc(x.name)}</option>`)].join('');
  }
  function stageOptions(selected){const c=core();return Array.from({length:12},(_,i)=>i+1).map(id=>`<option value="${id}" ${Number(selected)===id?'selected':''}>${id}. ${esc(c.stageName(id))}</option>`).join('')}
  function teamOptions(selected){return (core().teams?.()||[]).map(t=>`<option value="${esc(t)}" ${t===selected?'selected':''}>${esc(t)}</option>`).join('')}
  function defaultPeriod(stageId){return original.periodForRequirement?original.periodForRequirement({id:'__new__',stageId:Number(stageId)||1,custom:false}):null}

  function dueLabel(req,p){
    if(isNotActual(req.id))return'<span class="req-enh-due na">Не учитывается</span>';
    const s=core().getState(req.id);if(s.statusId==='done')return'<span class="req-enh-due done">Готово</span>';
    const d=daysToDue(p);if(!Number.isFinite(d))return'<span class="req-enh-due na">Нет срока</span>';
    if(d<0)return`<span class="req-enh-due overdue">Просрочено ${Math.abs(d)} дн.</span>`;
    if(d===0)return'<span class="req-enh-due">Сегодня</span>';
    return`<span class="req-enh-due">${d} дн.</span>`;
  }

  function renderRequirements(){
    if(!location.hash.startsWith('#management/requirements'))return;
    const c=core(),host=document.getElementById('pa-panel');if(!c||!host)return;
    styles();
    const rows=displayRows(),teams=c.teams?.()||[],defaultP=defaultPeriod(1);
    const considered=rows.filter(x=>isCounted(x.req)),done=considered.filter(x=>c.getState(x.req.id).statusId==='done').length,na=rows.filter(x=>isNotActual(x.req.id)).length;
    host.innerHTML=`<div id="req-enhanced-root">
      <div class="req-enh-toolbar"><div class="req-enh-toolbar-left"><b>Команда</b><select id="req-enh-team"><option value="${ALL}" ${selectedTeam===ALL?'selected':''}>Все</option>${teams.map(t=>`<option value="${esc(t)}" ${selectedTeam===t?'selected':''}>${esc(t)}</option>`).join('')}</select><span class="pa-note">Сортировка: по дате закрытия, сначала ближайшие</span></div><div class="req-enh-summary">Показано ${rows.length} · учитывается ${considered.length} · готово ${done}/${considered.length} · не актуально ${na}</div></div>
      <div class="pa-table-wrap"><table class="pa-table req-enh-table"><thead><tr><th>Команда</th><th style="min-width:260px">Что нужно</th><th>Этап Ганта</th><th>Период</th><th>Дата закрытия</th><th>Дней до закрытия</th><th>Статус</th><th>Ответственный за ответ</th><th style="min-width:210px">Комментарий</th><th></th></tr></thead><tbody>${rows.map(({req,p})=>{
        const st=c.getState(req.id),naReq=isNotActual(req.id),d=daysToDue(p),overdue=!naReq&&st.statusId!=='done'&&Number.isFinite(d)&&d<0,inactiveTeam=!isTeamActive(req.team);
        return `<tr data-req-enh-row="${esc(req.id)}" class="${overdue?'req-enh-overdue ':''}${naReq?'req-enh-not-actual ':''}${inactiveTeam?'req-enh-team-inactive':''}"><td><b>${esc(req.team)}</b>${inactiveTeam?'<span class="req-enh-team-note">Команда неактивна</span>':''}</td><td>${esc(req.text)}</td><td>${req.custom?`<select data-req-enh-stage="${esc(req.id)}">${stageOptions(req.stageId)}</select>`:`<b>${req.stageId}. ${esc(p?.stageName||c.stageName(req.stageId))}</b>`}</td><td class="req-enh-period">${fmt(p?.startDate)} - ${fmt(p?.endDate)}${p?.customDates?'<br><span class="pa-note">индивидуальный срок</span>':p?.changed?'<br><span class="pa-note">срок этапа перенесен</span>':''}</td><td><b>${fmt(p?.endDate)}</b></td><td>${dueLabel(req,p)}</td><td><select data-req-enh-status="${esc(req.id)}">${statusOptions(req)}</select></td><td><select data-req-enh-person="${esc(req.id)}">${peopleOptions(st.respondentId)}</select></td><td><textarea data-req-enh-comment="${esc(req.id)}">${esc(st.comment)}</textarea></td><td>${req.custom?`<button class="btn" data-req-enh-delete="${esc(req.id)}">Удалить</button>`:''}</td></tr>`;
      }).join('')}</tbody></table></div>
      <div class="req-enh-add"><div class="pa-field"><label>Новый пункт «Что нужно»</label><input id="req-enh-new-text" placeholder="Конкретный результат от команды"></div><div class="pa-field"><label>Команда</label><select id="req-enh-new-team">${teamOptions(selectedTeam!==ALL?selectedTeam:(teams[0]||''))}</select></div><div class="pa-field"><label>Этап Ганта</label><select id="req-enh-new-stage">${stageOptions(1)}</select></div><div class="pa-field"><label>Дата начала</label><input type="date" id="req-enh-new-start" value="${esc(defaultP?.startDate||'')}"></div><div class="pa-field"><label>Дата окончания</label><input type="date" id="req-enh-new-end" value="${esc(defaultP?.endDate||'')}"></div><button class="btn primary" id="req-enh-add">Добавить</button></div>
    </div>`;
  }

  function patchRaci(){
    const c=core();if(!c)return;
    document.querySelectorAll('.core-raci-table tr[data-core-id]').forEach(row=>{
      const id=row.dataset.coreId,sel=row.querySelector('select[data-core-field="statusId"]');if(!id||!sel)return;
      if(![...sel.options].some(o=>o.value===NOT_ACTUAL)){const o=document.createElement('option');o.value=NOT_ACTUAL;o.textContent='Не актуально';sel.appendChild(o);}
      if(isNotActual(id))sel.value=NOT_ACTUAL;
      row.classList.toggle('req-enh-raci-na',isNotActual(id));
    });
  }

  function updateCustomStage(id,stageId){
    const key=metaKey(id);let m=readMeta(id);if(!m)return;m.stageId=Number(stageId);localStorage.setItem(key,JSON.stringify(m));window.dispatchEvent(new CustomEvent('atom-core-data-changed',{detail:{type:'requirement-stage',id}}));core().reconcile();
  }

  function saveCustomDates(id,startDate,endDate){
    const key=metaKey(id),m=readMeta(id);if(!m)return false;
    if(startDate)m.customStartDate=startDate;else delete m.customStartDate;
    if(endDate)m.customEndDate=endDate;else delete m.customEndDate;
    localStorage.setItem(key,JSON.stringify(m));
    window.dispatchEvent(new CustomEvent('atom-core-data-changed',{detail:{type:'requirement-dates',id,startDate,endDate}}));
    return true;
  }

  document.addEventListener('change',e=>{
    const team=e.target.closest('#req-enh-team');if(team){selectedTeam=team.value||ALL;renderRequirements();return;}
    const status=e.target.closest('[data-req-enh-status]');if(status){const id=status.dataset.reqEnhStatus;if(status.value===NOT_ACTUAL)setNotActual(id,true);else{setNotActual(id,false);core().setState(id,{statusId:status.value});core().reconcile();}renderRequirements();return;}
    const person=e.target.closest('[data-req-enh-person]');if(person){core().setState(person.dataset.reqEnhPerson,{respondentId:person.value});core().reconcile();renderRequirements();return;}
    const stage=e.target.closest('[data-req-enh-stage]');if(stage){updateCustomStage(stage.dataset.reqEnhStage,stage.value);renderRequirements();return;}
    const newStage=e.target.closest('#req-enh-new-stage');if(newStage){const p=defaultPeriod(newStage.value),start=document.getElementById('req-enh-new-start'),end=document.getElementById('req-enh-new-end');if(start)start.value=p?.startDate||'';if(end)end.value=p?.endDate||'';return;}
  });

  document.addEventListener('focusout',e=>{
    const t=e.target.closest('[data-req-enh-comment]');if(!t)return;core().setState(t.dataset.reqEnhComment,{comment:t.value});core().reconcile();
  });

  document.addEventListener('click',e=>{
    if(e.target.closest('#req-enh-add')){
      const text=document.getElementById('req-enh-new-text')?.value.trim(),team=document.getElementById('req-enh-new-team')?.value,stage=Number(document.getElementById('req-enh-new-stage')?.value||1),startDate=document.getElementById('req-enh-new-start')?.value||'',endDate=document.getElementById('req-enh-new-end')?.value||'';
      if(!text)return alert('Укажите, что нужно получить');
      if(!team)return alert('Выберите команду');
      if((startDate&&!endDate)||(!startDate&&endDate))return alert('Укажите и дату начала, и дату окончания');
      if(startDate&&endDate&&endDate<startDate)return alert('Дата окончания не может быть раньше даты начала');
      const req=core().addRequirement(team,text,stage);if(!req)return;
      if(startDate&&endDate)saveCustomDates(req.id,startDate,endDate);
      core().reconcile();renderRequirements();return;
    }
    const del=e.target.closest('[data-req-enh-delete]');if(del){const id=del.dataset.reqEnhDelete;if(confirm('Удалить дополнительное требование?')){localStorage.removeItem(relKey(id));core().deleteRequirement(id);core().reconcile();renderRequirements();}return;}
  });

  document.addEventListener('change',e=>{
    const sel=e.target.closest('.core-raci-table select[data-core-field="statusId"]');if(!sel)return;
    const row=sel.closest('[data-core-id]'),id=row?.dataset.coreId;if(!id)return;
    e.stopImmediatePropagation();
    if(sel.value===NOT_ACTUAL)setNotActual(id,true);else{setNotActual(id,false);core().setState(id,{statusId:sel.value});core().reconcile();}
    const req=core().requirement(id);if(req)setTimeout(()=>window.ATOM_CORE_UI?.renderRaci?.(req.team),0);
  },true);

  window.addEventListener('atom-team-activity-changed',()=>setTimeout(()=>core()?.reconcile?.(),0));

  let queued=false;
  function patch(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;if(!patchCore())return;styles();if(location.hash.startsWith('#management/requirements')){if(!document.getElementById('req-enhanced-root'))renderRequirements();}patchRaci();});}
  new MutationObserver(patch).observe(document.body,{childList:true,subtree:true});
  ['hashchange','atom-sync-update','atom-core-ready','atom-view-rendered','atom-team-activity-changed','atom-core-data-changed'].forEach(ev=>window.addEventListener(ev,patch));
  window.ATOM_REQUIREMENTS_ENHANCED={version:VERSION,isNotActual,setNotActual,render:renderRequirements};
  styles();setTimeout(patch,700);setTimeout(patch,1600);
})();