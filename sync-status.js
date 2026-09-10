(function(){
  function ensure(){
    const host=document.querySelector('.header-status');
    if(!host||document.getElementById('sync-state-pill'))return;
    const el=document.createElement('div');
    el.id='sync-state-pill';
    el.className='status-pill';
    el.style.background='#173233';
    el.style.border='1px solid #355556';
    el.textContent='Синхронизация...';
    host.appendChild(el);
  }
  function update(e){
    ensure();
    const el=document.getElementById('sync-state-pill');if(!el)return;
    const d=e?.detail||{};
    el.textContent=d.message||'Синхронизация...';
    if(d.state==='error'){el.style.background='#5b2d2d';el.style.borderColor='#8f4d4d';}
    else if(d.state==='saving'||d.state==='loading'){el.style.background='#5b4a20';el.style.borderColor='#8f7a3d';}
    else{el.style.background='#173233';el.style.borderColor='#355556';}
  }
  window.addEventListener('atom-sync-status',update);
  ensure();
})();