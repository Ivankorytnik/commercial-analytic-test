(function(){
  const KEY='atom-weekly-report-v1';
  const ARCHIVE_KEY='atom-weekly-report-archive-v1';
  const DAY=86400000;
  const PDF_LIB='https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.2/dist/html2pdf.bundle.min.js';
  let state=loadState();
  let saveTimer=null;
  let pdfLoading=null;

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const read=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||'');return v??f}catch{return f}};
  const pad=n=>String(n).padStart(2,'0');
  const inputDate=ts=>{const d=new Date(ts);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
  const fmt=v=>{if(!v)return'Не задано';const p=String(v).slice(0,10).split('-');return p.length===3?`${p[2]}.${p[1]}.${p[0]}`:v};
  const dt=v=>{if(!v)return'';const d=new Date(v);return Number.isNaN(d.getTime())?'':`${pad(d.getDate())}.${pad(d.getMonth()+1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`};
  const core=()=>window.ATOM_CORE;

  function weekBounds(){
    const d=new Date(),day=(d.getDay()+6)%7;
    const monday=new Date(d.getFullYear(),d.getMonth(),d.getDate()-day);
    const sunday=new Date(monday.getFullYear(),monday.getMonth(),monday.getDate()+6);
    return {from:inputDate(monday),to:inputDate(sunday)};
  }
  function defaultState(){const w=weekBounds();return {from:w.from,to:w.to,done:'',plan:'',updatedAt:''}}
  function loadState(){return {...defaultState(),...read(KEY,{})}}
  function saveState(){state.updatedAt=new Date().toISOString();localStorage.setItem(KEY,JSON.stringify(state));savedLabel()}
  function queueSave(){clearTimeout(saveTimer);saveTimer=setTimeout(saveState,350)}
  function periodTs(){return {from:new Date(`${state.from}T00:00:00`).getTime(),to:new Date(`${state.to}T23:59:59.999`).getTime()}}

  function activeBlockers(){return read('atom-blockers',[]).filter(x=>!['Решен','Закрыт'].includes(x.status))}
  function ganttStates(){try{return window.ATOM_GANTT?.getAllStates?.()||[]}catch{return[]}}
  function teamsList(){
    const c=core();if(!c)return[];
    return c.teams().map(team=>c.teamSummary(team)).sort((a,b)=>a.progress-b.progress||b.problem-a.problem);
  }
  function metrics(){
    const c=core();if(!c)return null;
    const stages=Array.from({length:12},(_,i)=>c.stageSummary(i+1));
    const requirements=c.requirements(),states=requirements.map(r=>c.getState(r.id));
    const sources=c.sourcesSummary(),dictionary=c.dictionarySummary(),owners=c.ownersSummary(),dod=c.dodEvaluation();
    const blockers=activeBlockers(),critical=blockers.filter(x=>x.severity==='Критическая').length;
    const teams=teamsList();
    const startRaw=localStorage.getItem('atom-project-started-at'),start=startRaw?Number(startRaw):null,finish=start?start+91*DAY:null;
    const left=finish?Math.max(0,Math.ceil((finish-Date.now())/DAY)):91;
    return {
      progress:c.projectProgress(),stages,stageDone:stages.filter(x=>x.progress>=100).length,stageWork:stages.filter(x=>x.progress>0&&x.progress<100&&!x.problem).length,stageProblem:stages.filter(x=>x.problem).length,
      requirements,reqDone:states.filter(x=>x.statusId==='done').length,reqAnswered:states.filter(x=>x.statusId==='answered').length,reqWork:states.filter(x=>!['not_requested','done','answered'].includes(x.statusId)).length,reqProblem:requirements.filter(r=>c.requirementProblem(r)).length,
      sources,dictionary,owners,dodDone:dod.filter(x=>x.ok).length,dodTotal:dod.length,blockers,critical,teams,teamAvg:teams.length?Math.round(teams.reduce((n,x)=>n+x.progress,0)/teams.length):0,start,finish,left
    };
  }

  function previousSnapshot(){
    const list=read(ARCHIVE_KEY,[]).filter(x=>x.snapshot&&x.to&&x.to<state.from).sort((a,b)=>String(b.to).localeCompare(String(a.to)));
    return list[0]?.snapshot||null;
  }
  function snapshot(m){
    return {savedAt:new Date().toISOString(),progress:m.progress,stageDone:m.stageDone,reqDone:m.reqDone,reqProblem:m.reqProblem,sourcesReady:m.sources.ready,dictionaryReady:m.dictionary.ready,dodDone:m.dodDone,blockers:m.blockers.length,teamAvg:m.teamAvg};
  }
  function delta(cur,prev,key,suffix=''){if(!prev||typeof prev[key]!=='number')return'';const d=cur-prev[key];return d===0?'без изменений':`${d>0?'+':''}${d}${suffix}`}

  function changesForPeriod(m){
    const c=core(),{from,to}=periodTs(),rows=[];
    m.requirements.forEach(r=>{
      const s=c.getState(r.id),ts=s.updatedAt?new Date(s.updatedAt).getTime():0;
      if(ts>=from&&ts<=to)rows.push({at:ts,type:'Требование',name:r.team,detail:`${r.text}: ${c.statusLabel(s.statusId)}`});
      if(r.custom&&r.createdAt){const created=new Date(r.createdAt).getTime();if(created>=from&&created<=to)rows.push({at:created,type:'Новое требование',name:r.team,detail:r.text});}
    });
    for(let id=1;id<=12;id++){
      const hist=read(`atom-gantt-reschedule-history-${id}`,[]);
      hist.forEach(x=>{const ts=new Date(x.changedAt||0).getTime();if(ts>=from&&ts<=to)rows.push({at:ts,type:'Срок Ганта',name:`${id}. ${c.stageName(id)}`,detail:`${fmt(x.oldDue)} → ${fmt(x.newDue)}${x.reason?`. ${x.reason}`:''}`})});
    }
    read('atom-blockers',[]).forEach(x=>{const ts=new Date(x.createdAt||0).getTime();if(ts>=from&&ts<=to)rows.push({at:ts,type:'Блокер',name:x.source||'Проект',detail:x.description||''})});
    return rows.sort((a,b)=>b.at-a.at).slice(0,30);
  }

  function buildAutoDone(m){
    const prev=previousSnapshot(),changes=changesForPeriod(m),lines=[];
    if(prev){
      const p=m.progress-prev.progress;if(p)lines.push(`Готовность проекта: ${prev.progress}% → ${m.progress}% (${p>0?'+':''}${p} п.п.).`);
      const r=m.reqDone-prev.reqDone;if(r)lines.push(`Закрыто требований «Что нужно»: ${r>0?'+':''}${r}, всего готово ${m.reqDone}/${m.requirements.length}.`);
      const s=m.sources.ready-prev.sourcesReady;if(s)lines.push(`Источники со статусом «Готово»: ${s>0?'+':''}${s}, сейчас ${m.sources.ready}/${m.sources.total}.`);
      const d=m.dictionary.ready-prev.dictionaryReady;if(d)lines.push(`Data Dictionary: ${d>0?'+':''}${d} готовых полей, сейчас ${m.dictionary.ready}/${m.dictionary.total}.`);
      const dod=m.dodDone-prev.dodDone;if(dod)lines.push(`Definition of Done: ${dod>0?'+':''}${dod}, выполнено ${m.dodDone}/${m.dodTotal}.`);
    }
    const completed=changes.filter(x=>x.type==='Требование'&&/(Готово|Ответ получен)$/.test(x.detail)).slice(0,7);
    completed.forEach(x=>lines.push(`${x.name}: ${x.detail}.`));
    const gantt=changes.filter(x=>x.type==='Срок Ганта').slice(0,4);gantt.forEach(x=>lines.push(`Изменен срок ${x.name}: ${x.detail}.`));
    if(!lines.length&&changes.length)changes.slice(0,7).forEach(x=>lines.push(`${x.type}: ${x.name}. ${x.detail}.`));
    if(!lines.length)lines.push('За отчетный период подтвержденных изменений в данных проекта пока нет.');
    return lines.map((x,i)=>`${i+1}. ${x}`).join('\n');
  }

  function buildAutoPlan(m){
    const c=core(),now=Date.now(),next=now+7*DAY,items=[];
    m.blockers.slice(0,5).forEach(b=>items.push(`Снять блокер: ${b.description||b.source}${b.owner&&b.owner!=='Не назначен'?` (${b.owner})`:''}.`));
    const req=m.requirements.map(r=>({r,s:c.getState(r.id),p:c.periodForRequirement(r)})).filter(x=>!['done','answered'].includes(x.s.statusId)&&new Date(`${x.p.startDate}T00:00:00`).getTime()<=next&&new Date(`${x.p.endDate}T23:59:59`).getTime()>=now).sort((a,b)=>String(a.p.endDate).localeCompare(String(b.p.endDate)));
    req.slice(0,10).forEach(x=>items.push(`${x.r.team}: ${x.r.text}. Срок по Ганту ${fmt(x.p.endDate)}${c.personName(x.s.respondentId)?`, ответственный ${c.personName(x.s.respondentId)}`:''}.`));
    if(!items.length){const stages=ganttStates().filter(x=>x.status!=='Завершено'&&new Date(x.startDate).getTime()<=next&&new Date(x.due).getTime()>=now);stages.slice(0,8).forEach(x=>items.push(`${x.name}: довести до следующего контрольного результата, срок ${fmt(inputDate(x.due))}.`));}
    if(!items.length)items.push('Проверить актуальные требования команд и зафиксировать результаты следующей контрольной недели.');
    return items.map((x,i)=>`${i+1}. ${x}`).join('\n');
  }

  function styles(){
    if(document.getElementById('weekly-report-v2-css'))return;
    const s=document.createElement('style');s.id='weekly-report-v2-css';s.textContent=`
      .wr-page{display:grid;gap:12px;max-width:1450px}.wr-toolbar{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap}.wr-tools,.wr-period{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.wr-period label,.wr-saved{font-size:10px;color:var(--muted)}.wr-period input{padding:7px 8px;border:1px solid var(--line);border-radius:7px;background:#fff;font:inherit;font-size:11px}.wr-report{background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden;box-shadow:0 4px 16px rgba(20,45,46,.05)}.wr-head{background:#102526;color:#fff;border-bottom:4px solid var(--accent);padding:18px 20px}.wr-head-top{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.wr-brand{font-size:10px;letter-spacing:1px;color:var(--accent);font-weight:700}.wr-head h2{font-size:23px;margin:4px 0}.wr-sub{font-size:11px;color:#b9cccc}.wr-date{text-align:right;font-size:13px;font-weight:700;white-space:nowrap}.wr-date small{display:block;color:#91aaaa;font-size:9px;font-weight:400;margin-bottom:3px}.wr-kpis{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:7px;margin-top:14px}.wr-kpi{border:1px solid #355657;background:#18393a;border-radius:9px;padding:8px;min-width:0}.wr-kpi.primary{background:#0f6962;border-color:#288e86}.wr-kpi span{display:block;color:#9fbaba;font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.wr-kpi b{display:block;font-size:18px;margin-top:3px}.wr-kpi small{font-size:8px;color:#92aaaa}.wr-body{padding:16px 18px;display:grid;gap:14px}.wr-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.wr-card{border:1px solid var(--line);border-radius:10px;overflow:hidden;min-width:0}.wr-card-head{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:9px 11px;background:#f2f6f6;border-bottom:1px solid var(--line)}.wr-card-head h3{margin:0;font-size:13px}.wr-card-head small{color:var(--muted);font-size:9px}.wr-card-body{padding:10px}.wr-text{width:100%;min-height:185px;box-sizing:border-box;border:0;outline:0;resize:vertical;background:#fff;font:inherit;font-size:12px;line-height:1.55;color:var(--text)}.wr-table-wrap{overflow:auto}.wr-table{width:100%;border-collapse:collapse;min-width:760px}.wr-table th,.wr-table td{padding:7px 8px;text-align:left;border-bottom:1px solid #e7eded;font-size:9px;vertical-align:top}.wr-table th{background:#f7f9f9;color:#53696a}.wr-table tr:last-child td{border-bottom:0}.wr-progress{height:4px;background:#e4ecec;border-radius:99px;overflow:hidden;margin-top:4px}.wr-progress i{display:block;height:100%;background:var(--accent-dark)}.wr-bad{color:#a53636;font-weight:700}.wr-ok{color:#227457;font-weight:700}.wr-changes{display:grid;gap:5px}.wr-change{display:grid;grid-template-columns:72px 120px 150px 1fr;gap:8px;padding:6px 0;border-bottom:1px solid #edf1f1;font-size:9px}.wr-change:last-child{border-bottom:0}.wr-change time{color:var(--muted)}.wr-empty{font-size:10px;color:var(--muted);padding:5px}.wr-archive{background:#fff;border:1px solid var(--line);border-radius:10px;padding:9px 11px}.wr-archive summary{cursor:pointer;font-size:11px;font-weight:700}.wr-archive-row{display:grid;grid-template-columns:160px 80px 1fr auto;gap:8px;align-items:center;padding:7px 0;border-bottom:1px solid var(--line);font-size:10px}.wr-archive-row:last-child{border-bottom:0}
      @media(max-width:1100px){.wr-kpis{grid-template-columns:repeat(4,1fr)}}@media(max-width:800px){.wr-grid2{grid-template-columns:1fr}.wr-kpis{grid-template-columns:repeat(2,1fr)}.wr-change{grid-template-columns:70px 100px 1fr}.wr-change>span:nth-child(3){display:none}}
      @media print{@page{size:A4 landscape;margin:8mm}.topbar,.sidebar,footer,.wr-toolbar,.wr-archive{display:none!important}.layout{display:block!important}.content{padding:0!important;max-width:none!important}.wr-page{max-width:none}.wr-report{border:0;box-shadow:none}.wr-head{padding:10mm}.wr-body{padding:7mm}.wr-text{min-height:115px;font-size:9pt}.wr-card{break-inside:avoid}.wr-table th,.wr-table td{font-size:7.5pt}.wr-change{font-size:7.5pt}}
    `;document.head.appendChild(s);
  }

  function kpi(label,value,sub,primary=false){return `<div class="wr-kpi ${primary?'primary':''}"><span>${esc(label)}</span><b>${esc(value)}</b><small>${esc(sub||'')}</small></div>`}
  function teamTable(m){return `<div class="wr-table-wrap"><table class="wr-table"><thead><tr><th>Команда</th><th>Готовность</th><th>Готово</th><th>В работе</th><th>Проблемы</th><th>Владелец</th></tr></thead><tbody>${m.teams.map(t=>`<tr><td><b>${esc(t.team)}</b></td><td>${t.progress}%<div class="wr-progress"><i style="width:${t.progress}%"></i></div></td><td>${t.done}/${t.total}</td><td>${t.work}</td><td class="${t.problem?'wr-bad':''}">${t.problem}</td><td>${esc(t.owner)}</td></tr>`).join('')}</tbody></table></div>`}
  function stageTable(m){
    const gs=new Map(ganttStates().map(x=>[Number(x.id),x]));
    return `<div class="wr-table-wrap"><table class="wr-table"><thead><tr><th>#</th><th>Этап</th><th>Готовность</th><th>Статус</th><th>Период</th></tr></thead><tbody>${m.stages.map(s=>{const g=gs.get(Number(s.id));return `<tr><td>${s.id}</td><td><b>${esc(s.name)}</b></td><td>${s.progress}%<div class="wr-progress"><i style="width:${s.progress}%"></i></div></td><td class="${s.problem?'wr-bad':s.progress>=100?'wr-ok':''}">${esc(s.status)}</td><td>${g?`${fmt(inputDate(g.startDate))} - ${fmt(inputDate(g.due))}`:'-'}</td></tr>`}).join('')}</tbody></table></div>`;
  }
  function blockerTable(m){return m.blockers.length?`<div class="wr-table-wrap"><table class="wr-table"><thead><tr><th>Источник</th><th>Проблема</th><th>Критичность</th><th>Ответственный</th><th>Срок</th><th>Статус</th></tr></thead><tbody>${m.blockers.map(b=>`<tr><td>${esc(b.source)}</td><td>${esc(b.description)}</td><td class="${['Высокая','Критическая'].includes(b.severity)?'wr-bad':''}">${esc(b.severity)}</td><td>${esc(b.owner||'Не назначен')}</td><td>${esc(b.due||'-')}</td><td>${esc(b.status)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="wr-empty">Активных блокеров нет.</div>'}
  function changesBlock(m){const rows=changesForPeriod(m);return rows.length?`<div class="wr-changes">${rows.map(x=>`<div class="wr-change"><time>${dt(x.at)}</time><b>${esc(x.type)}</b><span>${esc(x.name)}</span><span>${esc(x.detail)}</span></div>`).join('')}</div>`:'<div class="wr-empty">За выбранный период зафиксированных изменений нет.</div>'}

  function render(){
    styles();document.querySelector('.content')?.classList.remove('gantt-content-focus');
    const m=metrics();if(!m){app.innerHTML='<div class="callout">Загрузка Logic Core...</div>';setTimeout(render,300);return;}
    const prev=previousSnapshot();
    app.innerHTML=`<div class="wr-page">
      <div class="wr-toolbar"><div class="wr-period"><label>Отчетный период</label><input id="weekly-from" type="date" value="${esc(state.from)}"><span>по</span><input id="weekly-to" type="date" value="${esc(state.to)}"><span id="weekly-save-state" class="wr-saved"></span></div><div class="wr-tools"><button class="btn" id="weekly-auto">Сформировать из проекта</button><button class="btn" id="weekly-refresh">Обновить данные</button><button class="btn" id="weekly-save-week">Сохранить неделю</button><button class="btn primary" id="weekly-download">Скачать PDF</button><button class="btn" id="weekly-print">Печать / PDF</button></div></div>
      <section class="wr-report" id="weekly-report-sheet">
        <header class="wr-head"><div class="wr-head-top"><div><div class="wr-brand">АТОМ · COMMERCIAL ANALYTICS</div><h2>Еженедельный отчет по проекту</h2><div class="wr-sub">Управление внедрением коммерческой аналитики АТОМ</div></div><div class="wr-date"><small>Отчетный период</small>${fmt(state.from)} - ${fmt(state.to)}</div></div><div class="wr-kpis">
          ${kpi('Готовность проекта',`${m.progress}%`,prev?`к прошлому: ${delta(m.progress,prev,'progress',' п.п.')}`:'Logic Core',true)}
          ${kpi('Этапы',`${m.stageDone}/12`,`в работе ${m.stageWork} · проблем ${m.stageProblem}`)}
          ${kpi('Требования',`${m.reqDone}/${m.requirements.length}`,`ответ получен ${m.reqAnswered} · проблем ${m.reqProblem}`)}
          ${kpi('Команды',`${m.teamAvg}%`,`средняя готовность`)}
          ${kpi('Источники',`${m.sources.ready}/${m.sources.total}`,`определено ${m.sources.identified}`)}
          ${kpi('Data Dictionary',`${m.dictionary.ready}/${m.dictionary.total}`,`готовых полей`)}
          ${kpi('Definition of Done',`${m.dodDone}/${m.dodTotal}`,`условий выполнено`)}
          ${kpi('Блокеры',String(m.blockers.length),`критических ${m.critical} · осталось ${m.left} дн.`)}
        </div></header>
        <div class="wr-body">
          <div class="wr-grid2"><section class="wr-card"><div class="wr-card-head"><h3>Что изменилось / сделали за неделю</h3><small>редактируемый управленческий итог</small></div><div class="wr-card-body"><textarea id="weekly-done" class="wr-text" placeholder="Нажми «Сформировать из проекта» или дополни вручную">${esc(state.done)}</textarea></div></section><section class="wr-card"><div class="wr-card-head"><h3>План на следующую неделю</h3><small>результаты, сроки, зависимости</small></div><div class="wr-card-body"><textarea id="weekly-plan" class="wr-text" placeholder="Нажми «Сформировать из проекта» или дополни вручную">${esc(state.plan)}</textarea></div></section></div>
          <section class="wr-card"><div class="wr-card-head"><h3>Изменения данных за отчетный период</h3><small>требования, сроки Ганта, новые блокеры</small></div><div class="wr-card-body">${changesBlock(m)}</div></section>
          <div class="wr-grid2"><section class="wr-card"><div class="wr-card-head"><h3>Готовность по командам</h3><small>${m.owners.ready}/${m.owners.total} владельцев назначено</small></div><div class="wr-card-body">${teamTable(m)}</div></section><section class="wr-card"><div class="wr-card-head"><h3>Этапы проекта</h3><small>единая логика с основным Гантом</small></div><div class="wr-card-body">${stageTable(m)}</div></section></div>
          <section class="wr-card"><div class="wr-card-head"><h3>Активные блокеры</h3><small>${m.blockers.length} активных · ${m.critical} критических</small></div><div class="wr-card-body">${blockerTable(m)}</div></section>
        </div>
      </section>
      <details class="wr-archive" id="weekly-archive"><summary>Архив еженедельных отчетов</summary><div id="weekly-archive-body"></div></details>
    </div>`;
    savedLabel();renderArchive();
  }

  function savedLabel(){const el=document.getElementById('weekly-save-state');if(!el)return;if(!state.updatedAt){el.textContent='';return;}el.textContent=`Сохранено ${dt(state.updatedAt)}`}
  function renderArchive(){
    const host=document.getElementById('weekly-archive-body');if(!host)return;const list=read(ARCHIVE_KEY,[]);
    host.innerHTML=list.length?list.map(x=>`<div class="wr-archive-row"><b>${fmt(x.from)} - ${fmt(x.to)}</b><span>${x.snapshot?`${x.snapshot.progress}%`:x.metrics?`${x.metrics.progress}%`:'-'}</span><span>${esc((x.done||'').split('\n')[0]||'Без комментария')}</span><button class="btn weekly-archive-open" data-id="${esc(x.id)}">Открыть</button></div>`).join(''):'<div class="wr-empty">Сохраненных недель пока нет.</div>';
  }
  function saveWeek(){
    saveState();const m=metrics(),entry={id:`${state.from}_${state.to}`,from:state.from,to:state.to,done:state.done,plan:state.plan,savedAt:new Date().toISOString(),snapshot:snapshot(m)};
    const list=read(ARCHIVE_KEY,[]),i=list.findIndex(x=>x.id===entry.id);if(i>=0)list[i]=entry;else list.unshift(entry);localStorage.setItem(ARCHIVE_KEY,JSON.stringify(list.slice(0,104)));renderArchive();document.getElementById('weekly-archive')?.setAttribute('open','');
  }

  function loadPdf(){if(window.html2pdf)return Promise.resolve(window.html2pdf);if(pdfLoading)return pdfLoading;pdfLoading=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=PDF_LIB;s.onload=()=>window.html2pdf?resolve(window.html2pdf):reject(new Error('PDF библиотека не загрузилась'));s.onerror=()=>reject(new Error('Не удалось загрузить PDF библиотеку'));document.head.appendChild(s)});return pdfLoading}
  function pdfClone(){
    const src=document.getElementById('weekly-report-sheet');if(!src)throw new Error('Отчет не найден');const clone=src.cloneNode(true);clone.style.width='1120px';clone.style.maxWidth='1120px';clone.style.border='0';clone.style.boxShadow='none';
    [['weekly-done',state.done],['weekly-plan',state.plan]].forEach(([id,text])=>{const ta=clone.querySelector(`#${id}`);if(!ta)return;const d=document.createElement('div');d.style.whiteSpace='pre-wrap';d.style.fontSize='12px';d.style.lineHeight='1.55';d.style.minHeight='160px';d.textContent=text||'';ta.replaceWith(d)});return clone;
  }
  async function downloadPdf(){
    try{saveState();const lib=await loadPdf(),clone=pdfClone(),host=document.createElement('div');host.style.position='fixed';host.style.left='-20000px';host.style.top='0';host.appendChild(clone);document.body.appendChild(host);const filename=`ATOM_weekly_${state.from}_${state.to}.pdf`;await lib().set({margin:[6,6,6,6],filename,image:{type:'jpeg',quality:.96},html2canvas:{scale:1.6,useCORS:true},jsPDF:{unit:'mm',format:'a4',orientation:'landscape'},pagebreak:{mode:['css','legacy'],avoid:['.wr-card']}}).from(clone).save();host.remove()}catch(e){alert(`Не удалось сформировать PDF: ${e.message||e}`)}
  }

  function button(){
    const sb=document.querySelector('.sidebar');if(!sb||document.getElementById('weekly-report-nav'))return;const b=document.createElement('button');b.id='weekly-report-nav';b.type='button';b.className='nav';b.textContent='Еженедельный отчет';b.addEventListener('click',()=>{document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));b.classList.add('active');history.replaceState(null,'','#weekly');state=loadState();render()});sb.appendChild(b);
  }

  document.addEventListener('input',e=>{if(e.target.id==='weekly-done'){state.done=e.target.value;queueSave()}if(e.target.id==='weekly-plan'){state.plan=e.target.value;queueSave()}});
  document.addEventListener('change',e=>{if(e.target.id==='weekly-from'||e.target.id==='weekly-to'){state[e.target.id==='weekly-from'?'from':'to']=e.target.value;saveState();render()}});
  document.addEventListener('click',e=>{
    if(e.target.closest('#weekly-auto')){const m=metrics();state.done=buildAutoDone(m);state.plan=buildAutoPlan(m);saveState();render();return;}
    if(e.target.closest('#weekly-refresh')){saveState();render();return;}
    if(e.target.closest('#weekly-save-week')){saveWeek();return;}
    if(e.target.closest('#weekly-download')){downloadPdf();return;}
    if(e.target.closest('#weekly-print')){saveState();window.print();return;}
    const open=e.target.closest('.weekly-archive-open');if(open){const x=read(ARCHIVE_KEY,[]).find(v=>v.id===open.dataset.id);if(!x)return;state={...state,from:x.from,to:x.to,done:x.done||'',plan:x.plan||'',updatedAt:x.savedAt||state.updatedAt};saveState();render();return;}
  });
  window.addEventListener('atom-sync-update',()=>{if(location.hash==='#weekly'){state=loadState();render()}});
  window.addEventListener('hashchange',()=>{if(location.hash==='#weekly'){document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));document.getElementById('weekly-report-nav')?.classList.add('active');state=loadState();render()}});

  styles();button();if(location.hash==='#weekly')setTimeout(render,300);window.ATOM_WEEKLY_REPORT={open:render,metrics,saveWeek};
})();