(function(){
  const VERSION='2.0.0';
  let queued=false;
  let lastSig='';

  const core=()=>window.ATOM_CORE;
  const activity=()=>window.ATOM_TEAM_ACTIVITY;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const pad=n=>String(n).padStart(2,'0');
  const excluded=id=>localStorage.getItem(`atom-requirement-not-actual-${id}`)==='1';
  const activeTeam=team=>activity()?.isActive?activity().isActive(team):true;

  function fmtDateTime(value,withTime=true){
    if(value===null||value===undefined||value==='')return'Не задано';
    const d=value instanceof Date?value:new Date(typeof value==='number'?value:(String(value).includes('T')?value:`${value}T00:00:00`));
    if(!Number.isFinite(d.getTime()))return String(value);
    const date=`${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`;
    return withTime?`${date} ${pad(d.getHours())}:${pad(d.getMinutes())}`:date;
  }

  function bounds(period){
    let start=Number(period?.start),end=Number(period?.end);
    if(period?.startAt){const x=new Date(period.startAt).getTime();if(Number.isFinite(x))start=x;}
    else if(period?.startDate){const x=new Date(`${period.startDate}T00:00:00`).getTime();if(Number.isFinite(x))start=x;}
    if(period?.endAt){const x=new Date(period.endAt).getTime();if(Number.isFinite(x))end=x;}
    else if(period?.endDate){const x=new Date(`${period.endDate}T23:59:59`).getTime();if(Number.isFinite(x))end=x;}
    return{start:Number.isFinite(start)?start:Number.MIN_SAFE_INTEGER,end:Number.isFinite(end)?end:Number.MAX_SAFE_INTEGER};
  }

  function statusLabel(req,state){
    const excludedLabel=localStorage.getItem(`atom-requirement-excluded-label-${req.id}`);
    if(excludedLabel)return excludedLabel;
    const custom=localStorage.getItem(`atom-requirement-custom-status-${req.id}`);
    if(custom)return custom;
    return core()?.statusLabel?.(state.statusId)||core()?.STATUS?.find(x=>x.id===state.statusId)?.label||state.statusId||'Не запрошено';
  }

  function statusClass(state,label){
    const id=state?.statusId||'';
    if(id==='done'||label==='Готово')return'done';
    if(id==='blocker'||label==='Блокер')return'blocker';
    if(id==='clarify'||label==='Требует уточнения')return'clarify';
    if(id==='in_progress'||label==='В работе')return'work';
    if(id==='answered'||label==='Ответ получен')return'answered';
    if(id==='sent'||label==='Запрос отправлен')return'sent';
    if(id==='prepared'||label==='Запрос подготовлен')return'prepared';
    return'neutral';
  }

  function remaining(endTs,state){
    if(state?.statusId==='done')return'Готово';
    if(!Number.isFinite(endTs)||endTs===Number.MAX_SAFE_INTEGER)return'Нет срока';
    let ms=endTs-Date.now();
    if(ms<0)return'Просрочено';
    const days=Math.floor(ms/86400000);ms-=days*86400000;
    const hours=Math.floor(ms/3600000);ms-=hours*3600000;
    const mins=Math.max(0,Math.floor(ms/60000));
    const parts=[];
    if(days)parts.push(`${days} дн.`);
    if(hours||days)parts.push(`${hours} ч.`);
    if(!days&&mins)parts.push(`${mins} мин.`);
    return parts.length?parts.join(' '):'< 1 мин.';
  }

  function rows(){
    const c=core();if(!c)return[];
    const today=new Date();today.setHours(0,0,0,0);
    const dayStart=today.getTime(),dayEnd=dayStart+86400000-1;
    const seen=new Set(),out=[];
    (c.teams?.()||[]).forEach(team=>{
      (c.requirementsByTeam?.(team)||[]).forEach(req=>{
        if(seen.has(req.id)||excluded(req.id)||!activeTeam(req.team))return;
        seen.add(req.id);
        const state=c.getState(req.id);
        if(state.statusId==='done')return;
        const p=c.periodForRequirement(req),b=bounds(p);
        // "Сегодня в работе" = требование, период которого пересекает сегодняшний день.
        // Будущие требования и уже завершившиеся до начала сегодняшнего дня сюда не попадают.
        const activeToday=b.start<=dayEnd&&b.end>=dayStart;
        if(!activeToday)return;
        const owner=c.personName(state.respondentId)||c.teamOwner(req.team)||'Не назначен';
        const status=statusLabel(req,state);
        out.push({req,state,p,b,owner,status,comment:String(state.comment||'').trim()});
      });
    });
    return out.sort((a,b)=>a.b.end-b.b.end||String(a.req.team).localeCompare(String(b.req.team),'ru')||String(a.req.text).localeCompare(String(b.req.text),'ru'));
  }

  function styles(){
    if(document.getElementById('overview-today-requirements-css'))return;
    const s=document.createElement('style');s.id='overview-today-requirements-css';s.textContent=`
      #core-today-work{padding:12px!important}
      #core-today-work .today-req-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:9px}
      #core-today-work .today-req-head h3{margin:0;font-size:18px}#core-today-work .today-req-head small{color:var(--muted);font-size:10px}
      #core-today-work .today-req-wrap{overflow:auto;border:1px solid var(--line);border-radius:10px;background:#fff}
      #core-today-work .today-req-table{width:100%;min-width:1260px;border-collapse:collapse}
      #core-today-work .today-req-table th,#core-today-work .today-req-table td{padding:8px 9px;border-bottom:1px solid var(--line);vertical-align:top;text-align:left;font-size:10px}
      #core-today-work .today-req-table th{background:#edf3f3;color:#425959;font-size:9px;white-space:nowrap}
      #core-today-work .today-req-table tbody tr{cursor:pointer;background:#fff}
      #core-today-work .today-req-table tbody tr:hover{background:#fbfefe}
      #core-today-work .today-req-table tbody tr:last-child td{border-bottom:0}
      #core-today-work .today-req-team{font-weight:700;white-space:nowrap}
      #core-today-work .today-req-stage{font-weight:700;min-width:150px}
      #core-today-work .today-req-period{white-space:nowrap;line-height:1.4}
      #core-today-work .today-req-close{white-space:nowrap;font-weight:700}
      #core-today-work .today-req-remaining{white-space:nowrap;font-weight:700;color:#526a6b}
      #core-today-work .today-req-owner{white-space:nowrap}
      #core-today-work .today-req-comment{min-width:190px;white-space:pre-wrap;color:#526a6b}
      #core-today-work .today-status{display:inline-block;padding:4px 7px;border-radius:7px;font-size:9px;font-weight:700;white-space:nowrap;background:#edf2f2;color:#587070}
      #core-today-work .today-status.work{background:#dff8f5;color:#0d756c}#core-today-work .today-status.blocker{background:#fdeaea;color:#a53636}#core-today-work .today-status.done{background:#e5f7ef;color:#227457}#core-today-work .today-status.clarify{background:#fff1cf;color:#8a6500}#core-today-work .today-status.answered{background:#eee8ff;color:#6650a5}#core-today-work .today-status.sent{background:#e6f0ff;color:#315f9e}#core-today-work .today-status.prepared{background:#e9f5ff;color:#387391}
      #core-today-work .today-req-empty{padding:14px;color:var(--muted);font-size:11px}
    `;document.head.appendChild(s);
  }

  function periodText(x){
    const p=x.p||{};
    if(p.startAt||p.endAt)return `${fmtDateTime(p.startAt||x.b.start,true)} - ${fmtDateTime(p.endAt||x.b.end,true)}`;
    return `${fmtDateTime(x.b.start,false)} - ${fmtDateTime(x.b.end,false)}`;
  }

  function closingText(x){
    const p=x.p||{};
    return p.endAt?fmtDateTime(p.endAt,true):fmtDateTime(x.b.end,false);
  }

  function render(){
    const host=document.getElementById('core-today-work');if(!host||!document.querySelector('#app .project-start-card'))return;
    styles();
    const list=rows();
    const sig=JSON.stringify(list.map(x=>[x.req.id,x.state.statusId,x.status,x.b.start,x.b.end,x.owner,x.comment]));
    const hasRequirementsMarkup=Boolean(host.querySelector('.today-req-table,.today-req-empty'));
    if(sig===lastSig&&host.dataset.todaySource==='requirements'&&hasRequirementsMarkup)return;
    lastSig=sig;host.dataset.todaySource='requirements';
    host.innerHTML=`<div class="today-req-head"><div><h3>Сегодня в работе</h3><small>Источник: Управление проектом → Требования · показываются требования, период которых пересекает сегодняшний день</small></div><small>${list.length} поз.</small></div>${list.length?`<div class="today-req-wrap"><table class="today-req-table"><thead><tr><th>Команда</th><th style="min-width:250px">Что нужно</th><th>Этап Ганта</th><th>Период</th><th>Дата закрытия</th><th>До закрытия</th><th>Статус</th><th>Ответственный за ответ</th><th>Комментарий</th></tr></thead><tbody>${list.map(x=>`<tr data-today-team="${esc(x.req.team)}"><td class="today-req-team">${esc(x.req.team)}</td><td>${esc(x.req.text)}</td><td class="today-req-stage">${x.req.stageId}. ${esc(core().stageName(x.req.stageId))}</td><td class="today-req-period">${esc(periodText(x))}${x.p?.customTimes?'<br><span style="font-size:8px;color:var(--muted)">индивидуальный срок</span>':''}</td><td class="today-req-close">${esc(closingText(x))}</td><td class="today-req-remaining">${esc(remaining(x.b.end,x.state))}</td><td><span class="today-status ${statusClass(x.state,x.status)}">${esc(x.status)}</span></td><td class="today-req-owner">${esc(x.owner)}</td><td class="today-req-comment">${esc(x.comment||'')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="today-req-empty">На сегодня требований в работе нет.</div>'}`;
  }

  document.addEventListener('click',e=>{
    const row=e.target.closest('#core-today-work [data-today-team]');if(!row)return;
    const team=row.dataset.todayTeam;
    if(window.ATOM_OVERVIEW_TEAM_REQUIREMENTS_LINK?.goToRequirements)window.ATOM_OVERVIEW_TEAM_REQUIREMENTS_LINK.goToRequirements(team);
    else{sessionStorage.setItem('atom-requirements-team-filter-pending',team);location.hash='#management/requirements';}
  });

  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;render();});}
  new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});
  ['hashchange','atom-view-rendered','atom-sync-update','atom-core-data-changed','atom-team-activity-changed','atom-project-reconciled'].forEach(ev=>window.addEventListener(ev,queue));
  window.ATOM_OVERVIEW_TODAY_REQUIREMENTS={version:VERSION,render,rows};
  setTimeout(queue,250);setTimeout(queue,700);setTimeout(queue,1400);
})();