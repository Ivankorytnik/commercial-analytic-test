(function(){
  const VERSION='1.0.1';
  const DAY=86400000;
  const LIBS={
    html2canvas:[
      'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
      'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js'
    ],
    jspdf:[
      'https://cdn.jsdelivr.net/npm/jspdf@4.2.1/dist/jspdf.umd.min.js',
      'https://unpkg.com/jspdf@4.2.1/dist/jspdf.umd.min.js'
    ]
  };

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const pct=v=>Math.max(0,Math.min(100,Math.round(Number(v)||0)));
  const pad=n=>String(n).padStart(2,'0');
  const dateLabel=ts=>{const d=new Date(ts);return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`;};
  const fileDate=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};

  function readJson(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'')??fallback}catch{return fallback}}
  function activeBlockers(){return readJson('atom-blockers',[]).filter(x=>!['Решен','Закрыт'].includes(String(x?.status||'')));}

  function getData(){
    const core=window.ATOM_CORE;
    const rules=window.ATOM_REQUIREMENT_PROGRESS_RULES;
    let projectProgress=0;
    try{
      const displayed=parseInt(document.getElementById('header-progress')?.textContent||'0',10)||0;
      projectProgress=rules?.projectProgress?.() ?? core?.projectProgress?.() ?? displayed;
    }catch{}

    let owners={ready:0,total:0},sources={ready:0,total:0,identified:0,problem:0},dictionary={ready:0,total:0};
    try{owners=core?.ownersSummary?.()||owners}catch{}
    try{sources=core?.sourcesSummary?.()||sources}catch{}
    try{dictionary=core?.dictionarySummary?.()||dictionary}catch{}

    let activeTeams=0;
    try{activeTeams=window.ATOM_TEAM_ACTIVITY?.activeCount?.() ?? core?.teams?.().length ?? 0}catch{}

    const stages=[];
    for(let id=1;id<=12;id++){
      try{
        const s=core?.stageSummary?.(id);
        if(s&&s.relevant!==false)stages.push({id,name:s.name||core?.stageName?.(id)||`Этап ${id}`,progress:pct(s.progress),status:s.status||'',problem:Boolean(s.problem)});
      }catch{}
    }

    const blockers=activeBlockers();
    const critical=blockers.filter(x=>String(x?.severity||'')==='Критическая');
    const startedAt=Number(localStorage.getItem('atom-project-started-at')||0)||0;
    const plannedEnd=startedAt?startedAt+90*DAY:0;
    const daysIn=startedAt?Math.max(0,Math.floor((Date.now()-startedAt)/DAY)):0;
    const daysLeft=plannedEnd?Math.max(0,Math.ceil((plannedEnd-Date.now())/DAY)):null;

    const currentStages=stages.filter(s=>s.progress>0&&s.progress<100).sort((a,b)=>(Number(b.problem)-Number(a.problem))||(b.progress-a.progress)).slice(0,4);
    const nextStages=stages.filter(s=>s.progress<100&&!currentStages.some(c=>c.id===s.id)).sort((a,b)=>a.id-b.id).slice(0,3);

    let goal='Единая сквозная аналитика B2B: от источника лида и CRM до продажи, 1С, DWH и BI.';
    try{if(typeof DATA!=='undefined'&&DATA?.goal)goal=DATA.goal}catch{}

    let status='Не запущен';
    if(startedAt)status=projectProgress>=100?'Завершен':critical.length?'Критический риск':blockers.length?'В работе, есть блокеры':'В работе';

    const focus=[];
    if(critical.length)focus.push(`Снять критические блокеры: ${critical.slice(0,2).map(x=>x.source||x.description||'без названия').join(', ')}`);
    else if(blockers.length)focus.push(`Закрыть активные блокеры: ${blockers.length}`);
    if((sources.ready||0)<(sources.total||0))focus.push(`Довести источники данных до готовности: ${sources.ready||0}/${sources.total||0}`);
    if((dictionary.ready||0)<(dictionary.total||0))focus.push(`Закрыть Data Dictionary: ${dictionary.ready||0}/${dictionary.total||0}`);
    if(nextStages.length)focus.push(`Следующий этап: ${nextStages[0].name}`);
    if(!focus.length)focus.push('Финальная приемка и стабилизация рабочего контура.');

    const build=document.querySelector('.build-meta b')?.textContent?.trim()||'';
    return {projectProgress,owners,sources,dictionary,activeTeams,stages,currentStages,nextStages,blockers,critical,startedAt,plannedEnd,daysIn,daysLeft,goal,status,focus:focus.slice(0,3),build};
  }

  function stageRows(rows){
    if(!rows.length)return '<div class="dop-empty">Нет активных этапов</div>';
    return rows.map(s=>`<div class="dop-stage"><div class="dop-stage-head"><b>${esc(s.name)}</b><span>${s.progress}%</span></div><div class="dop-bar"><i style="width:${s.progress}%"></i></div><small>${esc(s.status||'')}</small></div>`).join('');
  }

  function blockerRows(rows){
    if(!rows.length)return '<div class="dop-ok">Активных блокеров нет</div>';
    return rows.slice(0,4).map(x=>`<div class="dop-blocker"><div><b>${esc(x.source||'Блокер')}</b><span class="dop-sev">${esc(x.severity||'')}</span></div><p>${esc(x.description||x.comment||'Без описания')}</p><small>${esc(x.owner||'Не назначен')}${x.due?` · срок ${esc(x.due)}`:''}</small></div>`).join('');
  }

  function buildSheet(d){
    const root=document.createElement('div');
    root.id='director-onepage-sheet';
    root.innerHTML=`
      <div class="dop-head"><div><div class="dop-brand">АТОМ</div><div class="dop-eyebrow">COMMERCIAL ANALYTICS · B2B</div></div><div class="dop-head-right"><b>ONE-PAGE ДЛЯ КОММЕРЧЕСКОГО ДИРЕКТОРА</b><span>Срез на ${dateLabel(Date.now())}</span></div></div>
      <div class="dop-title"><div><h1>Проект коммерческой аналитики АТОМ</h1><p>${esc(d.goal)}</p></div><div class="dop-status ${d.critical.length?'risk':''}">${esc(d.status)}</div></div>
      <div class="dop-kpis">
        <div class="dop-kpi main"><span>Готовность проекта</span><b>${pct(d.projectProgress)}%</b><div class="dop-bar big"><i style="width:${pct(d.projectProgress)}%"></i></div></div>
        <div class="dop-kpi"><span>Дней в проекте</span><b>${d.startedAt?d.daysIn:'-'}</b><small>${d.startedAt?`старт ${dateLabel(d.startedAt)}`:'проект не запущен'}</small></div>
        <div class="dop-kpi"><span>До планового финиша</span><b>${d.daysLeft===null?'-':d.daysLeft}</b><small>${d.plannedEnd?dateLabel(d.plannedEnd):'дата не задана'}</small></div>
        <div class="dop-kpi"><span>Активные команды</span><b>${d.activeTeams||0}</b><small>в рабочем контуре</small></div>
        <div class="dop-kpi"><span>Источники готовы</span><b>${d.sources.ready||0}/${d.sources.total||0}</b><small>идентифицировано ${d.sources.identified||0}</small></div>
        <div class="dop-kpi"><span>Активные блокеры</span><b>${d.blockers.length}</b><small>критических ${d.critical.length}</small></div>
      </div>
      <div class="dop-main-grid">
        <section class="dop-panel"><h2>Сейчас в работе</h2>${stageRows(d.currentStages)}</section>
        <section class="dop-panel"><h2>Ключевые блокеры</h2>${blockerRows(d.blockers)}</section>
        <section class="dop-panel"><h2>Готовность контура</h2><div class="dop-metric"><span>Владельцы / RACI</span><b>${d.owners.ready||0}/${d.owners.total||0}</b></div><div class="dop-metric"><span>Источники данных</span><b>${d.sources.ready||0}/${d.sources.total||0}</b></div><div class="dop-metric"><span>Data Dictionary</span><b>${d.dictionary.ready||0}/${d.dictionary.total||0}</b></div><div class="dop-flow">Источник лида <i>→</i> Сайт / Метрики <i>→</i> ELMA <i>→</i> Альфа-Авто <i>→</i> 1С <i>→</i> DWH <i>→</i> BI</div></section>
      </div>
      <div class="dop-bottom-grid"><section class="dop-panel focus"><h2>Ближайший управленческий фокус</h2><ol>${d.focus.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></section><section class="dop-panel next"><h2>Следующие этапы</h2>${d.nextStages.length?d.nextStages.map(s=>`<div class="dop-next-row"><span>${esc(s.name)}</span><b>${s.progress}%</b></div>`).join(''):'<div class="dop-ok">Все этапы закрыты</div>'}</section></div>
      <div class="dop-foot"><span>АТОМ · Управление внедрением коммерческой аналитики</span><span>${esc(d.build||'TEST')} · PDF module ${VERSION}</span><span>Сформировано автоматически из текущих данных проекта</span></div>`;
    document.body.appendChild(root);
    return root;
  }

  function ensureStyles(){
    if(document.getElementById('director-onepage-style'))return;
    const style=document.createElement('style');
    style.id='director-onepage-style';
    style.textContent=`
      #director-onepage-sheet{position:fixed;left:-20000px;top:0;width:1123px;height:794px;padding:0;background:#f4f7f7;color:#102526;font-family:Arial,Helvetica,sans-serif;z-index:-1;overflow:hidden}#director-onepage-sheet *{box-sizing:border-box}
      .dop-head{height:82px;padding:17px 28px;background:#102526;color:#fff;border-bottom:5px solid #35d8c7;display:flex;justify-content:space-between;align-items:center}.dop-brand{font-size:31px;font-weight:900;letter-spacing:5px}.dop-eyebrow{font-size:10px;letter-spacing:1.4px;color:#35d8c7;margin-top:3px;font-weight:700}.dop-head-right{text-align:right;display:flex;flex-direction:column;gap:4px}.dop-head-right b{font-size:13px;letter-spacing:.4px}.dop-head-right span{font-size:11px;color:#bdd0d0}
      .dop-title{height:86px;padding:15px 28px 12px;display:flex;justify-content:space-between;gap:24px;align-items:flex-start;background:#fff;border-bottom:1px solid #dbe5e5}.dop-title h1{font-size:26px;margin:0 0 7px;line-height:1.05}.dop-title p{font-size:11px;color:#66797a;margin:0;max-width:780px;line-height:1.35}.dop-status{padding:9px 12px;border-radius:999px;background:#e5f7ef;color:#227457;font-size:11px;font-weight:700;white-space:nowrap}.dop-status.risk{background:#fdeaea;color:#a53636}
      .dop-kpis{height:106px;padding:12px 28px;display:grid;grid-template-columns:1.35fr repeat(5,1fr);gap:10px}.dop-kpi{background:#fff;border:1px solid #dbe5e5;border-radius:11px;padding:11px 12px;display:flex;flex-direction:column;justify-content:center;min-width:0}.dop-kpi span{font-size:10px;color:#66797a;margin-bottom:5px}.dop-kpi b{font-size:22px;line-height:1}.dop-kpi small{font-size:9px;color:#7c8e8f;margin-top:6px}.dop-kpi.main b{font-size:27px}.dop-bar{height:7px;border-radius:99px;background:#e6eeee;overflow:hidden;margin-top:8px}.dop-bar i{display:block;height:100%;background:#0f6962}.dop-bar.big{height:8px}
      .dop-main-grid{height:323px;padding:0 28px 12px;display:grid;grid-template-columns:1.08fr 1.08fr .94fr;gap:12px}.dop-panel{background:#fff;border:1px solid #dbe5e5;border-radius:12px;padding:13px 14px;overflow:hidden}.dop-panel h2{font-size:14px;margin:0 0 10px}.dop-stage{margin-bottom:9px}.dop-stage:last-child{margin-bottom:0}.dop-stage-head{display:flex;justify-content:space-between;gap:12px;font-size:10.5px}.dop-stage-head b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dop-stage small{display:block;color:#7a8d8e;font-size:8.5px;margin-top:3px}.dop-stage .dop-bar{margin-top:5px;height:6px}
      .dop-blocker{border-left:3px solid #d95c5c;padding:6px 0 6px 9px;margin-bottom:7px}.dop-blocker>div{display:flex;justify-content:space-between;gap:8px;font-size:10px}.dop-blocker p{font-size:9px;line-height:1.25;margin:3px 0;color:#425959;max-height:24px;overflow:hidden}.dop-blocker small{font-size:8px;color:#7a8d8e}.dop-sev{font-size:8px;color:#a53636;font-weight:700}.dop-ok,.dop-empty{padding:10px;border-radius:8px;background:#eaf8f2;color:#227457;font-size:10px;font-weight:700}.dop-empty{background:#f1f5f5;color:#66797a}
      .dop-metric{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid #edf2f2;font-size:10px}.dop-metric b{font-size:15px}.dop-flow{margin-top:12px;padding:11px 10px;background:#eefcfa;border-left:4px solid #35d8c7;border-radius:8px;font-size:9px;line-height:1.65;color:#294343}.dop-flow i{font-style:normal;color:#0f6962;font-weight:700;margin:0 2px}
      .dop-bottom-grid{height:151px;padding:0 28px 12px;display:grid;grid-template-columns:1.65fr 1fr;gap:12px}.dop-panel.focus ol{margin:0;padding-left:18px}.dop-panel.focus li{font-size:10px;line-height:1.35;margin:4px 0}.dop-next-row{display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid #edf2f2;padding:6px 0;font-size:9.5px}.dop-next-row:last-child{border-bottom:0}.dop-next-row span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .dop-foot{height:46px;padding:0 28px;background:#fff;border-top:1px solid #dbe5e5;display:flex;align-items:center;justify-content:space-between;gap:20px;font-size:8.5px;color:#66797a}.director-pdf-nav{display:block;width:100%;text-align:left;border:0;background:#102526;padding:12px 14px;margin:4px 0;border-radius:8px;color:#fff;cursor:pointer;font:700 13px Arial,Helvetica,sans-serif}.director-pdf-nav:hover{background:#173f40}.director-pdf-nav:disabled{opacity:.55;cursor:wait}@media(max-width:900px){.director-pdf-nav{min-width:220px;margin-right:4px}}
    `;
    document.head.appendChild(style);
  }

  function loadScript(url){return new Promise((resolve,reject)=>{const existing=[...document.scripts].find(s=>s.src===url);if(existing){if(existing.dataset.loaded==='1')return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return;}const s=document.createElement('script');s.src=url;s.async=true;s.dataset.pdfLib='1';s.onload=()=>{s.dataset.loaded='1';resolve();};s.onerror=()=>reject(new Error(`Не удалось загрузить ${url}`));document.head.appendChild(s);});}
  async function loadAny(urls,check){if(check())return;let last;for(const url of urls){try{await loadScript(url);if(check())return;}catch(e){last=e;}}throw last||new Error('PDF-библиотека недоступна');}
  async function ensureLibraries(){await loadAny(LIBS.html2canvas,()=>typeof window.html2canvas==='function');await loadAny(LIBS.jspdf,()=>Boolean(window.jspdf?.jsPDF));}
  async function waitForData(limit=2600){const start=Date.now();while(Date.now()-start<limit){if(window.ATOM_CORE&&window.ATOM_REQUIREMENT_PROGRESS_RULES)return;await new Promise(r=>setTimeout(r,100));}}

  async function generate(){
    const btn=document.getElementById('director-onepage-pdf-btn');if(btn?.disabled)return;const old=btn?.textContent||'';if(btn){btn.disabled=true;btn.textContent='Формирую PDF...';}let sheet;
    try{
      await waitForData();await ensureLibraries();ensureStyles();const data=getData();sheet=buildSheet(data);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const canvas=await window.html2canvas(sheet,{scale:2,backgroundColor:'#f4f7f7',logging:false,useCORS:true,width:1123,height:794,windowWidth:1123,windowHeight:794,scrollX:0,scrollY:0});
      const img=canvas.toDataURL('image/jpeg',0.94);const {jsPDF}=window.jspdf;const pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true});pdf.addImage(img,'JPEG',0,0,297,210,undefined,'FAST');pdf.setProperties({title:'АТОМ - Коммерческая аналитика - One-page для коммерческого директора',subject:'Статус проекта коммерческой аналитики',creator:'ATOM Commercial Analytics'});pdf.save(`ATOM_Commercial_Analytics_OnePage_${fileDate()}.pdf`);window.dispatchEvent(new CustomEvent('atom-director-onepage-generated',{detail:{version:VERSION,generatedAt:new Date().toISOString()}}));
    }catch(e){console.error('director onepage pdf failed',e);alert('Не удалось сформировать PDF. Проверьте интернет-соединение и повторите.');}
    finally{sheet?.remove();if(btn){btn.disabled=false;btn.textContent=old||'One-page PDF для директора';}}
  }

  function bind(){ensureStyles();const btn=document.getElementById('director-onepage-pdf-btn');if(btn&&!btn.dataset.bound){btn.dataset.bound='1';btn.addEventListener('click',generate);}}
  bind();window.addEventListener('atom-sync-ready',bind);window.ATOM_DIRECTOR_ONEPAGE={version:VERSION,generate,getData};
})();
