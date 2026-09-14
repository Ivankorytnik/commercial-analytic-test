(function(){
  const VERSION='1.0.0';
  const META_PREFIX='atom-core-requirement-meta-';
  const DUE_PREFIX='atom-gantt-due-';
  const DAY=86400000;
  let installed=false;
  let migrated=false;
  let queued=false;
  let originalGantt=null;
  let originalGetTaskState=null;
  let originalGetAllStates=null;

  const core=()=>window.ATOM_CORE;
  const progressRules=()=>window.ATOM_REQUIREMENT_PROGRESS_RULES;
  const read=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||'');return v??f}catch{return f}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const pad=n=>String(n).padStart(2,'0');
  const dateOnly=v=>String(v||'').slice(0,10);
  const parseDate=v=>{const s=dateOnly(v);if(!s)return NaN;const p=s.split('-').map(Number);if(p.length!==3||p.some(Number.isNaN))return NaN;return new Date(p[0],p[1]-1,p[2]).getTime();};
  const endOfDay=v=>{const s=dateOnly(v);if(!s)return NaN;const p=s.split('-').map(Number);if(p.length!==3||p.some(Number.isNaN))return NaN;return new Date(p[0],p[1]-1,p[2],23,59,59,999).getTime();};
  const dateInput=ts=>{const d=new Date(Number(ts));return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
  const formatDate=ts=>new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(Number(ts)));
  const sod=ts=>{const d=new Date(Number(ts));return new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();};
  const diffDays=(a,b)=>Math.round((sod(b)-sod(a))/DAY);

  function allRequirements(){
    const c=core();if(!c)return[];
    const out=[];
    (c.teams?.()||[]).forEach(team=>(c.requirementsByTeam?.(team)||[]).forEach(r=>out.push(r)));
    const seen=new Set();
    return out.filter(r=>r?.id&&!seen.has(r.id)&&seen.add(r.id));
  }

  function migratePeriods(){
    const c=core();
    if(migrated||!c?.periodForRequirement)return false;
    let changed=0;
    allRequirements().forEach(req=>{
      const key=`${META_PREFIX}${req.id}`;
      const m=read(key,{})||{};
      if(m.customStartAt&&m.customEndAt)return;
      const p=c.periodForRequirement(req);
      const start=dateOnly(p?.startDate||p?.startAt),end=dateOnly(p?.endDate||p?.endAt);
      if(!start||!end)return;
      m.stageId=Number(m.stageId||req.stageId||1);
      m.customStartDate=start;
      m.customEndDate=end;
      m.customStartAt=`${start}T00:00`;
      m.customEndAt=`${end}T23:59`;
      m.periodOverride=true;
      m.periodAuthority='requirements';
      m.periodAuthorityMigratedAt=new Date().toISOString();
      write(key,m);changed++;
    });
    migrated=true;
    if(changed){
      window.dispatchEvent(new CustomEvent('atom-requirement-periods-migrated',{detail:{count:changed,version:VERSION}}));
    }
    return true;
  }

  function requirementsForStage(stageId){
    const c=core(),pr=progressRules();stageId=Number(stageId);
    if(pr?.countedRequirementsByStage)return pr.countedRequirementsByStage(stageId)||[];
    const rows=c?.requirementsByStage?.(stageId)||[];
    return rows.filter(r=>{
      if(window.ATOM_TEAM_ACTIVITY?.isActive&&!window.ATOM_TEAM_ACTIVITY.isActive(r.team))return false;
      if(localStorage.getItem(`atom-requirement-not-actual-${r.id}`)==='1')return false;
      return true;
    });
  }

  function rangeForStage(stageId){
    const c=core();if(!c?.periodForRequirement)return null;
    const rows=requirementsForStage(stageId);
    const periods=rows.map(req=>({req,p:c.periodForRequirement(req)})).map(x=>{
      const start=parseDate(x.p?.startAt||x.p?.startDate),end=endOfDay(x.p?.endAt||x.p?.endDate);
      return Number.isFinite(start)&&Number.isFinite(end)?{...x,start,end}:null;
    }).filter(Boolean);
    if(!periods.length)return null;
    const start=Math.min(...periods.map(x=>x.start));
    const end=Math.max(...periods.map(x=>x.end));
    return {stageId:Number(stageId),start,end,startDate:dateInput(start),endDate:dateInput(end),requirements:periods.length,source:'requirements'};
  }

  function ranges(){
    const map=new Map();
    for(let id=1;id<=12;id++){const r=rangeForStage(id);if(r)map.set(id,r);}
    return map;
  }

  function syncDueKeys(){
    const rs=ranges();
    rs.forEach((r,id)=>localStorage.setItem(`${DUE_PREFIX}${id}`,r.endDate));
    return rs;
  }

  function patchGanttApi(){
    const g=window.ATOM_GANTT;if(!g||g.__requirementsAuthority===VERSION)return false;
    originalGetTaskState=g.getTaskState?.bind(g);
    originalGetAllStates=g.getAllStates?.bind(g);
    if(!originalGetTaskState)return false;
    g.getTaskState=function(id){
      const base=originalGetTaskState(id);if(!base)return base;
      const r=rangeForStage(id);if(!r)return base;
      return {...base,startDate:r.start,due:r.end,customDue:r.endDate,changed:true,authority:'requirements',requirementsCount:r.requirements};
    };
    g.getAllStates=function(){
      const base=originalGetAllStates?originalGetAllStates():(g.tasks||[]).map(t=>originalGetTaskState(t.id)).filter(Boolean);
      return base.map(s=>{const r=rangeForStage(s.id);return r?{...s,startDate:r.start,due:r.end,customDue:r.endDate,changed:true,authority:'requirements',requirementsCount:r.requirements}:s;});
    };
    g.stageRange=rangeForStage;
    g.stageRanges=ranges;
    g.__requirementsAuthority=VERSION;
    return true;
  }

  function transformGantt(html){
    if(typeof html!=='string'||!html.includes('gantt-dashboard'))return html;
    const c=core(),g=window.ATOM_GANTT;if(!c||!g)return html;
    const rs=ranges(),ps=Number(g.projectStart?.()||Date.now());
    const maxEnd=Math.max(ps+91*DAY,...[...rs.values()].map(r=>r.end));
    const horizon=Math.max(91,Math.ceil(Math.max(0,diffDays(ps,maxEnd))/7)*7);
    const host=document.createElement('div');host.innerHTML=html;
    const info=host.querySelector('.gantt-info');
    if(info)info.innerHTML='<b>Главный источник сроков: «Управление проектом → Требования».</b><span>Период этапа строится от самой ранней даты начала до самой поздней даты окончания актуальных требований этапа.</span>';
    host.querySelectorAll('.gantt-row').forEach(row=>{
      const name=row.querySelector('.gantt-name-cell b')?.textContent.trim();
      const task=(g.tasks||[]).find(t=>t.name===name);if(!task)return;
      const r=rs.get(Number(task.id));if(!r)return;
      const from=Math.max(0,diffDays(ps,r.start));
      const to=Math.max(from+1,diffDays(ps,r.end));
      const bar=row.querySelector('.gantt-bar');
      if(bar){bar.style.left=`${Math.min(100,from/horizon*100)}%`;bar.style.width=`${Math.max(.7,(Math.min(horizon,to)-from)/horizon*100)}%`;}
      row.querySelector('.gantt-extension')?.remove();
      const cards=row.querySelectorAll('.gantt-detail-card');
      if(cards[0]){
        const label=cards[0].querySelector('.label'),b=cards[0].querySelector('b'),sub=cards[0].querySelector('.gantt-detail-sub');
        if(label)label.textContent='Период по требованиям';
        if(b)b.textContent=`${formatDate(r.start)} - ${formatDate(r.end)}`;
        if(sub)sub.textContent=`${r.requirements} требований формируют границы этапа`;
      }
      if(cards[1]){
        const label=cards[1].querySelector('.label'),b=cards[1].querySelector('b'),sub=cards[1].querySelector('.gantt-detail-sub');
        if(label)label.textContent='Источник сроков';
        if(b)b.textContent='Требования';
        if(sub)sub.textContent='Срок этапа пересчитывается автоматически';
      }
      if(cards[2]){
        const label=cards[2].querySelector('.label');if(label)label.textContent='Изменение срока';
        cards[2].querySelector('.gantt-action-box')?.replaceChildren();
        cards[2].querySelector('.gantt-reschedule-form')?.remove();
        let note=cards[2].querySelector('.gantt-action-note');
        if(!note){note=document.createElement('div');note.className='gantt-action-note';cards[2].appendChild(note);}
        note.textContent='Изменяйте период в «Управление проектом → Требования».';
      }
    });
    const footer=host.querySelector('.gantt-footer-focus');
    if(footer){
      const spans=footer.querySelectorAll('span');
      if(spans[1])spans[1].innerHTML=`Плановое завершение по требованиям: <b>${formatDate(maxEnd)}</b>`;
      if(spans[2])spans[2].innerHTML='Источник сроков: <b>Требования</b>';
    }
    return host.innerHTML;
  }

  function wrapGantt(){
    if(originalGantt||typeof window.gantt!=='function')return Boolean(originalGantt);
    originalGantt=window.gantt;
    window.gantt=function(){syncDueKeys();patchGanttApi();return transformGantt(originalGantt.apply(this,arguments));};
    return true;
  }

  function patchExpandedGantt(){
    if(location.hash!=='#expanded-gantt')return;
    const root=document.querySelector('.core-xg');if(!root)return;
    const intro=root.querySelector(':scope > div:first-child p');
    if(intro)intro.textContent='Главный источник сроков — «Управление проектом → Требования». Каждая строка показывает собственный период требования, а основной Гант агрегирует эти периоды по этапам.';
  }

  function patchStagesManagement(){
    if(!location.hash.startsWith('#management/stages'))return;
    const host=document.getElementById('pa-panel');if(!host)return;
    let note=host.querySelector('.requirements-gantt-authority-note');
    if(!note){
      note=document.createElement('div');note.className='pa-master requirements-gantt-authority-note';
      host.insertBefore(note,host.firstChild);
    }
    note.innerHTML='<b>Сроки этапов рассчитываются автоматически.</b> Главный источник — периоды строк в «Требованиях». Для изменения срока отредактируйте соответствующие требования.';
    host.querySelectorAll('tr[data-pa-stage]').forEach(row=>{
      const id=Number(row.dataset.paStage),r=rangeForStage(id);if(!r)return;
      const due=row.querySelector('[data-pa-stage-due]');if(due){due.value=r.endDate;due.disabled=true;due.title='Срок формируется требованиями';}
      row.querySelectorAll('.pa-save-stage,.pa-reset-stage').forEach(btn=>{btn.disabled=true;btn.title='Срок формируется требованиями';});
    });
  }

  function refreshCurrentView(){
    if(location.hash==='#gantt'){
      try{window.render?.('gantt');}catch{}
    }else if(location.hash==='#expanded-gantt'){
      try{window.ATOM_CORE_UI?.renderExpanded?.();}catch{}
      setTimeout(patchExpandedGantt,0);
    }else if(location.hash.startsWith('#management/stages')){
      setTimeout(patchStagesManagement,0);
    }
  }

  function sync(reason='sync'){
    const c=core();if(!c)return false;
    migratePeriods();
    syncDueKeys();
    patchGanttApi();
    wrapGantt();
    patchExpandedGantt();
    patchStagesManagement();
    try{window.ATOM_REQUIREMENT_PROGRESS_RULES?.recalc?.();}catch{}
    window.dispatchEvent(new CustomEvent('atom-requirements-gantt-synced',{detail:{reason,version:VERSION,ranges:[...ranges().values()]}}));
    return true;
  }

  function queue(reason){
    if(queued)return;queued=true;
    requestAnimationFrame(()=>{queued=false;if(sync(reason))refreshCurrentView();});
  }

  function styles(){
    if(document.getElementById('requirements-gantt-authority-css'))return;
    const s=document.createElement('style');s.id='requirements-gantt-authority-css';s.textContent=`
      .req-period-reset,[data-rpm-reset]{display:none!important}
      .requirements-gantt-authority-note{border-left-color:#0f756d!important}
    `;document.head.appendChild(s);
  }

  styles();
  ['atom-core-ready','atom-core-data-changed','atom-team-activity-changed','atom-reference-data-changed','atom-source-activity-changed','atom-sync-update','hashchange'].forEach(ev=>window.addEventListener(ev,e=>queue(ev)));
  window.addEventListener('atom-project-progress-rules-ready',()=>queue('progress-ready'));
  window.addEventListener('atom-requirement-period-editor-ready',()=>queue('period-editor-ready'));

  const timer=setInterval(()=>{
    if(core()&&window.ATOM_REQUIREMENTS_TIME&&window.ATOM_GANTT){clearInterval(timer);installed=true;queue('install');}
  },80);
  setTimeout(()=>clearInterval(timer),8000);

  window.ATOM_REQUIREMENTS_GANTT_AUTHORITY={version:VERSION,sync,rangeForStage,ranges,migratePeriods,refresh:refreshCurrentView};
})();