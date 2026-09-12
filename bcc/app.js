const STORAGE_KEY='atom-bcc-mvp-v01';
const state=loadState();
let currentView='dashboard';
const titles={dashboard:['Главная','Что требует внимания сегодня'],tasks:['Мои задачи','Контроль исполнения'],projects:['Проекты','Портфель ключевых инициатив'],meetings:['Встречи','Адженда, решения и обязательства'],kpi:['KPI','План, факт и прогноз'],blockers:['Блокеры','Что мешает движению'],decisions:['Решения','Что требует управленческого решения'],teams:['Команды','Ответственные и зоны ответственности'],reports:['Отчеты','Еженедельный контроль'],directories:['Справочники','Управление вариантами и статусами']};

function seed(){return {
 projects:[
  {id:id(),name:'Коммерческая аналитика',owner:'Коммерческий блок',status:'В работе',progress:48,deadline:'2026-10-30',priority:'Высокий'},
  {id:id(),name:'B2B продажи',owner:'Корпоративные продажи',status:'В работе',progress:62,deadline:'2026-11-30',priority:'Высокий'},
  {id:id(),name:'Контур тест-драйвов',owner:'Продажи / IT',status:'Под риском',progress:35,deadline:'2026-10-15',priority:'Средний'}],
 tasks:[
  {id:id(),title:'Собрать владельцев источников данных',project:'Коммерческая аналитика',owner:'Иван',status:'В работе',priority:'Высокий',deadline:'2026-09-14'},
  {id:id(),title:'Зафиксировать поля лида в ELMA',project:'Коммерческая аналитика',owner:'Иван',status:'Новая',priority:'Высокий',deadline:'2026-09-16'},
  {id:id(),title:'Подготовить недельную сводку',project:'B2B продажи',owner:'Иван',status:'Новая',priority:'Средний',deadline:'2026-09-18'}],
 meetings:[
  {id:id(),title:'ELMA: путь лида',date:'2026-09-14',owner:'Коммерческая аналитика',status:'Запланирована',result:''},
  {id:id(),title:'Метрики сайта и источники',date:'2026-09-15',owner:'Маркетинг / Аналитика',status:'Запланирована',result:''}],
 kpi:[
  {id:id(),name:'Источники данных описаны',owner:'Коммерческая аналитика',plan:100,fact:45,unit:'%'},
  {id:id(),name:'Владельцы данных определены',owner:'Коммерческая аналитика',plan:12,fact:7,unit:'команд'},
  {id:id(),name:'Критические блокеры закрыты',owner:'Проект',plan:100,fact:60,unit:'%'}],
 blockers:[
  {id:id(),title:'Нет единого владельца схемы передачи лида ELMA → Альфа-Авто',owner:'IT / Бизнес',impact:'Высокое',deadline:'2026-09-17',status:'Открыт'},
  {id:id(),title:'Не утвержден Data Dictionary',owner:'DATA',impact:'Среднее',deadline:'2026-09-19',status:'Открыт'}],
 decisions:[
  {id:id(),title:'Утвердить единый набор обязательных полей лида',owner:'Коммерческий директор',deadline:'2026-09-18',status:'Ожидает решения',priority:'Высокий'},
  {id:id(),title:'Определить владельца качества данных',owner:'Коммерческий директор',deadline:'2026-09-20',status:'Ожидает решения',priority:'Средний'}],
 teams:[
  {id:id(),name:'Коммерческий блок',lead:'Коммерческий директор',area:'Приоритеты, KPI, решения'},
  {id:id(),name:'ELMA / CRM',lead:'Не назначен',area:'Лид, квалификация, интеграции'},
  {id:id(),name:'DATA / DWH / BI',lead:'Не назначен',area:'Модель данных, витрины, отчетность'},
  {id:id(),name:'Маркетинг / Метрики',lead:'Не назначен',area:'Источники, UTM, сайт, аналитика'}],
 directories:{taskStatuses:['Новая','В работе','На проверке','Готово','Отложено'],projectStatuses:['План','В работе','Под риском','Завершен'],priorities:['Низкий','Средний','Высокий','Критический']}
};}
function id(){return Math.random().toString(36).slice(2,10)}
function loadState(){try{const x=localStorage.getItem(STORAGE_KEY);return x?JSON.parse(x):seed()}catch(e){return seed()}}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function esc(v=''){return String(v).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]))}
function fmtDate(v){if(!v)return '—';const d=new Date(v+'T00:00:00');return new Intl.DateTimeFormat('ru-RU').format(d)}
function daysTo(v){const t=new Date(v+'T23:59:59'),n=new Date();return Math.ceil((t-n)/86400000)}
function badge(text){const s=String(text).toLowerCase();let c='';if(s.includes('готов')||s.includes('заверш')||s.includes('закры'))c='ok';else if(s.includes('риск')||s.includes('ожида')||s.includes('сред'))c='warn';else if(s.includes('крит')||s.includes('проср')||s.includes('высок'))c='danger';return `<span class="badge ${c}">${esc(text)}</span>`}

