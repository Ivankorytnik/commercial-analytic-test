(function(){
  const VERSION='1.2.0';
  const DAY=86400000;
  const OLD_STATE='atom-raci-requirement-state-v2';
  const OLD_CUSTOM='atom-raci-custom-requirements-v2';
  const PEOPLE_KEY='atom-core-people-v1';
  const PEOPLE_SNAPSHOT='atom-core-people-legacy-snapshot-v1';
  const MIGRATION_KEY='atom-core-requirements-migrated-v1';
  const BLOCKERS_KEY='atom-blockers';

  const TEAM_IDS={
    'Коммерческий блок':'commercial','B2B продажи':'b2b','B2C продажи':'b2c','Маркетинг':'marketing',
    'Сайт':'site','Метрики':'metrics','1 линия':'line1','2 линия':'line2','ELMA':'elma',
    'Альфа-Авто':'alfa','1С / финансы':'finance','DATA / DWH':'dwh','BI':'bi','ИБ':'ib'
  };
  const TEAM_BY_ID=Object.fromEntries(Object.entries(TEAM_IDS).map(([k,v])=>[v,k]));
  const DEFAULT_STAGE={commercial:1,b2b:4,b2c:4,marketing:3,site:5,metrics:5,line1:4,line2:4,elma:7,alfa:7,finance:7,dwh:8,bi:10,ib:7};
  const STAGE_WINDOWS={1:[0,7],2:[0,14],3:[7,21],4:[14,28],5:[21,35],6:[28,42],7:[35,63],8:[42,70],9:[56,77],10:[63,84],11:[77,91],12:[84,91]};
  const STAGE_NAMES={1:'Цели и KPI',2:'Команды и владельцы',3:'Источники лидов',4:'Единая воронка',5:'Data Dictionary',6:'Сквозные ID',7:'Интеграции',8:'DWH и модель данных',9:'Контроль качества',10:'Единый BI-дашборд',11:'Валидация с бизнесом',12:'Приемка и закрытие'};

  const STATUS=[
    {id:'not_requested',label:'Не запрошено',progress:0},
    {id:'prepared',label:'Запрос подготовлен',progress:10},
    {id:'sent',label:'Запрос отправлен',progress:25},
    {id:'in_progress',label:'В работе',progress:50},
    {id:'answered',label:'Ответ получен',progress:75},
    {id:'clarify',label:'Требует уточнения',progress:60},
    {id:'blocker',label:'Блокер',progress:null},
    {id:'done',label:'Готово',progress:100}
  ];
  const STATUS_BY_ID=Object.fromEntries(STATUS.map(x=>[x.id,x]));
  const STATUS_ID_BY_LABEL=Object.fromEntries(STATUS.map(x=>[x.label,x.id]));

  const DEF={
    commercial:[
      ['Утвердить цель проекта и KPI',1],['Согласовать определения ключевых показателей',1],['Определить приоритеты и формат управленческой отчетности',1],['Принять спорные бизнес-решения по методологии',4],['Провести финальную приемку BI-дашборда',12]
    ],
    b2b:[
      ['Передать этапы B2B-воронки и правила переходов',4],['Передать перечень источников B2B-лидов',3],['Определить обязательные поля карточки лида',5],['Зафиксировать критерии квалификации',4],['Передать причины отказа и потери',5],['Описать правила назначения менеджера',4],['Дать примеры реальных кейсов для проверки данных',9],['Подтвердить корректность итоговых B2B-показателей',11]
    ],
    b2c:[
      ['Передать этапы B2C-воронки и правила переходов',4],['Передать каналы поступления лидов',3],['Определить обязательные поля карточки лида',5],['Зафиксировать критерии квалификации',4],['Передать причины отказа и потери',5],['Описать правила назначения менеджера',4],['Дать тестовые кейсы для сверки',9],['Подтвердить корректность B2C-метрик',11]
    ],
    marketing:[
      ['Передать полный перечень рекламных каналов и кампаний',3],['Передать правила нейминга кампаний и UTM',5],['Определить источник данных по расходам',3],['Передать детализацию затрат по каналу и кампании',5],['Согласовать правила атрибуции',4],['Передать календарь маркетинговых активностей',3],['Назначить владельца маркетинговых данных',2],['Определить способ автоматической выгрузки данных',7]
    ],
    site:[
      ['Составить карту всех форм и точек входа лида',3],['Описать поля каждой формы',5],['Передать список событий и dataLayer',5],['Описать правила передачи UTM и referrer',5],['Определить идентификатор отправки формы',6],['Сверить соответствие полей сайта и ELMA',5],['Предоставить тестовый контур',7],['Определить технический способ передачи данных',7]
    ],
    metrics:[
      ['Предоставить доступы к Яндекс Метрике и GA4',3],['Передать список целей и событий',5],['Передать параметры Client ID и User ID',6],['Описать UTM и рекламные измерения',5],['Согласовать правила настройки событий',5],['Определить API или экспорт в DWH',7],['Передать тестовую выборку для сверки',9],['Подтвердить полноту и корректность трекинга',9]
    ],
    line1:[
      ['Описать все каналы первичного обращения',3],['Передать категории и причины обращений',5],['Определить обязательные данные клиента',5],['Передать статусы обработки',4],['Зафиксировать SLA первого контакта',4],['Определить идентификатор обращения',6],['Указать систему фиксации результата',3],['Определить поля для передачи в ELMA',7]
    ],
    line2:[
      ['Описать правила квалификации лида',4],['Определить обязательные поля квалификации',5],['Передать возможные результаты обработки',4],['Передать причины неквалификации и отказа',5],['Зафиксировать SLA обработки',4],['Передать статусы',4],['Определить кто и когда переводит лид дальше',4],['Зафиксировать обязательные данные перед передачей в Альфа-Авто',7]
    ],
    elma:[
      ['Предоставить модель сущности Lead',5],['Передать полный перечень полей Lead',5],['Передать Source, Channel и UTM',5],['Передать статусы и историю их изменения',4],['Передать даты событий и ответственного',5],['Определить Lead ID',6],['Описать правила дедупликации',6],['Предоставить API или webhook',7],['Описать правила передачи лида в Альфа-Авто',7],['Передать поля, которые уходят в Альфа-Авто',7],['Предоставить тестовую выгрузку',9]
    ],
    alfa:[
      ['Предоставить модель сделки',5],['Определить Deal ID',6],['Определить Client ID',6],['Описать связку с Lead ID из ELMA',6],['Передать этапы сделки',4],['Передать историю изменения статусов',5],['Передать менеджера сделки',5],['Передать причины потерь',5],['Передать данные договора или заказа',5],['Передать дату продажи',5],['Предоставить API или регулярную выгрузку',7],['Передать тестовые сделки для сквозной сверки',9]
    ],
    finance:[
      ['Определить финансовый факт продажи',11],['Передать идентификатор договора',6],['Передать идентификатор заказа или сделки для связки',6],['Передать даты платежей',5],['Передать суммы платежей',5],['Передать статусы оплаты',5],['Передать возвраты и отмены',5],['Определить Payment ID',6],['Описать правила сверки с Альфа-Авто',9],['Согласовать формат автоматической выгрузки',7],['Согласовать периодичность выгрузки в DWH',7]
    ],
    dwh:[
      ['Согласовать архитектуру загрузки всех источников',7],['Зафиксировать ключ Lead ID',6],['Зафиксировать ключ Client ID',6],['Зафиксировать ключ Deal ID',6],['Зафиксировать ключ Payment ID',6],['Согласовать целевую модель данных',8],['Согласовать правила хранения истории',8],['Определить расписание обновлений и SLA',8],['Определить проверки полноты и качества данных',9],['Описать обработку дублей и ошибок',9],['Настроить доступы и витрины для BI',10]
    ],
    bi:[
      ['Согласовать список KPI',1],['Согласовать формулы расчета KPI',1],['Согласовать структуру страниц дашборда',10],['Согласовать фильтры и разрезы',10],['Определить права просмотра',10],['Зафиксировать источник каждой метрики',10],['Согласовать периодичность обновления',10],['Настроить контроль расхождений',9],['Согласовать сценарий приемочного тестирования',11],['Подготовить финальный рабочий дашборд',10]
    ],
    ib:[
      ['Проверить архитектуру и поток данных',7],['Классифицировать данные проекта',5],['Определить допустимый состав данных в TEST',7],['Определить допустимый состав данных в PROD',12],['Согласовать требования к аутентификации',7],['Согласовать ролевую модель',7],['Согласовать RLS и права доступа',7],['Согласовать хранение секретов',7],['Согласовать аудит и логирование',9],['Согласовать сроки хранения и удаления данных',8],['Выдать требования для допуска production',12]
    ]
  };

  const safeRead=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key)||'');return v??fallback}catch{return fallback}};
  const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const pad=n=>String(n).padStart(2,'0');
  const dateInput=ts=>{const d=new Date(ts);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
  const addDays=(ts,n)=>{const d=new Date(ts);d.setHours(0,0,0,0);d.setDate(d.getDate()+n);return d.getTime()};
  const startTs=()=>Number(localStorage.getItem('atom-project-started-at')||0)||Date.now();
  const hash=s=>{let h=2166136261;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(36)};
  const stateKey=id=>`atom-core-requirement-state-${id}`;
  const metaKey=id=>`atom-core-requirement-meta-${id}`;
  const normalizeStatus=v=>STATUS_BY_ID[v]?v:(STATUS_ID_BY_LABEL[v]||'not_requested');
  const statusLabel=id=>(STATUS_BY_ID[normalizeStatus(id)]||STATUS_BY_ID.not_requested).label;
  const stageName=id=>{try{return DATA?.stages?.find(x=>Number(x.id)===Number(id))?.name||STAGE_NAMES[id]||`Этап ${id}`}catch{return STAGE_NAMES[id]||`Этап ${id}`}};

  function syncPeople(){
    let names=[];try{const refs=safeRead('atom-reference-data-v1',{});if(Array.isArray(refs.responsibles))names=refs.responsibles.filter(x=>x&&x!=='Не назначен')}catch{}
    const emails=safeRead('atom-responsible-emails-v1',{});
    let people=safeRead(PEOPLE_KEY,[]);
    const previous=safeRead(PEOPLE_SNAPSHOT,[]);
    let changed=false;
    const removed=previous.filter(x=>!names.includes(x));
    const added=names.filter(x=>!previous.includes(x));
    if(removed.length===1&&added.length===1){const p=people.find(x=>x.name===removed[0]);if(p){p.name=added[0];p.email=emails[added[0]]||p.email||'';changed=true;}}
    names.forEach(name=>{let p=people.find(x=>x.name===name);if(!p){people.push({id:`p-${hash(name)}-${Date.now().toString(36).slice(-3)}`,name,email:emails[name]||''});changed=true;}else if((emails[name]||'')!== (p.email||'')){p.email=emails[name]||'';changed=true;}});
    if(changed||!localStorage.getItem(PEOPLE_KEY))write(PEOPLE_KEY,people);
    if(JSON.stringify(previous)!==JSON.stringify(names))write(PEOPLE_SNAPSHOT,names);
    return people;
  }

  function findPersonId(name){
    if(!name||name==='Не назначен')return'';
    let people=syncPeople();let p=people.find(x=>x.name===name);
    if(!p){p={id:`p-${hash(name)}-${Date.now().toString(36).slice(-3)}`,name,email:''};people.push(p);write(PEOPLE_KEY,people);}
    return p.id;
  }
  function personName(id){return syncPeople().find(x=>x.id===id)?.name||''}

  function baseRequirements(){
    const out=[];
    Object.entries(DEF).forEach(([teamId,rows])=>rows.forEach(([text,stageId],i)=>out.push({id:`${teamId}-${i+1}`,legacyId:`base-${i+1}`,teamId,team:TEAM_BY_ID[teamId],text,stageId,custom:false})));
    return out;
  }
  function customRequirements(){
    const out=[];
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);if(!key||!key.startsWith('atom-core-requirement-meta-'))continue;
      const m=safeRead(key,null);if(m&&m.id&&m.teamId&&m.text)out.push({...m,team:TEAM_BY_ID[m.teamId]||m.team,custom:true});
    }
    return out;
  }
  function allRequirements(){migrate();return [...baseRequirements(),...customRequirements()]}
  function requirement(id){return allRequirements().find(x=>x.id===id)||null}
  function requirementsByTeam(team){const teamId=TEAM_IDS[team]||team;return allRequirements().filter(x=>x.teamId===teamId)}
  function requirementsByStage(stageId){return allRequirements().filter(x=>Number(x.stageId)===Number(stageId))}

  function getState(id){
    const raw=safeRead(stateKey(id),{});
    return {statusId:normalizeStatus(raw.statusId||raw.status||'not_requested'),previousStatusId:normalizeStatus(raw.previousStatusId||'not_requested'),respondentId:raw.respondentId||'',comment:raw.comment||'',updatedAt:raw.updatedAt||''};
  }
  function setState(id,patch){
    const req=requirement(id);if(!req)return false;
    const old=getState(id),next={...old,...patch};
    if(Object.prototype.hasOwnProperty.call(patch,'status'))next.statusId=normalizeStatus(patch.status);
    if(Object.prototype.hasOwnProperty.call(patch,'statusId'))next.statusId=normalizeStatus(patch.statusId);
    if(Object.prototype.hasOwnProperty.call(patch,'respondentName'))next.respondentId=findPersonId(patch.respondentName);
    if(next.statusId==='blocker'&&old.statusId!=='blocker')next.previousStatusId=old.statusId;
    if(next.statusId!=='blocker'&&old.statusId==='blocker'&&!patch.previousStatusId)next.previousStatusId=old.previousStatusId;
    delete next.status;delete next.respondentName;
    next.updatedAt=new Date().toISOString();write(stateKey(id),next);
    window.dispatchEvent(new CustomEvent('atom-core-data-changed',{detail:{type:'requirement',id,team:req.team,stageId:req.stageId}}));
    return true;
  }

  function requirementProgress(id){
    const s=getState(id);const use=s.statusId==='blocker'?s.previousStatusId:s.statusId;
    return STATUS_BY_ID[use]?.progress??0;
  }
  function ganttState(stageId){try{return window.ATOM_GANTT?.getTaskState?.(stageId)||null}catch{return null}}
  function periodForRequirement(reqOrId){
    const req=typeof reqOrId==='string'?requirement(reqOrId):reqOrId;if(!req)return null;
    const gs=ganttState(req.stageId);
    if(gs?.startDate&&gs?.due)return {start:gs.startDate,end:gs.due,startDate:dateInput(gs.startDate),endDate:dateInput(gs.due),stageId:req.stageId,stageName:stageName(req.stageId),changed:Boolean(gs.changed)};
    const [a,b]=STAGE_WINDOWS[req.stageId]||[0,7],start=startTs();
    return {start:addDays(start,a),end:addDays(start,b),startDate:dateInput(addDays(start,a)),endDate:dateInput(addDays(start,b)),stageId:req.stageId,stageName:stageName(req.stageId),changed:false};
  }
  function requirementOverdue(reqOrId){
    const req=typeof reqOrId==='string'?requirement(reqOrId):reqOrId;if(!req)return false;
    const s=getState(req.id);if(['answered','done'].includes(s.statusId))return false;
    const p=periodForRequirement(req);return Boolean(p)&&p.endDate<dateInput(Date.now());
  }
  function requirementProblem(reqOrId){const req=typeof reqOrId==='string'?requirement(reqOrId):reqOrId;if(!req)return false;return getState(req.id).statusId==='blocker'||requirementOverdue(req)}

  function teamOwner(team){
    try{const i=DATA?.teams?.findIndex(r=>r[0]===team)??-1;return i>=0?(localStorage.getItem(`atom-responsible-${i}`)||'Не назначен'):'Не назначен'}catch{return'Не назначен'}
  }
  function teamSummary(team){
    const rows=requirementsByTeam(team),states=rows.map(r=>getState(r.id));
    const total=rows.length;const progress=total?Math.round(rows.reduce((n,r)=>n+requirementProgress(r.id),0)/total):0;
    return {team,teamId:TEAM_IDS[team]||team,total,progress,done:states.filter(x=>x.statusId==='done').length,work:states.filter(x=>!['not_requested','done'].includes(x.statusId)).length,problem:rows.filter(requirementProblem).length,owner:teamOwner(team)};
  }

  function ownersSummary(){
    const teams=Array.isArray(DATA?.teams)?DATA.teams:[];const ready=teams.filter((_,i)=>{const v=localStorage.getItem(`atom-responsible-${i}`);return v&&v!=='Не назначен'}).length;return{ready,total:teams.length};
  }
  function sourcesSummary(){
    const base=Array.isArray(DATA?.sources_list)?DATA.sources_list:[],custom=safeRead('atom-custom-sources-v1',[]);
    const values=[...base.map((_,i)=>localStorage.getItem(`atom-source-status-${i}`)||'Не начато'),...custom.map(x=>localStorage.getItem(`atom-source-status-custom-${x.id}`)||'Не начато')];
    return {total:values.length,ready:values.filter(x=>x==='Готово').length,identified:values.filter(x=>x!=='Не начато').length,problem:values.filter(x=>x==='Блокер').length};
  }
  function dictionarySummary(){
    const base=Array.isArray(DATA?.dictionary)?DATA.dictionary:[],custom=safeRead('atom-custom-dictionary-v1',[]);
    const ready=base.filter((_,i)=>localStorage.getItem(`atom-dictionary-ready-${i}`)==='1').length+custom.filter(x=>x.ready).length;
    return {total:base.length+custom.length,ready};
  }
  function criticalIdsSummary(){
    const names=['Lead ID','Client ID','Deal ID','Payment ID'];const rows=Array.isArray(DATA?.dictionary)?DATA.dictionary:[];
    const ready=names.filter(name=>{const i=rows.findIndex(r=>r[0]===name);return i>=0&&localStorage.getItem(`atom-dictionary-ready-${i}`)==='1'}).length;
    return {ready,total:names.length};
  }
  function linkedSummary(stageId){
    const rows=requirementsByStage(stageId);if(!rows.length)return{total:0,progress:0,problem:false,done:0};
    return {total:rows.length,progress:Math.round(rows.reduce((n,r)=>n+requirementProgress(r.id),0)/rows.length),problem:rows.some(requirementProblem),done:rows.filter(r=>getState(r.id).statusId==='done').length};
  }
  function manualStageProgress(stageId){
    const map={'Не начато':0,'Подготовка':10,'В работе':40,'Ожидание данных':50,'На согласовании':75,'Блокер':40,'Завершено':100};return map[localStorage.getItem(`atom-stage-status-${stageId}`)||'Не начато']||0;
  }
  function avg(parts){const x=parts.filter(v=>Number.isFinite(v));return x.length?Math.round(x.reduce((a,b)=>a+b,0)/x.length):0}
  function stageSummary(stageId){
    stageId=Number(stageId);const linked=linkedSummary(stageId);let progress=linked.total?linked.progress:manualStageProgress(stageId);let problem=linked.problem;
    if(stageId===2){const x=ownersSummary();progress=x.total?Math.round(x.ready/x.total*100):0;problem=false;}
    if(stageId===3){const x=sourcesSummary();progress=x.total?Math.round(x.identified/x.total*100):0;problem=x.problem>0;}
    if(stageId===5){const d=dictionarySummary();progress=avg([linked.total?linked.progress:NaN,d.total?Math.round(d.ready/d.total*100):NaN]);}
    if(stageId===6){const c=criticalIdsSummary();progress=avg([linked.total?linked.progress:NaN,c.total?Math.round(c.ready/c.total*100):NaN]);}
    if(stageId===7){const s=sourcesSummary();progress=avg([linked.total?linked.progress:NaN,s.total?Math.round(s.ready/s.total*100):NaN]);problem=problem||s.problem>0;}
    const gs=ganttState(stageId);if(progress<100&&gs?.overdue)problem=true;
    const status=progress>=100?'Завершено':problem?'Блокер':progress<=0?'Не начато':'В работе';
    return {id:stageId,name:stageName(stageId),progress,status,problem,linked};
  }
  function projectProgress(){const ids=Array.from({length:12},(_,i)=>i+1);return Math.round(ids.reduce((n,id)=>n+stageSummary(id).progress,0)/ids.length)}

  function dodEvaluation(){
    const src=sourcesSummary(),own=ownersSummary(),dict=dictionarySummary();
    const rows=Array.isArray(DATA?.dictionary)?DATA.dictionary:[];
    const ids=['Lead ID','Client ID','Deal ID'];const idsReady=ids.every(name=>{const i=rows.findIndex(r=>r[0]===name);return i>=0&&localStorage.getItem(`atom-dictionary-ready-${i}`)==='1'});
    const done=id=>stageSummary(id).progress>=100;
    return [
      {ok:src.total>0&&src.identified===src.total,detail:`Источники определены ${src.identified}/${src.total}`},
      {ok:own.total>0&&own.ready===own.total,detail:`Ответственные назначены ${own.ready}/${own.total}`},
      {ok:done(4),detail:`Единая воронка: ${stageSummary(4).progress}%`},
      {ok:dict.total>0&&dict.ready===dict.total,detail:`Data Dictionary готов ${dict.ready}/${dict.total}`},
      {ok:idsReady,detail:'Подтверждены Lead ID, Client ID и Deal ID'},
      {ok:done(7),detail:`Интеграции: ${stageSummary(7).progress}%`},
      {ok:done(8),detail:`DWH и модель данных: ${stageSummary(8).progress}%`},
      {ok:done(9),detail:`Контроль качества: ${stageSummary(9).progress}%`},
      {ok:done(10),detail:`Единый BI-дашборд: ${stageSummary(10).progress}%`},
      {ok:done(11),detail:`Валидация с бизнесом: ${stageSummary(11).progress}%`},
      {ok:done(7)&&done(10),detail:'Интеграции и BI работают в автоматическом контуре'},
      {ok:done(12),detail:`Финальная приемка: ${stageSummary(12).progress}%`}
    ];
  }

  function addRequirement(team,text,stageId){
    const teamId=TEAM_IDS[team]||team;if(!TEAM_BY_ID[teamId]||!String(text).trim())return null;
    const id=`c-${teamId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
    const meta={id,teamId,team:TEAM_BY_ID[teamId],text:String(text).trim(),stageId:Number(stageId)||DEFAULT_STAGE[teamId]||1,custom:true,createdAt:new Date().toISOString()};
    write(metaKey(id),meta);write(stateKey(id),{statusId:'not_requested',previousStatusId:'not_requested',respondentId:'',comment:'',updatedAt:new Date().toISOString()});
    window.dispatchEvent(new CustomEvent('atom-core-data-changed',{detail:{type:'requirement-add',id}}));return meta;
  }
  function deleteRequirement(id){const req=requirement(id);if(!req?.custom)return false;localStorage.removeItem(metaKey(id));localStorage.removeItem(stateKey(id));window.dispatchEvent(new CustomEvent('atom-core-data-changed',{detail:{type:'requirement-delete',id}}));return true}

  function migrate(){
    if(localStorage.getItem(MIGRATION_KEY)==='1')return;
    syncPeople();const old=safeRead(OLD_STATE,{}),custom=safeRead(OLD_CUSTOM,{});
    Object.entries(custom).forEach(([team,items])=>{const teamId=TEAM_IDS[team];if(!teamId||!Array.isArray(items))return;items.forEach(item=>{const id=`c-${teamId}-${item.id}`;if(!localStorage.getItem(metaKey(id)))write(metaKey(id),{id,legacyId:item.id,teamId,team,text:item.text||'Дополнительный пункт',stageId:DEFAULT_STAGE[teamId]||1,custom:true,migrated:true});});});
    const reqs=[...baseRequirements(),...customRequirements()];
    reqs.forEach(req=>{if(localStorage.getItem(stateKey(req.id)))return;const legacy=old[req.team]?.[req.legacyId||req.id]||{};write(stateKey(req.id),{statusId:normalizeStatus(legacy.status||'Не запрошено'),previousStatusId:'not_requested',respondentId:findPersonId(legacy.respondent||''),comment:legacy.comment||'',updatedAt:new Date().toISOString()});});
    localStorage.setItem(MIGRATION_KEY,'1');
  }

  function blockers(){return safeRead(BLOCKERS_KEY,[])}
  function saveBlockers(rows){write(BLOCKERS_KEY,rows)}
  function reconcileRequirementBlockers(){
    const rows=blockers();let changed=false;const reqs=allRequirements();
    rows.forEach(b=>{if(b.autoKey&&b.autoKey.startsWith('RACI:')&&!b.autoKey.startsWith('CORE:RACI:')&&!['Решен','Закрыт'].includes(b.status)){b.status='Закрыт';b.comment=(b.comment?b.comment+'\n':'')+'Закрыт после перехода на Logic Core v1.2.0.';changed=true;}});
    reqs.forEach(req=>{
      const key=`CORE:RACI:${req.id}`,state=getState(req.id),period=periodForRequirement(req),problem=requirementProblem(req),existing=rows.find(x=>x.autoKey===key);
      if(problem&&!existing){rows.push({id:Date.now()+Math.floor(Math.random()*100000),autoKey:key,source:`RACI: ${req.team}`,description:`${req.text}. Плановый срок по Ганту: ${period.endDate}`,severity:'Высокая',owner:personName(state.respondentId)||teamOwner(req.team),due:period.endDate,status:'Открыт',comment:`Этап Ганта: ${period.stageId}. ${period.stageName}`,createdAt:new Date().toISOString()});changed=true;}
      else if(problem&&existing){const owner=personName(state.respondentId)||teamOwner(req.team);if(existing.due!==period.endDate||existing.owner!==owner){existing.due=period.endDate;existing.owner=owner;changed=true;}if(['Решен','Закрыт'].includes(existing.status)){existing.status='Открыт';changed=true;}}
      else if(!problem&&existing&&!['Решен','Закрыт'].includes(existing.status)){existing.status='Решен';existing.comment=(existing.comment?existing.comment+'\n':'')+'Закрыт автоматически Logic Core: требование больше не просрочено и не заблокировано.';changed=true;}
    });
    if(changed)saveBlockers(rows);return changed;
  }

  let reconciling=false;
  function reconcile(){
    if(reconciling)return false;reconciling=true;let changed=false;
    try{
      migrate();
      for(let id=1;id<=12;id++){const s=stageSummary(id),key=`atom-stage-status-${id}`,old=localStorage.getItem(key)||'Не начато';if(old!==s.status){localStorage.setItem(key,s.status);changed=true;}}
      if(reconcileRequirementBlockers())changed=true;
    }finally{reconciling=false;}
    if(changed)window.dispatchEvent(new CustomEvent('atom-project-reconciled'));
    return changed;
  }

  migrate();
  window.ATOM_CORE={
    version:VERSION,TEAM_IDS,TEAM_BY_ID,STATUS,statusLabel,stageName,stageWindows:STAGE_WINDOWS,
    teams:()=>Object.keys(TEAM_IDS),people:syncPeople,personName,findPersonId,teamOwner,
    requirements:allRequirements,requirement,requirementsByTeam,requirementsByStage,getState,setState,requirementProgress,periodForRequirement,requirementOverdue,requirementProblem,
    teamSummary,ownersSummary,sourcesSummary,dictionarySummary,criticalIdsSummary,linkedSummary,stageSummary,projectProgress,dodEvaluation,
    addRequirement,deleteRequirement,reconcile,dateInput,startTs
  };
  window.dispatchEvent(new CustomEvent('atom-core-ready',{detail:{version:VERSION}}));
})();