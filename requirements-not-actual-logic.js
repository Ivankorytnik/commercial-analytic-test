(function(){
  const VERSION='1.0.0';
  const NOT_ACTUAL='__not_actual__';
  const core=()=>window.ATOM_CORE;
  const activity=()=>window.ATOM_TEAM_ACTIVITY;
  const isNotActual=id=>localStorage.getItem(`atom-requirement-not-actual-${id}`)==='1';

  function ensureFlagFromUi(){
    document.querySelectorAll('[data-req-enh-status], .core-raci-table select[data-core-field="statusId"]').forEach(sel=>{
      const row=sel.closest('[data-req-enh-row],[data-core-id]');
      const id=row?.dataset.reqEnhRow||row?.dataset.coreId;
      if(!id)return;
      if(sel.value===NOT_ACTUAL&&!isNotActual(id))localStorage.setItem(`atom-requirement-not-actual-${id}`,'1');
    });
  }

  function closeNotActualBlockers(){
    let rows=[];try{rows=JSON.parse(localStorage.getItem('atom-blockers')||'[]')||[]}catch{}
    let changed=false;
    rows.forEach(b=>{
      const key=String(b.autoKey||'');
      if(!key.startsWith('CORE:RACI:'))return;
      const id=key.slice('CORE:RACI:'.length);
      if(isNotActual(id)&&!['Решен','Закрыт'].includes(b.status)){
        b.status='Решен';
        const note='Исключено из расчета: требование имеет статус «Не актуально».';
        if(!String(b.comment||'').includes(note))b.comment=(b.comment?b.comment+'\n':'')+note;
        changed=true;
      }
    });
    if(changed)localStorage.setItem('atom-blockers',JSON.stringify(rows));
  }

  function patchRequirementsSummary(){
    if(!location.hash.startsWith('#management/requirements'))return;
    const c=core();if(!c)return;
    const summary=document.querySelector('.req-enh-summary');
    if(!summary)return;
    let all=[];
    (c.teams?.()||[]).forEach(t=>(c.requirementsByTeam?.(t)||[]).forEach(r=>all.push(r)));
    const na=all.filter(r=>isNotActual(r.id)).length;
    const counted=c.requirements?.()||[];
    const done=counted.filter(r=>c.getState(r.id).statusId==='done').length;
    summary.textContent=`Учитывается ${counted.length} · готово ${done}/${counted.length} · не актуально ${na} (исключено из расчета)`;
  }

  function patchOverview(){
    const c=core(),a=activity();
    if(!c||!a||!document.querySelector('#core-team-readiness'))return;
    const activeTeams=c.teams().filter(t=>a.isActive(t));
    const counted=activeTeams.map(t=>c.teamSummary(t)).filter(s=>s.total>0);
    const avg=counted.length?Math.round(counted.reduce((n,s)=>n+s.progress,0)/counted.length):0;
    const head=document.querySelector('#core-team-readiness .core-team-head');
    if(head){
      const right=head.lastElementChild;
      if(right)right.innerHTML=`Средняя готовность учитываемых команд <b>${avg}%</b>`;
      const small=head.querySelector('small');
      if(small)small.textContent=`Активных команд: ${activeTeams.length} · в расчете: ${counted.length}`;
    }

    document.querySelectorAll('#core-team-readiness .core-team-card').forEach(card=>{
      const team=card.querySelector('.core-team-name')?.textContent.trim();if(!team)return;
      if(!a.isActive(team))return;
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

  function styles(){
    if(document.getElementById('requirements-not-actual-logic-css'))return;
    const s=document.createElement('style');s.id='requirements-not-actual-logic-css';s.textContent=`
      .core-team-card.team-no-actual{background:#f6f8f8!important;border-style:dashed!important}.core-team-card.team-no-actual .core-team-pct{font-size:11px;color:#6d7b7c}.req-enh-not-actual{opacity:.78}
    `;document.head.appendChild(s);
  }

  function patch(){
    styles();
    ensureFlagFromUi();
    closeNotActualBlockers();
    patchRequirementsSummary();
    patchOverview();
  }

  document.addEventListener('change',e=>{
    const sel=e.target.closest('[data-req-enh-status], .core-raci-table select[data-core-field="statusId"]');
    if(!sel)return;
    const row=sel.closest('[data-req-enh-row],[data-core-id]');
    const id=row?.dataset.reqEnhRow||row?.dataset.coreId;
    if(!id)return;
    if(sel.value===NOT_ACTUAL){
      window.ATOM_REQUIREMENTS_ENHANCED?.setNotActual?.(id,true);
    }else if(isNotActual(id)){
      window.ATOM_REQUIREMENTS_ENHANCED?.setNotActual?.(id,false);
    }
    setTimeout(()=>{core()?.reconcile?.();patch();window.ATOM_TEAM_ACTIVITY_FIX?.patch?.();},0);
  },true);

  let queued=false;
  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;patch();});}
  new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});
  ['hashchange','atom-core-ready','atom-sync-update','atom-view-rendered','atom-core-data-changed','atom-team-activity-changed'].forEach(ev=>window.addEventListener(ev,queue));
  window.ATOM_REQUIREMENTS_NOT_ACTUAL_LOGIC={version:VERSION,patch,isNotActual};
  setTimeout(queue,900);setTimeout(queue,1800);
})();