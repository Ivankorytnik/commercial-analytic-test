(function(){
  const DAY=86400000;
  function card(key,label,value,sub,percent){const p=typeof percent==='number'?`<div class="progress"><div style="width:${Math.max(0,Math.min(100,percent))}%"></div></div>`:'';return `<div class="card kpi overview-extra-kpi" data-summary-key="${key}"><div class="label">${label}</div><div class="value">${value}</div>${p}<div class="sub">${sub}</div></div>`;}
  function schedule(){const raw=localStorage.getItem('atom-project-started-at');if(!raw)return{percent:0,text:'отсчет начнется после старта'};const start=Number(raw),elapsed=Math.max(0,Date.now()-start),percent=Math.min(100,Math.floor(elapsed/(91*DAY)*100)),left=Math.max(0,91-Math.floor(elapsed/DAY));return{percent,text:left?`осталось ${left} дн.`:'плановый срок истек'};}
  function render(){
    const grid=document.querySelector('#app .grid'),startCard=document.querySelector('#app .project-start-card');if(!grid||!startCard||!window.ATOM_LOGIC||typeof DATA==='undefined')return;
    const logic=window.ATOM_LOGIC,src=logic.sourcesSummary(),own=logic.ownersSummary(),dict=logic.dictionarySummary(),dod=logic.dodEvaluation(),sch=schedule();
    const stagesDone=(DATA.stages||[]).filter(s=>logic.stageStatus(s.id)==='Завершено').length;
    [...grid.querySelectorAll('.card.kpi:not(.overview-extra-kpi)')].forEach(c=>{const l=c.querySelector('.label')?.textContent.trim(),v=c.querySelector('.value'),sub=c.querySelector('.sub');if(l==='Готовность проекта'&&v)v.textContent=`${logic.projectProgress()}%`;if(l==='Источники готовы'&&v)v.textContent=`${src.ready} / ${src.total}`;if(l==='Владельцы назначены'&&v){v.textContent=`${own.ready} / ${own.total}`;if(sub)sub.textContent='по назначенным ответственным в RACI';}if(l==='Критические блокеры'&&v){const active=logic.activeBlockers(),critical=active.filter(x=>x.severity==='Критическая').length;v.textContent=String(critical);if(sub)sub.textContent=`активных всего: ${active.length}`;}});
    const values={stages:[`${stagesDone} / ${DATA.stages.length}`,'статус «Завершено»'],dictionary:[`${dict.ready} / ${dict.total}`,'включая добавленные вручную поля'],dod:[`${dod.filter(x=>x.ok).length} / ${dod.length}`,'рассчитывается автоматически'],schedule:[`${sch.percent}%`,sch.text,sch.percent]};
    grid.querySelectorAll('.overview-extra-kpi').forEach(x=>x.remove());
    grid.insertAdjacentHTML('beforeend',card('stages','Этапы завершены',...values.stages)+card('dictionary','Data Dictionary',...values.dictionary)+card('dod','Definition of Done',...values.dod)+card('schedule','Срок использован',...values.schedule));
    let today=app.querySelector('[data-overview-today]');if(!today){today=document.createElement('div');today.className='card';today.dataset.overviewToday='1';today.style.marginTop='16px';grid.insertAdjacentElement('afterend',today);}
    window.ATOM_LOGIC_UI?.patchCurrent?.();
  }
  const root=document.getElementById('app');if(root){let q=false;new MutationObserver(()=>{if(q)return;q=true;requestAnimationFrame(()=>{q=false;render();});}).observe(root,{childList:true});}
  window.addEventListener('atom-sync-update',render);setInterval(()=>{if(document.querySelector('#app .project-start-card'))render();},60000);render();
})();