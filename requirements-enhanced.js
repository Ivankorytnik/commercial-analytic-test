(function(){
  const VERSION='2.0.0';
  const REL_PREFIX='atom-requirement-not-actual-';
  const EXCLUDED_LABEL_PREFIX='atom-requirement-excluded-label-';

  const core=()=>window.ATOM_CORE;
  const key=id=>`${REL_PREFIX}${id}`;
  const isNotActual=id=>localStorage.getItem(key(id))==='1';

  function closeRequirementBlocker(id,note){
    let rows=[];
    try{rows=JSON.parse(localStorage.getItem('atom-blockers')||'[]')||[];}catch{}
    let changed=false;
    rows.forEach(b=>{
      if(b.autoKey!==`CORE:RACI:${id}`)return;
      if(['Решен','Закрыт'].includes(b.status))return;
      b.status='Решен';
      if(note&&!String(b.comment||'').includes(note))b.comment=(b.comment?b.comment+'\n':'')+note;
      changed=true;
    });
    if(changed)localStorage.setItem('atom-blockers',JSON.stringify(rows));
  }

  function setNotActual(id,value,label='Не актуально'){
    if(!id)return;
    if(value){
      localStorage.setItem(key(id),'1');
      localStorage.setItem(`${EXCLUDED_LABEL_PREFIX}${id}`,label||'Не актуально');
      closeRequirementBlocker(id,`Требование исключено из актуального контура: ${label||'Не актуально'}.`);
    }else{
      localStorage.removeItem(key(id));
      localStorage.removeItem(`${EXCLUDED_LABEL_PREFIX}${id}`);
    }
    try{core()?.reconcile?.();}catch{}
    window.dispatchEvent(new CustomEvent('atom-core-data-changed',{detail:{type:'requirement-relevance',id,notActual:Boolean(value),label}}));
  }

  function installCompatibility(){
    const c=core();if(!c)return false;
    c.isRequirementNotActual=isNotActual;
    c.setRequirementNotActual=setNotActual;
    return true;
  }

  function render(){
    if(!location.hash.startsWith('#management/requirements'))return;
    try{window.ATOM_PROJECT_ADMIN?.open?.();}catch{}
    setTimeout(()=>{
      try{window.ATOM_REQUIREMENTS_TIME?.patch?.();}catch{}
      try{window.ATOM_REQUIREMENTS_STATUS_DIRECTORY?.patch?.();}catch{}
      try{window.ATOM_REQUIREMENTS_ALL_TEAM_FILTER?.patch?.();}catch{}
    },0);
  }

  // This module intentionally no longer renders a second requirements table and no
  // longer overrides progress/stage/period calculations. project-admin.js owns the UI;
  // dedicated modules own status, period, team activity and progress rules.
  window.ATOM_REQUIREMENTS_ENHANCED={
    version:VERSION,
    compatibilityOnly:true,
    isNotActual,
    setNotActual,
    render
  };

  const timer=setInterval(()=>{if(installCompatibility())clearInterval(timer);},50);
  setTimeout(()=>clearInterval(timer),5000);
  window.addEventListener('atom-core-ready',installCompatibility);
})();