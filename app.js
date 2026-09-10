const API='https://ytdacypygsfalkixhemj.supabase.co/functions/v1/commercial-analytics-api';
const state={tasks:[],leads:[],blockers:[],meetings:[],history:[]};
const labels={backlog:'Бэклог',planned:'Запланировано',in_progress:'В работе',review:'Проверка',done:'Готово'};

async function call(table,params=''){
  const r=await fetch(`${API}?table=${table}${params?'&'+params:''}`);
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}

async function send(table,method,data,params=''){
  const r=await fetch(`${API}?table=${table}${params?'&'+params:''}`,{method,headers:{'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});
  if(!r.ok) throw new Error(await r.text());
  const t=await r.text();
  return t?JSON.parse(t):null;
}

function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function today(){return new Date().toISOString().slice(0,10)}
function date(v){return v?new Date(v).toLocaleDateString('ru-RU'):''}
function sync(ok,text){document.getElementById('syncDot').className='sync-dot '+(ok?'online':'offline');document.getElementById('syncText').textContent=text}

async function load(){
  sync(false,'Синхронизация...');
  try{
    const [tasks,leads,blockers,meetings,history]=await Promise.all([
      call('ca_tasks','select=*&order=created_at.desc'),
      call('ca_leads','select=*&order=created_at.desc'),
      call('ca_blockers','select=*&order=created_at.desc'),
      call('ca_meetings','select=*&order=meeting_date.desc'),
      call('ca_history','select=*&order=created_at.desc&limit=20')
    ]);
    Object.assign(state,{tasks,leads,blockers,meetings,history});
    render();
    sync(true,'Данные синхронизированы');
  }catch(e){console.error(e);sync(false,'Ошибка синхронизации')}
}

function render(){
  const active=state.tasks.filter(x=>x.status!=='done');
  const overdue=active.filter(x=>x.due_date&&x.due_date<today()).length;
  const done=state.tasks.filter(x=>x.status==='done').length;
  const ready=state.tasks.length?Math.round(done/state.tasks.length*100):0;
  metricTasks.textContent=state.tasks.length;
  metricInProgress.textContent=state.tasks.filter(x=>x.status==='in_progress').length;
  metricOverdue.textContent=overdue;
  metricBlockers.textContent=state.blockers.filter(x=>x.status!=='resolved').length;
  metricLeads.textContent=state.leads.length;
  metricReadiness.textContent=ready+'%';
  readinessBar.style.width=ready+'%';

  ['backlog','planned','in_progress','review','done'].forEach(s=>{
    const list=state.tasks.filter(x=>x.status===s);
    document.getElementById('count-'+s).textContent=list.length;
    document.getElementById('col-'+s).innerHTML=list.map(x=>`<article class="task-card" draggable="true" data-task-id="${x.id}"><h4>${esc(x.title)}</h4><div class="task-meta">${x.direction?`<span>${esc(x.direction)}</span>`:''}${x.owner?`<span>${esc(x.owner)}</span>`:''}${x.due_date?`<span>до ${date(x.due_date)}</span>`:''}</div></article>`).join('')||'<div class="column-empty">Нет задач</div>';
  });

  leadsTable.innerHTML=state.leads.map(x=>`<tr><td><strong>${esc(x.company)}</strong></td><td>${esc(x.contact||'')}</td><td>${esc(x.source||'')}</td><td>${esc(x.stage||'')}</td><td>${esc(x.manager||'')}</td><td>${esc(x.next_action||'')}</td><td></td></tr>`).join('')||'<tr><td colspan="7" class="table-empty">Лидов пока нет</td></tr>';
  blockersList.innerHTML=state.blockers.map(x=>`<article class="blocker-card"><div><h3>${esc(x.title)}</h3><p>${esc(x.description||'')}</p></div></article>`).join('')||'<div class="panel empty-state">Блокеров пока нет</div>';
  meetingsTable.innerHTML=state.meetings.map(x=>`<tr><td>${new Date(x.meeting_date).toLocaleString('ru-RU')}</td><td>${esc(x.team)}</td><td>${esc(x.agenda||'')}</td><td>${esc(x.result||'')}</td><td>${esc(x.next_steps||'')}</td><td></td></tr>`).join('')||'<tr><td colspan="6" class="table-empty">Встреч пока нет</td></tr>';

  bindDnD();
}

function bindDnD(){
  document.querySelectorAll('.task-card').forEach(c=>c.ondragstart=e=>e.dataTransfer.setData('text/plain',c.dataset.taskId));
  document.querySelectorAll('.kanban-column').forEach(c=>{
    c.ondragover=e=>e.preventDefault();
    c.ondrop=async e=>{e.preventDefault();await send('ca_tasks','PATCH',{status:c.dataset.status,updated_at:new Date().toISOString()},`id=eq.${e.dataTransfer.getData('text/plain')}`);load()};
  });
}

document.querySelectorAll('.nav-btn').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.nav-btn').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.section').forEach(x=>x.classList.remove('active-section'));
  b.classList.add('active');document.getElementById(b.dataset.section).classList.add('active-section');
});
document.querySelectorAll('[data-open-modal]').forEach(b=>b.onclick=()=>document.getElementById(b.dataset.openModal).classList.add('open'));
document.querySelectorAll('[data-close-modal]').forEach(b=>b.onclick=()=>b.closest('.modal').classList.remove('open'));

function values(f){return Object.fromEntries(new FormData(f).entries())}
taskForm.onsubmit=async e=>{e.preventDefault();const x=values(e.target);await send('ca_tasks','POST',x);e.target.reset();e.target.closest('.modal').classList.remove('open');load()};
leadForm.onsubmit=async e=>{e.preventDefault();const x=values(e.target);await send('ca_leads','POST',x);e.target.reset();e.target.closest('.modal').classList.remove('open');load()};
blockerForm.onsubmit=async e=>{e.preventDefault();const x=values(e.target);await send('ca_blockers','POST',x);e.target.reset();e.target.closest('.modal').classList.remove('open');load()};
meetingForm.onsubmit=async e=>{e.preventDefault();const x=values(e.target);x.meeting_date=new Date(x.meeting_date).toISOString();await send('ca_meetings','POST',x);e.target.reset();e.target.closest('.modal').classList.remove('open');load()};
refreshBtn.onclick=load;
load();