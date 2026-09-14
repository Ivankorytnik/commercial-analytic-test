(function(){
  const VERSION='1.2.0';
  const SESSION_KEY='atom-pa-requirements-team-filter';
  const STABLE_KEY='atom-requirements-stable-team-filter';
  const PENDING_KEY='atom-requirements-team-filter-pending';
  const ALL='__all__';
  let restoring=false;
  let queued=false;
  let lockUntil=0;
  let statusEditing=false;

  function inRequirements(){return location.hash.startsWith('#management/requirements');}
  function currentSelect(){return document.getElementById('req-enh-team')||document.getElementById('pa-req-team');}
  function statusSelect(){return document.activeElement?.matches?.('[data-req-enh-status],select[data-pa-req-status],.core-raci-table select[data-core-field="statusId"]')?document.activeElement:null;}
  function validOption(select,value){return Boolean(select&&[...select.options].some(o=>o.value===value));}

  function remember(value,stable=true){
    if(!value)return;
    sessionStorage.setItem(SESSION_KEY,value);
    if(stable)sessionStorage.setItem(STABLE_KEY,value);
  }

  function rememberCurrentTeam(){
    const select=currentSelect();
    if(select)remember(select.value||ALL,true);
  }

  function desired(){
    const pending=sessionStorage.getItem(PENDING_KEY)||'';
    if(pending)return pending;
    return sessionStorage.getItem(STABLE_KEY)||sessionStorage.getItem(SESSION_KEY)||ALL;
  }

  function restore(){
    if(restoring||statusEditing||statusSelect()||Date.now()<lockUntil||!inRequirements())return;
    const select=currentSelect();if(!select)return;
    const wanted=desired();if(!wanted||!validOption(select,wanted))return;
    if(select.value===wanted)return;
    restoring=true;
    select.value=wanted;
    sessionStorage.setItem(SESSION_KEY,wanted);
    select.dispatchEvent(new Event('change',{bubbles:true}));
    setTimeout(()=>{restoring=false;},0);
  }

  // Freeze any filter restoration while the native status dropdown is open.
  document.addEventListener('pointerdown',e=>{
    const status=e.target.closest('[data-req-enh-status],select[data-pa-req-status],.core-raci-table select[data-core-field="statusId"]');
    if(!status||!inRequirements())return;
    rememberCurrentTeam();
    statusEditing=true;
    lockUntil=Date.now()+10000;
  },true);
  document.addEventListener('focusin',e=>{
    const status=e.target.closest('[data-req-enh-status],select[data-pa-req-status],.core-raci-table select[data-core-field="statusId"]');
    if(!status||!inRequirements())return;
    rememberCurrentTeam();
    statusEditing=true;
    lockUntil=Date.now()+10000;
  },true);
  document.addEventListener('focusout',e=>{
    const status=e.target.closest('[data-req-enh-status],select[data-pa-req-status],.core-raci-table select[data-core-field="statusId"]');
    if(!status)return;
    statusEditing=false;
    lockUntil=Date.now()+180;
    setTimeout(restore,220);
  },true);

  document.addEventListener('change',e=>{
    const team=e.target.closest('#req-enh-team,#pa-req-team');
    if(team&&!restoring){
      const value=team.value||ALL;
      if(value===ALL&&Date.now()<lockUntil&&sessionStorage.getItem(STABLE_KEY)!==ALL)return;
      remember(value,true);
      return;
    }

    const status=e.target.closest('[data-req-enh-status],select[data-pa-req-status],.core-raci-table select[data-core-field="statusId"]');
    if(status&&inRequirements()){
      rememberCurrentTeam();
      statusEditing=false;
      lockUntil=Date.now()+250;
      [300,700].forEach(ms=>setTimeout(restore,ms));
    }
  },true);

  function queue(){
    if(queued||statusEditing||statusSelect())return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;restore();});
  }
  new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});
  ['atom-core-data-changed','atom-sync-update','atom-view-rendered','hashchange','atom-project-reconciled'].forEach(ev=>window.addEventListener(ev,()=>{
    if(statusEditing||statusSelect())return;
    [120,500].forEach(ms=>setTimeout(restore,ms));
  }));

  window.ATOM_REQUIREMENTS_FILTER_PERSISTENCE={version:VERSION,restore,remember,rememberCurrentTeam};
  setTimeout(restore,300);setTimeout(restore,900);
})();