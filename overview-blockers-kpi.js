(function(){
  const VERSION='1.0.0';
  let queued=false;

  function activeBlockers(){
    try{
      const rows=JSON.parse(localStorage.getItem('atom-blockers')||'[]')||[];
      return rows.filter(x=>!['Решен','Закрыт'].includes(x.status));
    }catch{return[];}
  }

  function patch(){
    if(!document.querySelector('#app .project-start-card'))return;
    const cards=[...document.querySelectorAll('#app .card.kpi')];
    const card=cards.find(c=>['Критические блокеры','Активные блокеры'].includes(c.querySelector('.label')?.textContent.trim()));
    if(!card)return;
    const list=activeBlockers();
    const critical=list.filter(x=>x.severity==='Критическая').length;
    const label=card.querySelector('.label');
    const value=card.querySelector('.value');
    const sub=card.querySelector('.sub');
    if(label)label.textContent='Активные блокеры';
    if(value)value.textContent=String(list.length);
    if(sub)sub.textContent=`из них критических: ${critical}`;
  }

  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;patch();});}
  new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});
  ['hashchange','atom-sync-update','atom-project-reconciled','atom-view-rendered'].forEach(ev=>window.addEventListener(ev,queue));
  window.ATOM_OVERVIEW_BLOCKERS_KPI={version:VERSION,patch};
  setTimeout(queue,300);setTimeout(queue,1000);
})();