const content=document.getElementById('content');
const nav=document.getElementById('nav');
nav.addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(!b)return;document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));b.classList.add('active');currentView=b.dataset.view;render();document.getElementById('sidebar').classList.remove('open')});
document.getElementById('menuBtn').onclick=()=>document.getElementById('sidebar').classList.toggle('open');
document.getElementById('quickAddBtn').onclick=()=>openEntityModal(currentView==='dashboard'?'tasks':currentView);
document.getElementById('closeModalBtn').onclick=closeModal;
document.getElementById('modalBackdrop').addEventListener('click',e=>{if(e.target.id==='modalBackdrop')closeModal()});
document.getElementById('exportBtn').onclick=exportData;
document.getElementById('importInput').addEventListener('change',importData);

function render(){const [t,s]=titles[currentView];document.getElementById('pageTitle').textContent=t;document.getElementById('pageSubtitle').textContent=s;const fn={dashboard:renderDashboard,tasks:()=>renderCollection('tasks'),projects:()=>renderCollection('projects'),meetings:()=>renderCollection('meetings'),kpi:renderKpi,blockers:()=>renderCollection('blockers'),decisions:()=>renderCollection('decisions'),teams:()=>renderCollection('teams'),reports:renderReports,directories:renderDirectories}[currentView];fn();}

