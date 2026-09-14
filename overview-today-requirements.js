(function(){
  const VERSION='1.0.0';
  let queued=false;
  let lastSig='';

  const core=()=>window.ATOM_CORE;
  const activity=()=>window.ATOM_TEAM_ACTIVITY;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const pad=n=>String(n).padStart(2,'0');
  const fmtDate=ts=>{const d=new Date(ts);return Number.isFinite(d.getTime())?`${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`:'срок не задан'};
  const excluded=id=>localStorage.getItem(`atom-requirement-not-actual-${id}`)==='1';
  const activeTeam=team=>activity()?.isActive?activity().isActive(team):true;

  function bounds(period){
    let start=Number(period?.start),end=Number(period?.end);
    if(period?.startAt){const x=new Date(period.startAt).getTime();if(Number.isFinite(x))start=x;}
    else if(period?.startDate){const x=new Date(`${period.startDate}T00:00:00`).getTime();if(Number.isFinite(x))start=x;}
    if(period?.endAt){const x=new Date(period.endAt).getTime();if(Number.isFinite(x))end=x;}
    else if(period?.endDate){const x=new Date(`${period.endDate}T23:59:59`).getTime();if(Number.isFinite(x))end=x;}
    return{start:Number.isFinite(start)?start:Number.MIN_SAFE_INTEGER,end:Number.isFinite(end)?end:Number.MAX_SAFE_INTEGER};
  }

  function statusLabel(req,state){
    const custom=localStorage.getItem(`atom-requirement-custom-status-${req.id}`);
    if(custom)return custom;
    return core()?.statusLabel?.(state.statusId)||core()?.STATUS?.find(x=>x.id===state.statusId)?.label||state.statusId||'Не запрошено';
  }

  function rows(){
    const c=core();if(!c)return[];
    const today=new Date();today.setHours(0,0,0,0);const dayStart=today.getTime(),dayEnd=dayStart+86400000-1;
    const seen=new Set(),out=[];
    (c.teams?.()||[]).forEach(team=>{
      (c.requirementsByTeam?.(team)||[]).forEach(req=>{
        if(seen.has(req.id)||excluded(req.id)||!activeTeam(req.team))return;
        seen.add(req.id);
        const state=c.getState(req.id);if(state.statusId==='done')return;
        const p=c.periodForRequirement(req),b=bounds(p);
        const started=b.start<=dayEnd;
        const activeToday=started&&b.end>=dayStart;
        const overdue=started&&b.end<dayStart;
        if(!activeToday&&!overdue)return;
        const owner=c.personName(state.respondentId)||c.teamOwner(req.team)||'Не назначен';
        out.push({req,state,p,b,overdue,owner,status:statusLabel(req,state)});
      });
    });
    return out.sort((a,b)=>Number(b.overdue)-Number(a.overdue)||a.b.end-b.b.end||String(a.req.team).localeCompare(String(b.req.team),'ru'));
  }

  function styles(){
    if(document.getElementById('overview-today-requirements-css'))return;
    const s=document.createElement('style');s.id='overview-today-requirements-css';s.textContent=`
      #core-today-work .today-req-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-end;flex-wrap:wrap}
      #core-today-work .today-req-head h3{margin:0}#core-today-work .today-req-head small{color:var(--muted);font-size:10px}
      #core-today-work .today-req-row{width:100%;display:grid;grid-template-columns:170px minmax(260px,1fr) 220px 135px;gap:10px;align-items:center;padding:9px 10px;background:#fff;border:1px solid var(--line);border-radius:8px;text-align:left;font:inherit;color:var(--text);cursor:pointer}
      #core-today-work .today-req-row:hover{border-color:#9fded7;background:#fbfefe}#core-today-work .today-req-team{font-weight:700;font-size:11px}#core-today-work .today-req-task{font-size:11px}#core-today-work .today-req-meta{font-size:9px;color:var(--muted);margin-top:3px}#core-today-work .today-req-status{justify-self:end;font-size:9px;font-weight:700;padding:4px 7px;border-radius:999px;background:#e3faf7;color:#0f6962;white-space:nowrap}#core-today-work .today-req-status.overdue{background:#fdeaea;color:#a53636}
      @media(max-width:900px){#core-today-work .today-req-row{grid-template-columns:1fr}#core-today-work .today-req-status{justify-self:start}}
    `;document.head.appendChild(s);
  }

  function render(){
    const host=document.getElementById('core-today-work');if(!host||!document.querySelector('#app .project-start-card'))return;
    styles();
    const list=rows();
    const sig=JSON.stringify(list.map(x=>[x.req.id,x.state.statusId,x.status,x.b.start,x.b.end,x.owner,x.overdue]));
    if(sig===lastSig&&host.dataset.todaySource==='requirements')return;
    lastSig=sig;host.dataset.todaySource='requirements';
    host.innerHTML=`<div class="today-req-head"><div><h3>Сегодня в работе</h3><small>Источник: Управление проектом → Требования</small></div><small>${list.length} поз.</small></div><div class="core-today-list">${list.length?list.map(x=>`<button type="button" class="today-req-row" data-today-team="${esc(x.req.team)}"><div class="today-req-team">${esc(x.req.team)}</div><div><div class="today-req-task">${esc(x.req.text)}</div><div class="today-req-meta">Этап ${x.req.stageId}. ${esc(core().stageName(x.req.stageId))}</div></div><div><div class="today-req-task">${esc(x.owner)}</div><div class="today-req-meta">Срок: ${fmtDate(x.b.end)}</div></div><span class="today-req-status ${x.overdue?'overdue':''}">${x.overdue?'Просрочено':esc(x.status)}</span></button>`).join(''):'<div style="color:var(--muted);font-size:11px">На сегодня активных требований нет.</div>'}</div>`;
  }

  document.addEventListener('click',e=>{
    const row=e.target.closest('[data-today-team]');if(!row)return;
    const team=row.dataset.todayTeam;
    if(window.ATOM_OVERVIEW_TEAM_REQUIREMENTS_LINK?.goToRequirements)window.ATOM_OVERVIEW_TEAM_REQUIREMENTS_LINK.goToRequirements(team);
    else{sessionStorage.setItem('atom-requirements-team-filter',team);location.hash='#management/requirements';}
  });

  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;render();});}
  new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});
  ['hashchange','atom-view-rendered','atom-sync-update','atom-core-data-changed','atom-team-activity-changed','atom-project-reconciled'].forEach(ev=>window.addEventListener(ev,queue));
  window.ATOM_OVERVIEW_TODAY_REQUIREMENTS={version:VERSION,render,rows};
  setTimeout(queue,400);setTimeout(queue,1200);
})();