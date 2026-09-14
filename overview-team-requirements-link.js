(function(){
  const VERSION='1.0.0';
  const FILTER_KEY='atom-requirements-team-filter';
  const TARGET_HASH='#management/requirements';
  let applying=false;

  function teamFromCard(card){
    return card?.dataset?.coreTeam||card?.querySelector('.core-team-name')?.textContent?.trim()||'';
  }

  function saveTeam(team){
    if(team)sessionStorage.setItem(FILTER_KEY,team);
  }

  function savedTeam(){
    return sessionStorage.getItem(FILTER_KEY)||'';
  }

  function goToRequirements(team){
    if(!team)return;
    saveTeam(team);
    if(location.hash===TARGET_HASH){
      applyFilter();
    }else{
      location.hash=TARGET_HASH;
    }
  }

  function applyFilter(){
    if(applying||!location.hash.startsWith(TARGET_HASH))return;
    const team=savedTeam();
    if(!team)return;
    const select=document.getElementById('req-enh-team');
    if(!select)return;
    const option=[...select.options].find(o=>o.value===team);
    if(!option)return;
    if(select.value===team)return;
    applying=true;
    select.value=team;
    select.dispatchEvent(new Event('change',{bubbles:true}));
    setTimeout(()=>{applying=false;},0);
  }

  document.addEventListener('click',e=>{
    const card=e.target.closest('.core-team-card[data-core-team], .core-team-card');
    if(!card)return;
    const team=teamFromCard(card);
    if(!team)return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    goToRequirements(team);
  },true);

  document.addEventListener('change',e=>{
    const select=e.target.closest('#req-enh-team');
    if(!select)return;
    const value=select.value||'';
    if(value&&value!=='__all__')saveTeam(value);
    else sessionStorage.removeItem(FILTER_KEY);
  },true);

  let queued=false;
  function queue(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      applyFilter();
    });
  }

  new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});
  ['hashchange','atom-view-rendered','atom-sync-update','atom-core-data-changed'].forEach(ev=>window.addEventListener(ev,queue));

  window.ATOM_OVERVIEW_TEAM_REQUIREMENTS_LINK={version:VERSION,goToRequirements,applyFilter};
  setTimeout(queue,300);
  setTimeout(queue,900);
  setTimeout(queue,1800);
})();