function renderDashboard(){
 const openBlockers=state.blockers.filter(x=>x.status!=='Закрыт').length;
 const waiting=state.decisions.filter(x=>x.status.includes('Ожида')).length;
 const overdue=state.tasks.filter(x=>x.status!=='Готово'&&daysTo(x.deadline)<0).length;
 const todayTasks=state.tasks.filter(x=>x.status!=='Готово').length;
 const avg=state.projects.length?Math.round(state.projects.reduce((a,b)=>a+Number(b.progress||0),0)/state.projects.length):0;
 content.innerHTML=`<div class="grid metrics">
 ${metric('Активные проекты',state.projects.filter(x=>x.status!=='Завершен').length,'портфель')}
 ${metric('Открытые задачи',todayTasks,overdue?`${overdue} просрочено`:'без просрочек')}
 ${metric('Блокеры',openBlockers,'требуют контроля')}
 ${metric('Решения',waiting,'ожидают руководителя')}
 ${metric('Готовность портфеля',avg+'%','средний прогресс')}
 </div>
 <div class="grid two-col">
  <div class="card"><div class="section-head"><h3>Сегодня в фокусе</h3><button class="btn secondary" onclick="go('tasks')">Все задачи</button></div>${focusTasks()}</div>
  <div class="card"><div class="section-head"><h3>Требуют решения</h3><button class="btn secondary" onclick="go('decisions')">Все решения</button></div>${decisionList()}</div>
 </div>
 <div class="grid two-col">
  <div class="card"><div class="section-head"><h3>Портфель проектов</h3><button class="btn secondary" onclick="go('projects')">Все проекты</button></div>${projectList()}</div>
  <div class="card"><div class="section-head"><h3>Критические блокеры</h3><button class="btn secondary" onclick="go('blockers')">Все блокеры</button></div>${blockerList()}</div>
 </div>`;
}
function metric(l,v,n){return `<div class="metric"><div class="metric-label">${esc(l)}</div><div class="metric-value">${esc(v)}</div><div class="metric-note">${esc(n)}</div></div>`}
function focusTasks(){const arr=[...state.tasks].sort((a,b)=>new Date(a.deadline)-new Date(b.deadline)).slice(0,6);return arr.length?`<div class="list">${arr.map(x=>`<div class="list-item"><div class="section-head"><div class="list-title">${esc(x.title)}</div>${badge(x.priority)}</div><div class="list-meta">${esc(x.project)} · ${esc(x.owner)} · до ${fmtDate(x.deadline)}</div></div>`).join('')}</div>`:'<div class="empty">Задач нет</div>'}
function decisionList(){return state.decisions.length?`<div class="list">${state.decisions.slice(0,5).map(x=>`<div class="list-item"><div class="list-title">${esc(x.title)}</div><div class="list-meta">${esc(x.owner)} · до ${fmtDate(x.deadline)}</div></div>`).join('')}</div>`:'<div class="empty">Нет решений</div>'}
function projectList(){return state.projects.length?`<div class="list">${state.projects.slice(0,5).map(x=>`<div class="list-item"><div class="section-head"><div class="list-title">${esc(x.name)}</div>${badge(x.status)}</div><div class="list-meta">${esc(x.owner)} · ${x.progress}%</div><div class="progress"><span style="width:${Math.min(100,Math.max(0,x.progress))}%"></span></div></div>`).join('')}</div>`:'<div class="empty">Нет проектов</div>'}
function blockerList(){return state.blockers.length?`<div class="list">${state.blockers.slice(0,5).map(x=>`<div class="list-item"><div class="section-head"><div class="list-title">${esc(x.title)}</div>${badge(x.impact)}</div><div class="list-meta">${esc(x.owner)} · срок ${fmtDate(x.deadline)}</div></div>`).join('')}</div>`:'<div class="empty">Нет блокеров</div>'}

function renderCollection(type){
 const configs={
 tasks:{title:'Задачи',heads:['Задача','Проект','Ответственный','Статус','Приоритет','Срок'],row:x=>[x.title,x.project,x.owner,badge(x.status),badge(x.priority),fmtDate(x.deadline)]},
 projects:{title:'Проекты',heads:['Проект','Владелец','Статус','Прогресс','Приоритет','Срок'],row:x=>[x.name,x.owner,badge(x.status),x.progress+'%',badge(x.priority),fmtDate(x.deadline)]},
 meetings:{title:'Встречи',heads:['Встреча','Дата','Команда','Статус','Результат'],row:x=>[x.title,fmtDate(x.date),x.owner,badge(x.status),x.result||'—']},
 blockers:{title:'Блокеры',heads:['Блокер','Ответственный','Влияние','Статус','Срок'],row:x=>[x.title,x.owner,badge(x.impact),badge(x.status),fmtDate(x.deadline)]},
 decisions:{title:'Решения',heads:['Вопрос','Кто решает','Приоритет','Статус','Срок'],row:x=>[x.title,x.owner,badge(x.priority),badge(x.status),fmtDate(x.deadline)]},
 teams:{title:'Команды',heads:['Команда','Руководитель / владелец','Зона ответственности'],row:x=>[x.name,x.lead,x.area]}
 };
 const c=configs[type],arr=state[type];
 content.innerHTML=`<div class="card"><div class="section-head"><h3>${c.title}</h3><button class="btn primary" onclick="openEntityModal('${type}')">+ Добавить</button></div><div class="toolbar"><input id="searchInput" placeholder="Поиск..." /></div><div id="tableWrap">${tableHtml(c,arr,type)}</div></div>`;
 document.getElementById('searchInput').addEventListener('input',e=>{const q=e.target.value.toLowerCase();const f=arr.filter(o=>Object.values(o).join(' ').toLowerCase().includes(q));document.getElementById('tableWrap').innerHTML=tableHtml(c,f,type)});
}
function tableHtml(c,arr,type){return arr.length?`<table class="table"><thead><tr>${c.heads.map(h=>`<th>${h}</th>`).join('')}<th></th></tr></thead><tbody>${arr.map(x=>`<tr>${c.row(x).map(v=>`<td>${v}</td>`).join('')}<td><button class="btn secondary" onclick="removeItem('${type}','${x.id}')">Удалить</button></td></tr>`).join('')}</tbody></table>`:'<div class="empty">Пока пусто</div>'}

