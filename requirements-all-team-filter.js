(function(){
  const VERSION='1.1.0';
  const ALL='__all__';
  const SESSION_KEY='atom-pa-requirements-team-filter';
  const PENDING_KEY='atom-requirements-team-filter-pending';
  let queued=false;

  const core=()=>window.ATOM_CORE;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const fmt=v=>{if(!v)return'Не задано';const p=String(v).slice(0,10).split('-');return p.length===3?`${p[2]}.${p[1]}.${p[0]}`:String(v)};

  function statusOptions(selected=''){
    const c=core();
    return (c?.STATUS||[]).map(x=>`<option value="${esc(x.id)}" ${x.id===selected?'selected':''}>${esc(x.label)}</option>`).join('');
  }
  function personOptions(selected=''){
    const c=core();
    return ['<option value="">Не назначен</option>',...(c?.people?.()||[]).map(x=>`<option value="${esc(x.id)}" ${x.id===selected?'selected':''}>${esc(x.name)}</option>`)].join('');
  }
  function stageOptions(selected){
    const c=core();
    return Array.from({length:12},(_,i)=>i+1).map(id=>`<option value="${id}" ${Number(selected)===id?'selected':''}>${id}. ${esc(c.stageName(id))}</option>`).join('');
  }

  function allRows(){
    const c=core();if(!c)return[];
    const seen=new Set(),rows=[];
    (c.teams?.()||[]).forEach(team=>{
      (c.requirementsByTeam?.(team)||[]).forEach(req=>{
        if(seen.has(req.id))return;
        seen.add(req.id);rows.push(req);
      });
    });
    return rows.sort((a,b)=>{
      const pa=c.periodForRequirement(a),pb=c.periodForRequirement(b);
      const ea=Number(pa?.end)||Number.MAX_SAFE_INTEGER,eb=Number(pb?.end)||Number.MAX_SAFE_INTEGER;
      return ea-eb||String(a.team).localeCompare(String(b.team),'ru')||String(a.text).localeCompare(String(b.text),'ru');
    });
  }

  function ensureAllOption(){
    if(!location.hash.startsWith('#management/requirements'))return null;
    const select=document.getElementById('pa-req-team');
    if(!select)return null;
    if(![...select.options].some(o=>o.value===ALL)){
      const option=document.createElement('option');
      option.value=ALL;option.textContent='Все';
      select.insertBefore(option,select.firstChild);
    }
    return select;
  }

  function renderAll(){
    const c=core(),select=ensureAllOption(),panel=document.getElementById('pa-panel');
    if(!c||!select||!panel)return;
    select.value=ALL;
    sessionStorage.setItem(SESSION_KEY,ALL);
    const rows=allRows();
    const toolbar=select.closest('.pa-toolbar');
    if(toolbar){
      const note=toolbar.querySelector('.pa-note');
      const done=rows.filter(r=>c.getState(r.id).statusId==='done').length;
      const problems=rows.filter(r=>c.requirementProblem?.(r)).length;
      if(note)note.textContent=`Все команды · требований ${rows.length} · готово ${done}/${rows.length} · проблем ${problems}`;
    }
    const table=panel.querySelector('.pa-table');
    const body=table?.querySelector('tbody');
    if(!table||!body)return;
    body.innerHTML=rows.map(r=>{
      const st=c.getState(r.id),p=c.periodForRequirement(r);
      return `<tr data-pa-req="${esc(r.id)}" data-pa-all-team="${esc(r.team)}"><td><b class="pa-all-team-label">${esc(r.team)}</b><br>${esc(r.text)}</td><td>${r.custom?`<select data-pa-req-stage>${stageOptions(r.stageId)}</select>`:`<b>${r.stageId}. ${esc(p?.stageName||c.stageName(r.stageId))}</b>`}</td><td><b>${fmt(p?.startDate)} - ${fmt(p?.endDate)}</b>${p?.changed?'<br><span class="pa-note">срок этапа перенесен</span>':''}</td><td><select data-pa-req-status>${statusOptions(st.statusId)}</select></td><td><select data-pa-req-person>${personOptions(st.respondentId)}</select></td><td><textarea data-pa-req-comment>${esc(st.comment||'')}</textarea></td><td>${r.custom?`<button class="btn pa-delete-req" data-id="${esc(r.id)}">Удалить</button>`:''}</td></tr>`;
    }).join('');
    panel.dataset.requirementsAllRendered='1';

    const add=panel.querySelector('.pa-add.req');
    if(add){
      add.style.display='none';
      let hint=document.getElementById('pa-all-add-hint');
      if(!hint){
        hint=document.createElement('div');hint.id='pa-all-add-hint';hint.className='pa-note';
        hint.textContent='Для добавления нового требования выберите конкретную команду.';
        add.insertAdjacentElement('beforebegin',hint);
      }
    }

    try{window.ATOM_REQUIREMENTS_STATUS_DIRECTORY?.patch?.();}catch{}
    try{window.ATOM_PROJECT_ADMIN_REQUIREMENT_TIME?.patch?.();}catch{}
  }

  function restoreNormal(){
    const panel=document.getElementById('pa-panel');
    if(panel)delete panel.dataset.requirementsAllRendered;
    document.getElementById('pa-all-add-hint')?.remove();
  }

  function applyPendingTeam(select){
    const c=core();
    const pending=sessionStorage.getItem(PENDING_KEY)||'';
    if(!pending||!c?.teams?.().includes(pending))return false;
    sessionStorage.removeItem(PENDING_KEY);
    sessionStorage.setItem(SESSION_KEY,pending);
    if(select.value!==pending){
      select.value=pending;
      select.dispatchEvent(new Event('change',{bubbles:true}));
    }
    return true;
  }

  function patch(){
    if(!location.hash.startsWith('#management/requirements'))return;
    const select=ensureAllOption();if(!select)return;

    // Explicit transition from an Overview team card has priority over the default.
    if(applyPendingTeam(select))return;

    let saved=sessionStorage.getItem(SESSION_KEY);
    if(!saved){
      saved=ALL;
      sessionStorage.setItem(SESSION_KEY,ALL);
    }
    if(saved===ALL){
      if(select.value!==ALL||document.getElementById('pa-panel')?.dataset.requirementsAllRendered!=='1')renderAll();
    }
  }

  document.addEventListener('change',e=>{
    const select=e.target.closest('#pa-req-team');if(!select)return;
    if(select.value===ALL){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      sessionStorage.setItem(SESSION_KEY,ALL);
      renderAll();
    }else{
      sessionStorage.setItem(SESSION_KEY,select.value);
      restoreNormal();
    }
  },true);

  document.addEventListener('click',e=>{
    const tab=e.target.closest('[data-pa-tab]');
    if(tab?.dataset.paTab!=='requirements')sessionStorage.removeItem(SESSION_KEY);
  },true);

  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;patch();});}
  new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});
  ['hashchange','atom-view-rendered','atom-sync-update','atom-core-data-changed'].forEach(ev=>window.addEventListener(ev,queue));
  window.ATOM_REQUIREMENTS_ALL_TEAM_FILTER={version:VERSION,renderAll,patch};
  setTimeout(queue,150);setTimeout(queue,500);setTimeout(queue,1200);
})();