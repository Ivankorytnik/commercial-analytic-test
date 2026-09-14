(function(){
  const VERSION='1.0.0';
  const FALLBACK_IDS={
    'Коммерческий блок':'commercial','B2B продажи':'b2b','B2C продажи':'b2c','Маркетинг':'marketing',
    'Сайт':'site','Метрики':'metrics','1 линия':'line1','2 линия':'line2','ELMA':'elma',
    'Альфа-Авто':'alfa','1С / финансы':'finance','DATA / DWH':'dwh','BI':'bi','ИБ':'ib'
  };

  function teamId(team){return window.ATOM_CORE?.TEAM_IDS?.[team]||FALLBACK_IDS[team]||String(team||'').toLowerCase().replace(/[^a-zа-я0-9]+/gi,'-')}
  function key(team){return `atom-team-active-${teamId(team)}`}
  function isActive(team){return localStorage.getItem(key(team))!=='0'}
  function teams(){return window.ATOM_CORE?.teams?.()||Object.keys(FALLBACK_IDS)}

  function styles(){
    if(document.getElementById('team-activity-ui-css'))return;
    const s=document.createElement('style');s.id='team-activity-ui-css';s.textContent=`
      .team-activity-ui-cell{width:82px;min-width:82px;text-align:center!important;vertical-align:middle!important}
      .team-activity-ui-toggle{display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap;font-size:10px;font-weight:700;color:#425959}
      .team-activity-ui-toggle input{width:17px!important;height:17px!important;min-width:17px;margin:0;accent-color:#0f8f84;cursor:pointer}
      #pa-panel .pa-table tr.team-activity-ui-inactive{background:#f1f3f3!important;color:#7a898a}
      #pa-panel .pa-table tr.team-activity-ui-inactive td:not(.team-activity-ui-cell){opacity:.62}
      #pa-panel .pa-table tr.team-activity-ui-inactive .team-activity-ui-cell{opacity:1}
    `;document.head.appendChild(s);
  }

  function updateKpi(){
    const list=teams(),active=list.filter(isActive).length;
    const first=document.querySelector('#pa-panel .pa-kpi');
    if(!first)return;
    const label=first.querySelector('span'),value=first.querySelector('b');
    if(label)label.textContent='Активные команды';
    if(value)value.textContent=`${active} / ${list.length}`;
  }

  function patch(){
    if(!location.hash.startsWith('#management/teams'))return;
    const table=document.querySelector('#pa-panel .pa-table');
    if(!table)return;
    styles();

    const rows=[...table.querySelectorAll('tbody tr')];
    if(!rows.length)return;
    const existing=table.querySelector('[data-team-active]');
    const head=table.querySelector('thead tr');

    if(!existing&&head){
      let th=head.querySelector('[data-team-activity-ui-head]');
      if(!th){
        th=document.createElement('th');
        th.dataset.teamActivityUiHead='1';
        th.className='team-activity-ui-cell';
        th.textContent='Активна';
        head.insertBefore(th,head.children[1]||null);
      }

      rows.forEach(row=>{
        const team=row.children[0]?.textContent.trim();
        if(!team||row.querySelector('[data-team-active]'))return;
        const td=document.createElement('td');
        td.className='team-activity-ui-cell';
        td.innerHTML=`<label class="team-activity-ui-toggle"><input type="checkbox" data-team-active="${team.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" ${isActive(team)?'checked':''}><span>${isActive(team)?'Да':'Нет'}</span></label>`;
        row.insertBefore(td,row.children[1]||null);
      });
    }

    rows.forEach(row=>{
      const team=row.children[0]?.textContent.trim();if(!team)return;
      const input=row.querySelector('[data-team-active]');
      if(input){input.checked=isActive(team);const text=input.closest('label')?.querySelector('span');if(text)text.textContent=input.checked?'Да':'Нет';}
      row.classList.toggle('team-activity-ui-inactive',!isActive(team));
    });
    updateKpi();
  }

  function setActive(team,value){
    if(window.ATOM_TEAM_ACTIVITY?.setActive){
      window.ATOM_TEAM_ACTIVITY.setActive(team,value);
    }else{
      localStorage.setItem(key(team),value?'1':'0');
      window.dispatchEvent(new CustomEvent('atom-team-activity-changed',{detail:{team,active:Boolean(value)}}));
      window.dispatchEvent(new CustomEvent('atom-core-data-changed',{detail:{type:'team-activity',team,active:Boolean(value)}}));
    }
    setTimeout(patch,60);
  }

  document.addEventListener('change',e=>{
    const input=e.target.closest('[data-team-active]');
    if(!input)return;
    const team=input.dataset.teamActive;
    setActive(team,input.checked);
  },true);

  let queued=false;
  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;patch();});}
  new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});
  ['hashchange','atom-core-ready','atom-sync-update','atom-view-rendered','atom-team-activity-changed'].forEach(ev=>window.addEventListener(ev,queue));
  window.ATOM_TEAM_ACTIVITY_UI={version:VERSION,patch};
  styles();
  setTimeout(queue,250);
  setTimeout(queue,900);
  setTimeout(queue,1800);
})();