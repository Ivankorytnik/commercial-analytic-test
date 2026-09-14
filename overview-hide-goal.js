(function(){
  const VERSION='1.0.0';
  let queued=false;

  function removeGoal(){
    if(location.hash && location.hash!=='#overview')return;
    if(!document.querySelector('#app .project-start-card'))return;
    const titles=[...document.querySelectorAll('#app .section-title')];
    const goalTitle=titles.find(x=>x.querySelector('h2')?.textContent.trim()==='Цель проекта');
    if(!goalTitle)return;
    const next=goalTitle.nextElementSibling;
    if(next?.classList.contains('callout'))next.remove();
    goalTitle.remove();
  }

  function queue(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;removeGoal();});
  }

  new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});
  ['hashchange','atom-view-rendered','atom-sync-update','atom-core-data-changed'].forEach(ev=>window.addEventListener(ev,queue));
  window.ATOM_OVERVIEW_HIDE_GOAL={version:VERSION,removeGoal};
  setTimeout(queue,200);
  setTimeout(queue,700);
})();