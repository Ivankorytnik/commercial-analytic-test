(function(){
  if(document.getElementById('gantt-compact-status-css')) return;
  const style=document.createElement('style');
  style.id='gantt-compact-status-css';
  style.textContent=`
    .gantt-meta .gantt-cell:nth-child(2){
      flex-direction:row!important;
      align-items:center!important;
      justify-content:flex-start!important;
      gap:6px!important;
      flex-wrap:nowrap!important;
      white-space:nowrap!important;
    }
    .gantt-meta .gantt-cell:nth-child(2)>b{
      flex:0 0 auto;
      margin:0!important;
      font-size:10px!important;
    }
    .gantt-meta .gantt-cell:nth-child(2) .gantt-status-badge{
      flex:0 0 auto;
      margin:0!important;
    }
    .gantt-meta .gantt-cell:nth-child(2) .gantt-mini-progress{
      flex:1 1 28px;
      width:28px;
      min-width:18px;
      max-width:36px;
      margin:0!important;
    }
    .gantt-focus-wrap .gantt-row,
    .gantt-track{
      min-height:50px!important;
    }
    .gantt-bar,
    .gantt-extension{
      top:10px!important;
      height:28px!important;
    }
  `;
  document.head.appendChild(style);
})();