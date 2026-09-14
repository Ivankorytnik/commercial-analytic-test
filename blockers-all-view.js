(function(){
  const VERSION='1.1.0';
  let queued=false;
  let filter='active';

  const readBlockers=()=>{try{return JSON.parse(localStorage.getItem('atom-blockers')||'[]')||[]}catch{return[]}};

  function styles(){
    if(document.getElementById('blockers-all-view-css'))return;
    const s=document.createElement('style');
    s.id='blockers-all-view-css';
    s.textContent=`
      .blockers-filterbar{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:10px 0 12px}
      .blockers-filterbar .btn{padding:6px 10px;font-size:10px}
      .blockers-filterbar .btn.active{background:#0f756d;color:#fff;border-color:#0f756d}
      .blockers-filterbar .blockers-filter-count{color:var(--muted);font-size:10px;margin-left:auto}
    `;
    document.head.appendChild(s);
  }

  function isIssues(){
    return location.hash==='#issues'||Boolean([...document.querySelectorAll('#app .section-title h2')].find(x=>['Критические блокеры','Блокеры'].includes(x.textContent.trim())));
  }

  function counters(rows){
    const total=rows.length;
    const active=rows.filter(x=>!['Решен','Закрыт'].includes(x.status)).length;
    const critical=rows.filter(x=>x.severity==='Критическая'&&!['Решен','Закрыт'].includes(x.status)).length;
    const solved=rows.filter(x=>['Решен','Закрыт'].includes(x.status)).length;
    return{total,active,critical,solved};
  }

  function rowMatches(row){
    const severity=row.querySelector('.blocker-severity')?.value||'';
    const status=row.querySelector('.blocker-status')?.value||'';
    if(filter==='active')return !['Решен','Закрыт'].includes(status);
    if(filter==='critical')return severity==='Критическая'&&!['Решен','Закрыт'].includes(status);
    if(filter==='solved')return ['Решен','Закрыт'].includes(status);
    return true;
  }

  function applyFilter(){
    const table=[...document.querySelectorAll('#app table.table')].find(t=>t.querySelector('.blocker-status'));
    if(!table)return;
    const rows=[...table.querySelectorAll('tbody tr')];
    let visible=0;
    rows.forEach(row=>{const show=rowMatches(row);row.style.display=show?'':'none';if(show)visible++;});
    const count=document.querySelector('.blockers-filter-count');
    if(count)count.textContent=`Показано: ${visible} из ${rows.length}`;
    document.querySelectorAll('.blockers-filterbar [data-blocker-filter]').forEach(btn=>btn.classList.toggle('active',btn.dataset.blockerFilter===filter));
  }

  function patch(){
    if(!isIssues())return;
    styles();
    const title=[...document.querySelectorAll('#app .section-title')].find(x=>['Критические блокеры','Блокеры'].includes(x.querySelector('h2')?.textContent.trim()));
    if(!title)return;
    const rows=readBlockers(),c=counters(rows);
    const h2=title.querySelector('h2');if(h2)h2.textContent='Блокеры';
    const small=title.querySelector('small');if(small)small.textContent=`активных: ${c.active}, критических активных: ${c.critical}, решенных в истории: ${c.solved}`;

    let bar=document.querySelector('.blockers-filterbar');
    const table=[...document.querySelectorAll('#app table.table')].find(t=>t.querySelector('.blocker-status'));
    if(table&&!bar){
      bar=document.createElement('div');bar.className='blockers-filterbar';
      bar.innerHTML=`<button type="button" class="btn" data-blocker-filter="all">Все</button><button type="button" class="btn active" data-blocker-filter="active">Активные</button><button type="button" class="btn" data-blocker-filter="critical">Критические</button><button type="button" class="btn" data-blocker-filter="solved">Решенные</button><span class="blockers-filter-count"></span>`;
      table.insertAdjacentElement('beforebegin',bar);
    }
    applyFilter();
  }

  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-blocker-filter]');if(!btn)return;
    filter=btn.dataset.blockerFilter||'active';applyFilter();
  });
  document.addEventListener('change',e=>{
    if(e.target.closest('.blocker-status,.blocker-severity'))setTimeout(()=>{patch();applyFilter();},0);
  });

  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;patch();});}
  new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});
  ['hashchange','atom-sync-update','atom-view-rendered','atom-project-reconciled','atom-blocker-status-manual','atom-core-data-changed'].forEach(ev=>window.addEventListener(ev,queue));
  window.ATOM_BLOCKERS_ALL_VIEW={version:VERSION,patch};
  setTimeout(queue,200);setTimeout(queue,700);
})();