(function(){
  const VERSION='1.0.0';
  const BLOCKERS_KEY='atom-blockers';
  let installed=false;
  let reconciling=false;
  let queued=false;

  const core=()=>window.ATOM_CORE;
  const activity=()=>window.ATOM_TEAM_ACTIVITY;
  const read=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||'');return v??f}catch{return f}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const isNotActual=id=>core()?.isRequirementNotActual?.(id)||localStorage.getItem(`atom-requirement-not-actual-${id}`)==='1';
  const isActiveTeam=team=>activity()?.isActive?activity().isActive(team):true;

  function allRequirements(){
    const c=core();if(!c)return[];
    const out=[];
    (c.teams?.()||[]).forEach(team=>(c.requirementsByTeam?.(team)||[]).forEach(r=>out.push(r)));
    return out;
  }

  function canonicalReconcile(){
    const c=core();if(!c||reconciling)return false;
    reconciling=true;
    let changed=false;
    try{
      for(let id=1;id<=12;id++){
        const s=c.stageSummary(id);
        const value=s?.relevant===false?'Не активно':(s?.status||'Не начато');
        const key=`atom-stage-status-${id}`;
        if(localStorage.getItem(key)!==value){localStorage.setItem(key,value);changed=true;}
      }

      const blockers=read(BLOCKERS_KEY,[]);
      const reqs=allRequirements();
      const known=new Set(reqs.map(r=>`CORE:RACI:${r.id}`));

      blockers.forEach(b=>{
        const key=String(b.autoKey||'');
        if(!key.startsWith('CORE:RACI:')||known.has(key))return;
        if(!['Решен','Закрыт'].includes(b.status)){
          b.status='Решен';
          const note='Закрыт автоматически: связанное требование больше не существует.';
          if(!String(b.comment||'').includes(note))b.comment=(b.comment?b.comment+'\n':'')+note;
          changed=true;
        }
      });

      reqs.forEach(req=>{
        const key=`CORE:RACI:${req.id}`;
        const existing=blockers.find(x=>x.autoKey===key);
        const excluded=isNotActual(req.id)||!isActiveTeam(req.team);
        const problem=!excluded&&Boolean(c.requirementProblem(req));
        const state=c.getState(req.id);
        const period=c.periodForRequirement(req);
        const owner=c.personName(state.respondentId)||c.teamOwner(req.team);
        const exactEnd=period?.endAt||period?.endDate||'';
        const due=period?.endDate||'';
        const description=`${req.text}. Плановый срок: ${exactEnd||'не задан'}`;

        if(problem&&!existing){
          blockers.push({
            id:Date.now()+Math.floor(Math.random()*100000),autoKey:key,source:`RACI: ${req.team}`,
            description,severity:'Высокая',owner,due,status:'Открыт',
            comment:`Этап Ганта: ${period?.stageId||req.stageId}. ${period?.stageName||c.stageName(req.stageId)}`,
            createdAt:new Date().toISOString()
          });
          changed=true;
        }else if(problem&&existing){
          if(existing.description!==description){existing.description=description;changed=true;}
          if(existing.owner!==owner){existing.owner=owner;changed=true;}
          if(existing.due!==due){existing.due=due;changed=true;}
          if(['Решен','Закрыт'].includes(existing.status)){existing.status='Открыт';changed=true;}
        }else if(existing&&!['Решен','Закрыт'].includes(existing.status)){
          existing.status='Решен';
          const note=excluded
            ? (isNotActual(req.id)?'Исключено из расчета: требование имеет статус «Не актуально».':'Исключено из расчета: команда не активна.')
            : 'Закрыт автоматически: требование больше не просрочено и не заблокировано.';
          if(!String(existing.comment||'').includes(note))existing.comment=(existing.comment?existing.comment+'\n':'')+note;
          changed=true;
        }
      });

      if(changed)write(BLOCKERS_KEY,blockers);
    }finally{reconciling=false;}
    if(changed)window.dispatchEvent(new CustomEvent('atom-project-reconciled'));
    return changed;
  }

  function patchOverview(){
    const c=core(),a=activity();
    const host=document.getElementById('core-team-readiness');
    if(!c||!a||!host)return;
    const activeTeams=c.teams().filter(t=>a.isActive(t));
    const summaries=activeTeams.map(t=>c.teamSummary(t));
    const counted=summaries.filter(s=>s.total>0);
    const avg=counted.length?Math.round(counted.reduce((n,s)=>n+s.progress,0)/counted.length):0;
    const head=host.querySelector('.core-team-head');
    if(head){
      const small=head.querySelector('small');
      if(small)small.textContent=`Активных команд: ${activeTeams.length} · в расчете: ${counted.length}`;
      const right=head.lastElementChild;
      if(right)right.innerHTML=`Средняя готовность учитываемых команд <b>${avg}%</b>`;
    }
    host.querySelectorAll('.core-team-card').forEach(card=>{
      const team=card.querySelector('.core-team-name')?.textContent.trim();if(!team||!a.isActive(team))return;
      const sum=c.teamSummary(team),empty=sum.total===0;
      card.classList.toggle('team-no-actual',empty);
      const pct=card.querySelector('.core-team-pct');
      if(pct&&empty)pct.textContent='Не учитывается';
      const bar=card.querySelector('.core-team-progress i');
      if(bar&&empty)bar.style.width='0%';
      const meta=card.querySelector('.core-team-meta');
      if(meta&&empty)meta.innerHTML='<span>Нет актуальных требований</span><span>Исключена из среднего</span>';
    });
  }

  function patchRequirementSummary(){
    if(!location.hash.startsWith('#management/requirements'))return;
    const c=core(),summary=document.querySelector('.req-enh-summary');if(!c||!summary)return;
    const visible=[...document.querySelectorAll('tr[data-req-enh-row]')];
    const shown=visible.length;
    const countedRows=visible.filter(row=>{
      const id=row.dataset.reqEnhRow,req=c.requirement(id);
      return req&&!isNotActual(id)&&isActiveTeam(req.team);
    });
    const done=countedRows.filter(row=>c.getState(row.dataset.reqEnhRow).statusId==='done').length;
    const na=visible.filter(row=>isNotActual(row.dataset.reqEnhRow)).length;
    summary.textContent=`Показано ${shown} · учитывается ${countedRows.length} · готово ${done}/${countedRows.length} · не актуально ${na}`;
  }

  function styles(){
    if(document.getElementById('logic-cleanup-css'))return;
    const s=document.createElement('style');s.id='logic-cleanup-css';s.textContent=`
      .core-team-card.team-no-actual{background:#f6f8f8!important;border-style:dashed!important}.core-team-card.team-no-actual .core-team-pct{font-size:11px;color:#6d7b7c}
    `;document.head.appendChild(s);
  }

  function install(){
    const c=core();if(installed||!c)return false;
    c.reconcile=canonicalReconcile;
    installed=true;
    canonicalReconcile();
    return true;
  }

  function patch(){
    if(!install())return;
    canonicalReconcile();
    patchOverview();
    patchRequirementSummary();
  }

  // team-activity-ui already handles the checkbox in capture phase; prevent the older
  // bubbling handler in team-activity.js from executing the same mutation a second time.
  document.addEventListener('change',e=>{
    if(e.target.closest('[data-team-active]'))e.stopPropagation();
  },true);

  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;patch();});}
  new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});
  ['hashchange','atom-core-ready','atom-sync-update','atom-view-rendered','atom-core-data-changed','atom-team-activity-changed','atom-reference-data-changed'].forEach(ev=>window.addEventListener(ev,queue));
  window.ATOM_LOGIC_CLEANUP={version:VERSION,reconcile:canonicalReconcile,patch};
  styles();setTimeout(queue,1000);setTimeout(queue,2200);
})();