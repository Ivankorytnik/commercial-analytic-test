(function(){
  const VERSION='1.0.1';
  const CUSTOM_KEY='atom-custom-sources-v1';
  const CUSTOM_TEAM_PREFIX='atom-source-team-custom-';
  let installed=false;
  let pendingNewSource=null;

  const BASE_TEAM_MAP={
    'Сайт':['Сайт'],
    'Яндекс Метрика':['Метрики'],
    'GA4':['Метрики'],
    'Телефония':['1 линия','2 линия'],
    '1 линия':['1 линия'],
    '2 линия':['2 линия'],
    'ELMA':['ELMA'],
    'Альфа-Авто':['Альфа-Авто'],
    '1С':['1С / финансы'],
    'Маркетинг':['Маркетинг'],
    'DATA / DWH':['DATA / DWH'],
    'BI':['BI'],
    'B2B ручные лиды':['B2B продажи']
  };

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[m]));
  const read=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||'');return v??f}catch{return f}};
  const core=()=>window.ATOM_CORE;
  const activity=()=>window.ATOM_TEAM_ACTIVITY;
  const teams=()=>core()?.teams?.()||[];
  const isTeamActive=team=>activity()?.isActive?activity().isActive(team):core()?.isTeamActive?core().isTeamActive(team):true;
  const customTeamKey=id=>`${CUSTOM_TEAM_PREFIX}${id}`;

  function projectData(){
    try{if(typeof DATA!=='undefined'&&DATA)return DATA;}catch{}
    return window.DATA||null;
  }
  function baseRows(){const d=projectData();return Array.isArray(d?.sources_list)?d.sources_list:[];}
  function customRows(){return read(CUSTOM_KEY,[]);}
  function baseTeams(index){
    const name=baseRows()[index]?.[0]||'';
    return BASE_TEAM_MAP[name]||[];
  }
  function customTeam(id){return localStorage.getItem(customTeamKey(id))||'';}
  function setCustomTeam(id,team){
    if(team)localStorage.setItem(customTeamKey(id),team);else localStorage.removeItem(customTeamKey(id));
  }
  function baseActive(index){
    const linked=baseTeams(index);
    return linked.length>0&&linked.some(isTeamActive);
  }
  function customActive(row){
    const team=customTeam(row.id);
    return Boolean(team)&&isTeamActive(team);
  }
  function statusForBase(i){return localStorage.getItem(`atom-source-status-${i}`)||'Не начато';}
  function statusForCustom(id){return localStorage.getItem(`atom-source-status-custom-${id}`)||'Не начато';}

  function summary(){
    const base=baseRows(),custom=customRows();
    const activeBase=base.map((row,i)=>({kind:'base',index:i,row,status:statusForBase(i),teams:baseTeams(i),active:baseActive(i)})).filter(x=>x.active);
    const activeCustom=custom.map(row=>({kind:'custom',id:row.id,row,status:statusForCustom(row.id),teams:customTeam(row.id)?[customTeam(row.id)]:[],active:customActive(row)})).filter(x=>x.active);
    const active=[...activeBase,...activeCustom];
    const values=active.map(x=>x.status);
    const allTotal=base.length+custom.length;
    return {
      total:values.length,
      ready:values.filter(x=>x==='Готово').length,
      identified:values.filter(x=>x!=='Не начато').length,
      problem:values.filter(x=>x==='Блокер').length,
      allTotal,
      inactive:Math.max(0,allTotal-values.length),
      activeBase:activeBase.length,
      activeCustom:activeCustom.length
    };
  }

  function install(){
    const c=core();if(installed||!c||!activity())return false;
    c.sourcesSummary=summary;
    c.sourceTeamsForBase=baseTeams;
    c.sourceIsActive=(kind,idOrIndex)=>kind==='base'?baseActive(Number(idOrIndex)):customRows().find(x=>String(x.id)===String(idOrIndex))?customActive(customRows().find(x=>String(x.id)===String(idOrIndex))):false;
    c.sourceTeamForCustom=customTeam;
    installed=true;
    window.dispatchEvent(new CustomEvent('atom-source-team-sync-ready',{detail:{version:VERSION}}));
    return true;
  }

  function styles(){
    if(document.getElementById('source-team-sync-css'))return;
    const s=document.createElement('style');s.id='source-team-sync-css';s.textContent=`
      .source-sync-note{padding:9px 11px;border-radius:8px;background:#eef8f7;color:#385858;font-size:10px;border-left:3px solid #35d8c7}
      .source-sync-team{min-width:145px}.source-sync-state{min-width:105px;white-space:nowrap}.source-sync-badge{display:inline-flex;padding:4px 7px;border-radius:999px;font-size:9px;font-weight:700;background:#e4f7f1;color:#24715c}.source-sync-badge.off{background:#edf0f0;color:#6d7b7c}
      .source-sync-inactive{background:#f5f6f6!important;color:#7d898a}.source-sync-inactive td{opacity:.67}.source-sync-inactive .source-sync-team,.source-sync-inactive .source-sync-state{opacity:1}.source-sync-inactive select[data-pa-source-owner],.source-sync-inactive select[data-pa-source-status],.source-sync-inactive [data-cs-owner],.source-sync-inactive [data-cs-status]{opacity:.65}
      .source-team-select{width:100%;min-width:135px;box-sizing:border-box;padding:7px 8px;border:1px solid #ccd9d9;border-radius:7px;background:#fff;font:inherit;font-size:10px;color:var(--text)}
      .pa-add.source-team-ready{grid-template-columns:1.1fr 1fr 1fr .85fr 1fr auto}
      @media(max-width:900px){.pa-add.source-team-ready{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:650px){.pa-add.source-team-ready{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function teamOptions(selected=''){
    return `<option value="" ${!selected?'selected':''}>Не назначена</option>${teams().map(t=>`<option value="${esc(t)}" ${t===selected?'selected':''}>${esc(t)}</option>`).join('')}`;
  }

  function linkedTeamLabel(index){
    const linked=baseTeams(index);return linked.length?linked.join(' / '):'Не назначена';
  }

  function patchKpis(){
    if(!location.hash.startsWith('#management/sources'))return;
    const host=document.getElementById('pa-panel');if(!host)return;
    const kpis=host.querySelectorAll('.pa-kpi');const s=summary();
    if(kpis[0]){const label=kpis[0].querySelector('span'),b=kpis[0].querySelector('b');if(label)label.textContent='Активные источники';if(b)b.textContent=`${s.total} / ${s.allTotal}`;}
    if(kpis[1]){const label=kpis[1].querySelector('span'),b=kpis[1].querySelector('b');if(label)label.textContent='Определено (активные)';if(b)b.textContent=s.identified;}
    if(kpis[2]){const label=kpis[2].querySelector('span'),b=kpis[2].querySelector('b');if(label)label.textContent='Готово (активные)';if(b)b.textContent=s.ready;}
    if(kpis[3]){const label=kpis[3].querySelector('span'),b=kpis[3].querySelector('b');if(label)label.textContent='Блокеры (активные)';if(b)b.textContent=s.problem;}
    let note=host.querySelector('.source-sync-note');
    if(!note){note=document.createElement('div');note.className='source-sync-note';host.insertBefore(note,host.querySelector('.pa-table-wrap'));}
    note.innerHTML=`Источник учитывается в готовности проекта только если связанная команда активна в <b>Управление проектом → Команды</b>. Сейчас в расчёте <b>${s.total}</b>, исключено <b>${s.inactive}</b>.`;
  }

  function patchTable(){
    if(!location.hash.startsWith('#management/sources'))return;
    const table=document.querySelector('#pa-panel .pa-table');if(!table)return;
    const head=table.querySelector('thead tr');if(!head)return;
    if(!head.querySelector('[data-source-team-head]')){
      const thTeam=document.createElement('th');thTeam.dataset.sourceTeamHead='1';thTeam.textContent='Команда';thTeam.className='source-sync-team';
      const thState=document.createElement('th');thState.dataset.sourceStateHead='1';thState.textContent='В расчёте';thState.className='source-sync-state';
      head.insertBefore(thTeam,head.children[1]||null);head.insertBefore(thState,head.children[2]||null);
    }
    const base=baseRows();
    [...table.querySelectorAll('tbody tr')].forEach((row,rowIndex)=>{
      const customId=row.dataset.paCustomSource;
      const isCustom=Boolean(customId);
      const baseIndex=isCustom?-1:rowIndex;
      const existingTeam=row.querySelector('[data-source-team-cell]');
      const existingState=row.querySelector('[data-source-state-cell]');
      let active=false;
      if(isCustom){
        const source=customRows().find(x=>String(x.id)===String(customId))||{id:customId};
        active=customActive(source);
        if(existingTeam){
          const sel=existingTeam.querySelector('[data-source-custom-team]');
          if(!sel)existingTeam.innerHTML=`<select class="source-team-select" data-source-custom-team="${esc(customId)}">${teamOptions(customTeam(customId))}</select>`;
        }
      }else{
        active=baseActive(baseIndex);
        if(existingTeam)existingTeam.innerHTML=`<span class="pa-note">${esc(linkedTeamLabel(baseIndex))}</span>`;
      }
      if(existingTeam){
        row.classList.toggle('source-sync-inactive',!active);
        if(existingState)existingState.innerHTML=`<span class="source-sync-badge ${active?'':'off'}">${active?'Учитывается':'Исключён'}</span>`;
        return;
      }
      const teamTd=document.createElement('td');teamTd.dataset.sourceTeamCell='1';teamTd.className='source-sync-team';
      const stateTd=document.createElement('td');stateTd.dataset.sourceStateCell='1';stateTd.className='source-sync-state';
      if(isCustom){
        const team=customTeam(customId);teamTd.innerHTML=`<select class="source-team-select" data-source-custom-team="${esc(customId)}">${teamOptions(team)}</select>`;
      }else{
        teamTd.innerHTML=`<span class="pa-note">${esc(linkedTeamLabel(baseIndex))}</span>`;
      }
      stateTd.innerHTML=`<span class="source-sync-badge ${active?'':'off'}">${active?'Учитывается':'Исключён'}</span>`;
      row.insertBefore(teamTd,row.children[1]||null);row.insertBefore(stateTd,row.children[2]||null);
      row.classList.toggle('source-sync-inactive',!active);
    });
  }

  function patchAddForm(){
    if(!location.hash.startsWith('#management/sources'))return;
    const form=document.querySelector('#pa-panel .pa-add');if(!form||form.querySelector('#pa-source-team'))return;
    const owner=document.getElementById('pa-source-owner')?.closest('.pa-field');
    const field=document.createElement('div');field.className='pa-field';field.innerHTML=`<label>Команда</label><select id="pa-source-team">${teamOptions('')}</select>`;
    if(owner)form.insertBefore(field,owner);else form.appendChild(field);
    form.classList.add('source-team-ready');
  }

  function patchView(){styles();patchKpis();patchTable();patchAddForm();}

  function applyPendingNewSource(){
    if(!pendingNewSource)return;
    const list=customRows();
    const matches=list.filter(x=>String(x.name||'').trim().toLowerCase()===pendingNewSource.name.toLowerCase());
    const x=matches[matches.length-1];
    if(x){setCustomTeam(x.id,pendingNewSource.team);pendingNewSource=null;}
  }

  function refreshCalculations(type='source-team-sync'){
    const c=core();
    setTimeout(()=>{
      try{c?.reconcile?.();}catch{}
      try{window.ATOM_REQUIREMENT_PROGRESS_RULES?.recalc?.();}catch{}
      window.dispatchEvent(new CustomEvent('atom-source-activity-changed',{detail:{type,summary:summary()}}));
      patchView();
    },0);
  }

  document.addEventListener('change',e=>{
    const sel=e.target.closest?.('[data-source-custom-team]');if(!sel)return;
    setCustomTeam(sel.dataset.sourceCustomTeam,sel.value||'');
    refreshCalculations('custom-source-team');
  },true);

  document.addEventListener('click',e=>{
    if(!e.target.closest?.('#pa-add-source'))return;
    const name=document.getElementById('pa-source-name')?.value.trim()||'';
    const team=document.getElementById('pa-source-team')?.value||'';
    if(name)pendingNewSource={name,team};
  },true);

  window.addEventListener('atom-core-data-changed',e=>{
    const type=String(e.detail?.type||'');
    if(type==='source-add'){applyPendingNewSource();refreshCalculations('source-add');}
    else if(type.startsWith('source'))setTimeout(patchView,0);
  });
  window.addEventListener('atom-team-activity-changed',()=>refreshCalculations('team-activity'));
  window.addEventListener('atom-sync-update',()=>refreshCalculations('sync'));
  window.addEventListener('hashchange',()=>setTimeout(patchView,0));
  window.addEventListener('atom-view-rendered',()=>setTimeout(patchView,0));

  let queued=false;
  const mo=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;patchView();});});
  mo.observe(document.body,{childList:true,subtree:true});

  window.ATOM_SOURCE_TEAM_SYNC={version:VERSION,summary,baseTeams,baseActive,customTeam,setCustomTeam,customActive,patchView};
  styles();
  const timer=setInterval(()=>{if(install()){clearInterval(timer);patchView();refreshCalculations('install');}},50);
  setTimeout(()=>clearInterval(timer),6000);
})();