function renderKpi(){content.innerHTML=`<div class="card"><div class="section-head"><h3>KPI</h3><button class="btn primary" onclick="openEntityModal('kpi')">+ Добавить KPI</button></div><div class="grid two-col">${state.kpi.map(x=>{const p=x.plan?Math.min(100,Math.round(x.fact/x.plan*100)):0;return `<div class="list-item"><div class="section-head"><div class="list-title">${esc(x.name)}</div><b>${p}%</b></div><div class="list-meta">${esc(x.owner)} · план ${esc(x.plan)} ${esc(x.unit)} · факт ${esc(x.fact)} ${esc(x.unit)}</div><div class="progress"><span style="width:${p}%"></span></div><div style="margin-top:10px"><button class="btn secondary" onclick="removeItem('kpi','${x.id}')">Удалить</button></div></div>`}).join('')}</div></div>`}
function renderReports(){
 const done=state.tasks.filter(x=>x.status==='Готово').length,total=state.tasks.length,open=total-done;
 content.innerHTML=`<div class="grid two-col"><div class="card"><h3>Недельная управленческая сводка</h3><div class="list"><div class="list-item"><div class="list-title">Что сделано</div><div class="list-meta">Закрыто задач: ${done}. Средняя готовность проектов: ${Math.round(state.projects.reduce((a,b)=>a+Number(b.progress||0),0)/(state.projects.length||1))}%.</div></div><div class="list-item"><div class="list-title">Что в работе</div><div class="list-meta">Открыто задач: ${open}. Активных проектов: ${state.projects.filter(x=>x.status!=='Завершен').length}.</div></div><div class="list-item"><div class="list-title">Что мешает</div><div class="list-meta">Открытых блокеров: ${state.blockers.filter(x=>x.status!=='Закрыт').length}.</div></div><div class="list-item"><div class="list-title">Что требует решения</div><div class="list-meta">Управленческих решений: ${state.decisions.filter(x=>x.status.includes('Ожида')).length}.</div></div></div></div><div class="card"><h3>Логика отчета</h3><div class="list"><div class="list-item">1. Что обещали на прошлой неделе</div><div class="list-item">2. Что выполнено и не выполнено</div><div class="list-item">3. Причины отклонений</div><div class="list-item">4. План следующей недели</div><div class="list-item">5. Решения, нужные от руководителя</div></div></div></div>`
}
function renderDirectories(){const d=state.directories;content.innerHTML=`<div class="grid two-col">${dirCard('Статусы задач','taskStatuses',d.taskStatuses)}${dirCard('Статусы проектов','projectStatuses',d.projectStatuses)}${dirCard('Приоритеты','priorities',d.priorities)}</div>`}
function dirCard(title,key,arr){return `<div class="card"><h3>${title}</h3><div class="list">${arr.map((x,i)=>`<div class="list-item section-head"><span>${esc(x)}</span><button class="btn secondary" onclick="removeDirectory('${key}',${i})">Удалить</button></div>`).join('')}</div><div class="toolbar" style="margin-top:12px"><input id="dir-${key}" placeholder="Новый вариант"><button class="btn primary" onclick="addDirectory('${key}')">Добавить</button></div></div>`}

