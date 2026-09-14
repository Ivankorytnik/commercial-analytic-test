(function(){
  const VERSION='1.0.0';
  let queued=false;

  function styles(){
    if(document.getElementById('overview-kpi-compact-css'))return;
    const s=document.createElement('style');
    s.id='overview-kpi-compact-css';
    s.textContent=`
      #app .overview-kpi-grid{gap:9px!important}
      #app .overview-kpi-grid .card.kpi{
        min-height:84px;
        padding:11px 12px;
        border-radius:11px;
        display:flex;
        flex-direction:column;
        justify-content:center;
      }
      #app .overview-kpi-grid .kpi .label{font-size:10px;margin-bottom:4px}
      #app .overview-kpi-grid .kpi .value{font-size:20px;line-height:1.1}
      #app .overview-kpi-grid .kpi .sub{font-size:9px;margin-top:4px;line-height:1.2}
      #app .overview-kpi-grid .kpi .progress{height:5px;margin-top:6px;margin-bottom:1px}
      @media(max-width:900px){#app .overview-kpi-grid{grid-template-columns:repeat(2,1fr)!important}}
      @media(max-width:600px){#app .overview-kpi-grid{grid-template-columns:1fr!important}}
    `;
    document.head.appendChild(s);
  }

  function patch(){
    if(location.hash && location.hash!=='#overview')return;
    if(!document.querySelector('#app .project-start-card'))return;
    const grid=document.querySelector('#app .project-start-card + .grid')||document.querySelector('#app .grid');
    if(!grid)return;
    grid.classList.add('overview-kpi-grid');
  }

  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;styles();patch();});}
  new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});
  ['hashchange','atom-view-rendered','atom-sync-update','atom-core-data-changed','atom-project-reconciled'].forEach(ev=>window.addEventListener(ev,queue));
  window.ATOM_OVERVIEW_KPI_COMPACT={version:VERSION,patch};
  setTimeout(queue,200);setTimeout(queue,700);
})();