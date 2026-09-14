(function(){
  const VERSION='1.1.0';
  const DAY=86400000;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const read=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||'');return v??f}catch{return f}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const core=()=>window.ATOM_CORE;
  const activity=()=>window.ATOM_TEAM_ACTIVITY;

  function relevantStages(){
    const a=activity();
    return Array.from({length:12},(_,i)=>i+1).filter(id=>a?.stageRelevant?.(id));
  }

  function closeInvalidAutoBlockers(){
    const c=core(),a=activity();
    if(!c||!a)return;
    const rows=read('atom-blockers',[]);
    let changed=false;
    rows.forEach(b=>{
      if(!b||['Решен','Закрыт'].includes(b.status))return;
      let shouldClose=false,reason='';
      if(String(b.autoKey||'').startsWith('CORE:RACI:')){
        const id=String(b.autoKey).slice('CORE:RACI:'.length),req=c.requirement?.(id);
        if(req&&!a.isActive(req.team)){shouldClose=true;reason='Команда не активна и исключена из расчета проекта.';}
      }
      if(String(b.autoKey||'').startsWith('Гант: ')){
        const name=String(b.autoKey).slice('Гант: '.length),task=window.ATOM_GANTT?.tasks?.find(x=>x.name===name);
        if(task){const s=c.stageSummary(task.id);if(!s.relevant||!s.problem){shouldClose=true;reason=!s.relevant?'Этап исключен из расчета: связанных активных команд нет.':'Этап больше не просрочен и не заблокирован.';}}
      }
      if(String(b.autoKey||'').startsWith('Этап: ')){
        const name=String(b.autoKey).slice('Этап: '.length),task=window.ATOM_GANTT?.tasks?.find(x=>x.name===name);
        if(task){const s=c.stageSummary(task.id);if(!s.relevant||!s.problem){shouldClose=true;reason=!s.relevant?'Этап не активен и исключен из расчета проекта.':'Расчетный статус этапа больше не является блокером.';}}
      }
      if(shouldClose){
        b.status='Решен';
        if(reason&&!String(b.comment||'').includes(reason))b.comment=(b.comment?b.comment+'\n':'')+reason;
        changed=true;
      }
    });
    if(changed)write('atom-blockers',rows);
  }

  function patchOverview(){
    const c=core(),a=activity();
    if(!c||!a||!document.querySelector('#app .project-start-card'))return;
    const activeTeams=c.teams().filter(t=>a.isActive(t));
    const summaries=activeTeams.map(t=>c.teamSummary(t));
    const avg=summaries.length?Math.round(summaries.reduce((n,x)=>n+x.progress,0)/summaries.length):0;
    const head=document.querySelector('#core-team-readiness .core-team-head');
    if(head){
      const right=head.lastElementChild;
      if(right)right.innerHTML=`Средняя готовность активных команд <b>${avg}%</b>`;
      const small=head.querySelector('small');if(small)small.textContent=`Активных команд: ${activeTeams.length} из ${c.teams().length}`;
    }

    document.querySelectorAll('.core-team-card').forEach(card=>{
      const team=card.querySelector('.core-team-name')?.textContent.trim();if(!team)return;
      const inactive=!a.isActive(team),sum=c.teamSummary(team);
      card.classList.toggle('team-inactive',inactive);
      const pct=card.querySelector('.core-team-pct');if(pct)pct.textContent=inactive?'Не активна':`${sum.progress}%`;
      const bar=card.querySelector('.core-team-progress i');if(bar)bar.style.width=`${inactive?0:sum.progress}%`;
      const meta=card.querySelector('.core-team-meta');
      if(meta&&inactive)meta.innerHTML='<span>Исключена из расчета</span><span>Требования сохранены</span>';
      let badge=card.querySelector('.team-inactive-badge');
      if(inactive&&!badge){badge=document.createElement('span');badge.className='team-inactive-badge';badge.textContent='Не активна';card.appendChild(badge);}
      if(!inactive&&badge)badge.remove();
    });

    const relevant=relevantStages(),done=relevant.filter(id=>c.stageSummary(id).progress>=100).length;
    document.querySelectorAll('#app .core-extra-kpi').forEach(card=>{
      const label=card.querySelector('.label')?.textContent.trim(),value=card.querySelector('.value');
      if(label==='Этапы завершены'&&value)value.textContent=`${done} / ${relevant.length}`;
    });

    const today=document.getElementById('core-today-work');
    if(today){
      const now=Date.now(),week=now+7*DAY;
      const active=(window.ATOM_GANTT?.getAllStates?.()||[]).filter(s=>a.stageRelevant(s.id)&&c.stageSummary(s.id).status!=='Завершено'&&new Date(s.startDate).getTime()<=week&&new Date(s.due).getTime()>=now).slice(0,6);
      const list=today.querySelector('.core-today-list');
      if(list)list.innerHTML=active.length?active.map(s=>`<div class="core-today-row"><b>${esc(s.name)}</b><small>${esc(c.dateInput(s.startDate))} - ${esc(c.dateInput(s.due))}</small><span>${c.stageSummary(s.id).progress}%</span></div>`).join(''):'<div style="color:var(--muted);font-size:11px">Активных этапов на текущую неделю нет.</div>';
    }
  }

  function patchGantt(){
    const c=core(),a=activity();if(!c||!a||!document.querySelector('.gantt-dashboard'))return;
    const relevant=relevantStages();
    document.querySelectorAll('.gantt-row').forEach(row=>{
      const name=row.querySelector('.gantt-name-cell b')?.textContent.trim();
      const task=window.ATOM_GANTT?.tasks?.find(x=>x.name===name);if(!task)return;
      const isRelevant=a.stageRelevant(task.id);
      row.style.display=isRelevant?'':'none';
    });
    const counts={work:0,problem:0,done:0,notstarted:0};
    relevant.forEach(id=>{const s=c.stageSummary(id);if(s.problem)counts.problem++;else if(s.progress>=100)counts.done++;else if(s.progress>0)counts.work++;else counts.notstarted++;});
    const kpis=document.querySelectorAll('.gantt-kpi b');
    if(kpis[0])kpis[0].textContent=String(relevant.length);
    if(kpis[1])kpis[1].textContent=String(counts.work);
    if(kpis[2])kpis[2].textContent=String(counts.problem);
    if(kpis[3])kpis[3].textContent=String(counts.done);
    document.querySelectorAll('.gantt-filter-btn').forEach(btn=>{
      const f=btn.dataset.filter,label=f==='all'?'Все':f==='work'?'В работе':f==='problem'?'Проблемные':f==='done'?'Завершено':f==='notstarted'?'Не начато':'';
      const n=f==='all'?relevant.length:(counts[f]??0);if(label)btn.textContent=`${label} ${n}`;
    });
    const footer=document.querySelector('.gantt-footer-focus');
    if(footer){const spans=footer.querySelectorAll('span');const last=spans[spans.length-1];if(last)last.innerHTML=`Активных этапов: <b>${relevant.length} из 12</b>`;}
  }

  function patchManagementStages(){
    const c=core(),a=activity();if(!c||!a||!location.hash.startsWith('#management/stages'))return;
    document.querySelectorAll('#pa-panel tr[data-pa-stage]').forEach(row=>{
      const id=Number(row.dataset.paStage),inactive=!a.stageRelevant(id),s=c.stageSummary(id);
      row.classList.toggle('pa-team-inactive',inactive);
      const cells=row.children;
      if(cells[2])cells[2].innerHTML=inactive?'<b>Не активно</b>':`<b>${s.progress}%</b>`;
      if(cells[3])cells[3].innerHTML=`<span class="pa-status ${inactive?'neutral':s.problem?'bad':s.progress>=100?'ok':s.progress>0?'work':'neutral'}">${esc(inactive?'Не активно':s.status)}</span>`;
      row.querySelectorAll('[data-pa-stage-due],.pa-save-stage,.pa-reset-stage').forEach(el=>el.disabled=inactive||!localStorage.getItem('atom-project-started-at'));
    });
  }

  function patchManagementTeams(){
    const c=core(),a=activity();if(!c||!a||!location.hash.startsWith('#management/teams'))return;
    const kpis=document.querySelectorAll('#pa-panel .pa-kpi');
    if(kpis[0]){const span=kpis[0].querySelector('span'),b=kpis[0].querySelector('b');if(span)span.textContent='Активные команды';if(b)b.textContent=`${a.activeCount()} / ${c.teams().length}`;}
    if(kpis[2]){const activeReq=c.requirements(),done=activeReq.filter(r=>c.getState(r.id).statusId==='done').length;const span=kpis[2].querySelector('span'),b=kpis[2].querySelector('b');if(span)span.textContent='Требований готово (активные)';if(b)b.textContent=`${done}/${activeReq.length}`;}
  }

  function patchRoadmap(){
    const c=core(),a=activity();if(!c||!a)return;
    document.querySelectorAll('#app table.table tbody tr').forEach(row=>{
      const id=Number(row.children[0]?.textContent||0);if(!id||id>12)return;
      const inactive=!a.stageRelevant(id);row.style.opacity=inactive?'.5':'';
      const sel=row.querySelector('.stage-status-select');if(sel)sel.disabled=inactive;
      if(inactive&&row.children[3])row.children[3].innerHTML='Не активно';
    });
  }

  function patchAll(){
    if(!core()||!activity())return;
    closeInvalidAutoBlockers();
    patchOverview();patchGantt();patchManagementStages();patchManagementTeams();patchRoadmap();
  }

  let queued=false;
  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;patchAll();});}
  const mo=new MutationObserver(queue);mo.observe(document.body,{childList:true,subtree:true});
  ['atom-team-activity-changed','atom-core-data-changed','atom-sync-update','atom-view-rendered','hashchange'].forEach(ev=>window.addEventListener(ev,queue));
  window.ATOM_TEAM_ACTIVITY_FIX={version:VERSION,patch:patchAll};
  setTimeout(queue,900);
})();