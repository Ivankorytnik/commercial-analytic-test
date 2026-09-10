(function(){
  const PREFIX='#management/requirements/';
  const legacyPrefix='#teams/';

  function managementHash(team){return `${PREFIX}${encodeURIComponent(team||'')}`;}
  function teamFromHash(){
    const h=location.hash||'';
    if(!h.startsWith(PREFIX))return'';
    try{return decodeURIComponent(h.slice(PREFIX.length));}catch{return h.slice(PREFIX.length);}
  }
  function redirectLegacy(){
    const h=location.hash||'';
    if(!h.startsWith(legacyPrefix))return false;
    let team='';try{team=decodeURIComponent(h.slice(legacyPrefix.length));}catch{team=h.slice(legacyPrefix.length);}
    history.replaceState(null,'',managementHash(team));
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return true;
  }
  function applyTeam(){
    const team=teamFromHash();if(!team)return;
    const select=document.getElementById('pa-req-team');
    if(!select||![...select.options].some(o=>o.value===team))return;
    if(select.value!==team){select.value=team;select.dispatchEvent(new Event('change',{bubbles:true}));}
  }
  function go(team){
    const target=managementHash(team);
    if(location.hash===target){window.ATOM_PROJECT_ADMIN?.open?.();setTimeout(applyTeam,0);return;}
    location.hash=target;
  }

  document.addEventListener('click',e=>{
    const teamLink=e.target.closest('.pa-open-team,.raci-open-team,[data-core-team],[data-otr-team]');
    if(!teamLink)return;
    const team=teamLink.dataset.team||teamLink.dataset.coreTeam||teamLink.dataset.otrTeam;
    if(!team)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();go(team);
  },true);

  window.addEventListener('hashchange',()=>{
    if(redirectLegacy())return;
    if(location.hash.startsWith('#management/requirements'))setTimeout(applyTeam,0);
  });

  setTimeout(()=>{
    if(!redirectLegacy()&&location.hash.startsWith('#management/requirements'))applyTeam();
  },850);

  window.ATOM_MANAGEMENT_NAV={go,applyTeam};
})();