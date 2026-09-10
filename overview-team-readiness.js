(function(){
  const STATE_KEY='atom-raci-requirement-state-v2';
  const CUSTOM_KEY='atom-raci-custom-requirements-v2';
  const STATUS_PROGRESS={'Не запрошено':0,'Запрос подготовлен':10,'Запрос отправлен':25,'В работе':50,'Ответ получен':75,'Требует уточнения':60,'Блокер':50,'Готово':100};
  const BASE_COUNTS={
    'Коммерческий блок':5,'B2B продажи':8,'B2C продажи':8,'Маркетинг':8,'Сайт':8,'Метрики':8,
    '1 линия':8,'2 линия':8,'ELMA':11,'Альфа-Авто':12,'1С / финансы':11,'DATA / DWH':11,'BI':10,'ИБ':11
  };
  let queued=false;

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'')||fallback}catch{return fallback}};
  const today=()=>new Date().toISOString().slice(0,10);

  function teams(){return Array.isArray(DATA?.teams)?DATA.teams.map(r=>r[0]):Object.keys(BASE_COUNTS)}
  function owner(team){const rows=Array.isArray(DATA?.teams)?DATA.teams:[];const i=rows.findIndex(r=>r[0]===team);return i>=0?(localStorage.getItem(`atom-responsible-${i}`)||'Не назначен'):'Не назначен'}
  function state(team,id){const all=read(STATE_KEY,{});return {...{status:'Не запрошено',dueDate:'',responseDate:''},...(all[team]?.[id]||{})}}
  function ids(team){const base=Array.from({length:BASE_COUNTS[team]||0},(_,i)=>`base-${i+1}`);const custom=(read(CUSTOM_KEY,{})[team]||[]).map(x=>x.id);return [...base,...custom]}
  function overdue(s){return Boolean(s.dueDate)&&s.dueDate<today()&&!['Ответ получен','Готово'].includes(s.status)}
  function summary(team){
    const list=ids(team),states=list.map(id=>state(team,id));
    const total=list.length||1;
    const progress=Math.round(states.reduce((sum,s)=>sum+(STATUS_PROGRESS[s.status]||0),0)/total);
    return {
      team,total:list.length,progress,
      done:states.filter(s=>s.status==='Готово').length,
      work:states.filter(s=>!['Не запрошено','Готово'].includes(s.status)).length,
      problem:states.filter(s=>s.status==='Блокер'||overdue(s)).length,
      owner:owner(team)
    };
  }

  function ensureStyles(){
    if(document.getElementById('overview-team-readiness-css'))return;
    const s=document.createElement('style');s.id='overview-team-readiness-css';s.textContent=`
      .otr-wrap{margin-top:16px}.otr-head{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:10px;flex-wrap:wrap}.otr-head h2{margin:0;font-size:18px}.otr-head small{color:var(--muted)}
      .otr-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.otr-card{background:#fff;border:1px solid var(--line);border-radius:11px;padding:11px 12px;text-align:left;cursor:pointer;font:inherit;color:var(--text);transition:border-color .15s,background .15s}.otr-card:hover{border-color:#9fded7;background:#fbfefe}.otr-card:focus-visible{outline:2px solid var(--accent);outline-offset:2px}.otr-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.otr-name{font-size:12px;font-weight:700;line-height:1.25}.otr-pct{font-size:19px;font-weight:700;white-space:nowrap}.otr-owner{margin-top:3px;font-size:9px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.otr-progress{height:5px;background:#e6eeee;border-radius:99px;overflow:hidden;margin:9px 0 7px}.otr-progress i{display:block;height:100%;background:var(--accent);border-radius:99px}.otr-meta{display:flex;justify-content:space-between;gap:6px;font-size:9px;color:#66797a;flex-wrap:wrap}.otr-problem{color:#a53636;font-weight:700}.otr-average{display:flex;align-items:center;gap:7px;font-size:11px;color:#53696a}.otr-average b{font-size:16px;color:var(--text)}
      @media(max-width:1200px){.otr-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:850px){.otr-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:520px){.otr-grid{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function render(){
    if(typeof DATA==='undefined'||!document.querySelector('#app .project-start-card'))return;
    ensureStyles();
    const rows=teams().map(summary);
    const avg=rows.length?Math.round(rows.reduce((n,x)=>n+x.progress,0)/rows.length):0;
    let wrap=document.getElementById('overview-team-readiness');
    if(!wrap){wrap=document.createElement('section');wrap.id='overview-team-readiness';wrap.className='otr-wrap';}
    wrap.innerHTML=`<div class="otr-head"><div><h2>Готовность по командам</h2><small>Рассчитывается по статусам всех пунктов «Что нужно» в RACI</small></div><div class="otr-average">Средняя готовность <b>${avg}%</b></div></div><div class="otr-grid">${rows.map(x=>`<button type="button" class="otr-card" data-otr-team="${esc(x.team)}" title="Открыть подробный RACI команды"><div class="otr-top"><div style="min-width:0"><div class="otr-name">${esc(x.team)}</div><div class="otr-owner">${esc(x.owner)}</div></div><div class="otr-pct">${x.progress}%</div></div><div class="otr-progress"><i style="width:${Math.max(0,Math.min(100,x.progress))}%"></i></div><div class="otr-meta"><span>Готово ${x.done}/${x.total}</span><span>В работе ${x.work}</span>${x.problem?`<span class="otr-problem">Проблем ${x.problem}</span>`:'<span>Без просрочек</span>'}</div></button>`).join('')}</div>`;
    const todayBlock=document.querySelector('#app [data-overview-today]');
    const grid=document.querySelector('#app .grid');
    const anchor=todayBlock||grid;
    if(anchor&&wrap.previousElementSibling!==anchor)anchor.insertAdjacentElement('afterend',wrap);
  }

  document.addEventListener('click',e=>{
    const card=e.target.closest('[data-otr-team]');if(!card)return;
    history.replaceState(null,'','#teams');
    if(window.ATOM_RACI_REQUIREMENTS?.open)window.ATOM_RACI_REQUIREMENTS.open(card.dataset.otrTeam);
    else document.querySelector('.nav[data-view="teams"]')?.click();
  });

  const root=document.getElementById('app');
  if(root)new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;render();});}).observe(root,{childList:true,subtree:true});
  window.addEventListener('atom-sync-update',render);
  window.addEventListener('atom-project-reconciled',render);
  setInterval(()=>{if(document.querySelector('#app .project-start-card'))render();},20000);
  setTimeout(render,900);
  window.ATOM_OVERVIEW_TEAM_READINESS={render,summary};
})();