window.go=function(v){currentView=v;document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.view===v));render()}
window.removeItem=function(type,itemId){state[type]=state[type].filter(x=>x.id!==itemId);save();render();toast('Удалено')}
window.addDirectory=function(key){const el=document.getElementById('dir-'+key);const v=el.value.trim();if(!v)return;state.directories[key].push(v);save();render();toast('Добавлено')}
window.removeDirectory=function(key,i){state.directories[key].splice(i,1);save();render()}

const schemas={
 tasks:[['title','Название','text'],['project','Проект','text'],['owner','Ответственный','text'],['status','Статус','select','taskStatuses'],['priority','Приоритет','select','priorities'],['deadline','Срок','date']],
 projects:[['name','Название проекта','text'],['owner','Владелец','text'],['status','Статус','select','projectStatuses'],['progress','Прогресс, %','number'],['priority','Приоритет','select','priorities'],['deadline','Срок','date']],
 meetings:[['title','Тема встречи','text'],['date','Дата','date'],['owner','Команда / владелец','text'],['status','Статус','text'],['result','Результат / решение','textarea']],
 kpi:[['name','Показатель','text'],['owner','Владелец','text'],['plan','План','number'],['fact','Факт','number'],['unit','Единица','text']],
 blockers:[['title','Блокер','textarea'],['owner','Ответственный','text'],['impact','Влияние','select','priorities'],['status','Статус','text'],['deadline','Срок','date']],
 decisions:[['title','Вопрос на решение','textarea'],['owner','Кто принимает решение','text'],['priority','Приоритет','select','priorities'],['status','Статус','text'],['deadline','Срок','date']],
 teams:[['name','Команда','text'],['lead','Руководитель / владелец','text'],['area','Зона ответственности','textarea']]
};
window.openEntityModal=function(type){if(!schemas[type]){type='tasks'};const f=document.getElementById('entityForm');document.getElementById('modalTitle').textContent='Добавить: '+(titles[type]?.[0]||type);f.dataset.type=type;f.innerHTML=schemas[type].map(([key,label,kind,dir])=>fieldHtml(key,label,kind,dir)).join('')+`<div class="form-actions"><button type="button" class="btn secondary" onclick="closeModal()">Отмена</button><button type="submit" class="btn primary">Сохранить</button></div>`;f.onsubmit=submitEntity;document.getElementById('modalBackdrop').classList.remove('hidden')}
function fieldHtml(key,label,kind,dir){const full=kind==='textarea'?' full':'';if(kind==='select'){return `<div class="field${full}"><label>${label}</label><select name="${key}" required>${state.directories[dir].map(x=>`<option>${esc(x)}</option>`).join('')}</select></div>`}if(kind==='textarea')return `<div class="field full"><label>${label}</label><textarea name="${key}" required></textarea></div>`;return `<div class="field${full}"><label>${label}</label><input name="${key}" type="${kind}" ${kind==='number'?'min="0"':''} required></div>`}
function submitEntity(e){e.preventDefault();const type=e.target.dataset.type;const obj={id:id()};new FormData(e.target).forEach((v,k)=>obj[k]=v);['progress','plan','fact'].forEach(k=>{if(k in obj)obj[k]=Number(obj[k])});state[type].push(obj);save();closeModal();go(type);toast('Сохранено')}
window.closeModal=closeModal;function closeModal(){document.getElementById('modalBackdrop').classList.add('hidden')}
function toast(t){const x=document.getElementById('toast');x.textContent=t;x.classList.remove('hidden');setTimeout(()=>x.classList.add('hidden'),1800)}
function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='atom-bcc-export.json';a.click();URL.revokeObjectURL(a.href)}
function importData(e){const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);Object.keys(state).forEach(k=>delete state[k]);Object.assign(state,d);save();render();toast('Импорт завершен')}catch(err){toast('Ошибка файла')}};r.readAsText(file);e.target.value=''}

render();
