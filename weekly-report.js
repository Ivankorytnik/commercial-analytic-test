(function(){
  const KEY='atom-weekly-report-v1';
  const DAY=86400000;
  let saveTimer=null;

  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
  function pad(n){return String(n).padStart(2,'0');}
  function inputDate(ts){const d=new Date(ts);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;}
  function formatDateInput(v){if(!v)return 'Не задано';const p=v.split('-').map(Number);if(p.length!==3)return v;return `${pad(p[2])}.${pad(p[1])}.${p[0]}`;}
  function weekBounds(){const d=new Date(),day=(d.getDay()+6)%7;const monday=new Date(d.getFullYear(),d.getMonth(),d.getDate()-day);const sunday=new Date(monday.getFullYear(),monday.getMonth(),monday.getDate()+6);return {from:inputDate(monday.getTime()),to:inputDate(sunday.getTime())};}
  function defaultState(){const w=weekBounds();return {from:w.from,to:w.to,done:'',plan:'',updatedAt:''};}
  function load(){try{return {...defaultState(),...(JSON.parse(localStorage.getItem(KEY)||'{}')||{})};}catch{return defaultState();}}
  let state=load();

  function save(){state.updatedAt=new Date().toISOString();localStorage.setItem(KEY,JSON.stringify(state));updateSavedLabel();}
  function queueSave(){clearTimeout(saveTimer);saveTimer=setTimeout(save,450);}
  function updateSavedLabel(){const el=document.getElementById('weekly-save-state');if(!el)return;if(!state.updatedAt){el.textContent='Шаблон еще не заполнен';return;}const d=new Date(state.updatedAt);el.textContent=`Сохранено ${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;}

  function projectMetrics(){
    let progress=0;
    try{if(typeof getProjectProgress==='function')progress=getProjectProgress();}catch{}
    let states=[];
    try{states=window.ATOM_GANTT?.getAllStates?.()||[];}catch{}
    const completed=states.filter(x=>x.percent>=100||x.status==='Завершено').length;
    const inWork=states.filter(x=>x.percent>0&&x.percent<100&&!x.overdue&&x.status!=='Блокер').length;
    const problem=states.filter(x=>x.overdue||x.status==='Блокер').length;
    let blockers=0;
    try{if(typeof activeBlockers==='function')blockers=activeBlockers().length;else blockers=JSON.parse(localStorage.getItem('atom-blockers')||'[]').filter(x=>!['Решен','Закрыт'].includes(x.status)).length;}catch{}
    const startRaw=localStorage.getItem('atom-project-started-at');
    const start=startRaw?Number(startRaw):null;
    const finish=start?start+91*DAY:null;
    const left=finish?Math.max(0,Math.ceil((finish-Date.now())/DAY)):null;
    return {progress,completed,inWork,problem,blockers,start,finish,left,total:states.length||12};
  }

  function styles(){
    if(document.getElementById('weekly-report-styles'))return;
    const s=document.createElement('style');s.id='weekly-report-styles';s.textContent=`
      .weekly-page-wrap{max-width:1180px;margin:0 auto}.weekly-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:0 0 12px}.weekly-toolbar-left,.weekly-toolbar-right{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.weekly-toolbar label{font-size:11px;color:var(--muted)}.weekly-toolbar input[type=date]{padding:7px 8px;border:1px solid var(--line);border-radius:7px;background:#fff;font:inherit;font-size:11px}.weekly-save-state{font-size:11px;color:var(--muted)}
      .weekly-sheet{width:100%;aspect-ratio:1.414/1;min-height:690px;background:#fff;border:1px solid #d5dfdf;border-radius:14px;overflow:hidden;box-shadow:0 5px 18px rgba(20,45,46,.07);display:flex;flex-direction:column}
      .weekly-summary{flex:0 0 33.333%;padding:22px 24px 18px;background:linear-gradient(180deg,#102526 0,#153435 100%);color:#fff;display:flex;flex-direction:column;justify-content:space-between;gap:14px;border-bottom:4px solid var(--accent)}
      .weekly-summary-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.weekly-brand{font-size:11px;letter-spacing:1.2px;color:var(--accent);font-weight:700}.weekly-title{margin:5px 0 3px;font-size:25px;line-height:1.1}.weekly-subtitle{font-size:11px;color:#b9cccc}.weekly-period-box{text-align:right;min-width:210px}.weekly-period-label{font-size:9px;color:#92aaaa;text-transform:uppercase;letter-spacing:.7px}.weekly-period-value{font-size:14px;font-weight:700;margin-top:4px}.weekly-kpis{display:grid;grid-template-columns:1.35fr repeat(4,1fr);gap:9px}.weekly-kpi{border:1px solid #365657;border-radius:10px;background:#18393a;padding:10px 11px;min-width:0}.weekly-kpi.primary{background:#0f6962;border-color:#288e86}.weekly-kpi-label{font-size:9px;color:#a9c0c0;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.weekly-kpi-value{font-size:20px;font-weight:700;line-height:1}.weekly-kpi-sub{font-size:8px;color:#9db4b4;margin-top:4px}.weekly-summary-progress{height:5px;background:#274849;border-radius:99px;overflow:hidden;margin-top:7px}.weekly-summary-progress span{display:block;height:100%;background:var(--accent);border-radius:99px}
      .weekly-bottom{flex:1;display:grid;grid-template-columns:1fr 1fr;min-height:0}.weekly-half{padding:22px 24px;display:flex;flex-direction:column;min-width:0}.weekly-half:first-child{border-right:1px solid var(--line)}.weekly-half-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;padding-bottom:10px;border-bottom:2px solid #e6eeee}.weekly-half-title{margin:0;font-size:18px}.weekly-half-number{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#e8fbf8;color:#0f6962;font-weight:700;font-size:12px}.weekly-textarea{flex:1;width:100%;resize:none;border:0;outline:0;padding:0;background:transparent;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:var(--text);min-height:260px}.weekly-textarea::placeholder{color:#9babab}.weekly-half-foot{padding-top:9px;border-top:1px solid #eef2f2;font-size:9px;color:#89999a}.weekly-empty-hint{font-size:10px;color:#92a2a3}
      @media(max-width:900px){.weekly-sheet{aspect-ratio:auto;min-height:850px}.weekly-kpis{grid-template-columns:repeat(3,1fr)}.weekly-bottom{grid-template-columns:1fr}.weekly-half:first-child{border-right:0;border-bottom:1px solid var(--line)}}
      @media print{@page{size:A4 landscape;margin:0}.topbar,.sidebar,footer,.weekly-toolbar{display:none!important}.layout{display:block!important}.content{padding:0!important;max-width:none!important}.weekly-page-wrap{max-width:none!important}.weekly-sheet{width:297mm;height:210mm;min-height:210mm;border:0;border-radius:0;box-shadow:none;aspect-ratio:auto}.weekly-summary{padding:14mm 14mm 8mm}.weekly-bottom{min-height:0}.weekly-half{padding:10mm 14mm}.weekly-textarea{font-size:11pt}.weekly-title{font-size:22pt}}
    `;document.head.appendChild(s);
  }

  function render(){
    styles();
    document.querySelector('.content')?.classList.remove('gantt-content-focus');
    const m=projectMetrics();
    const startText=m.start?new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'2-digit'}).format(new Date(m.start)):'Не запущен';
    const finishText=m.finish?new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'2-digit'}).format(new Date(m.finish)):'13 недель';
    app.innerHTML=`<div class="weekly-page-wrap">
      <div class="weekly-toolbar">
        <div class="weekly-toolbar-left"><label>Отчетная неделя</label><input id="weekly-from" type="date" value="${esc(state.from)}"><span>по</span><input id="weekly-to" type="date" value="${esc(state.to)}"><span id="weekly-save-state" class="weekly-save-state"></span></div>
        <div class="weekly-toolbar-right"><button id="weekly-clear" class="btn">Очистить текст</button><button id="weekly-print" class="btn primary">Печать / PDF</button></div>
      </div>
      <section class="weekly-sheet">
        <div class="weekly-summary">
          <div class="weekly-summary-head"><div><div class="weekly-brand">АТОМ · COMMERCIAL ANALYTICS</div><h2 class="weekly-title">Еженедельный отчет по проекту</h2><div class="weekly-subtitle">Контроль готовности проекта коммерческой аналитики</div></div><div class="weekly-period-box"><div class="weekly-period-label">Отчетный период</div><div id="weekly-period-value" class="weekly-period-value">${formatDateInput(state.from)} - ${formatDateInput(state.to)}</div></div></div>
          <div class="weekly-kpis">
            <div class="weekly-kpi primary"><div class="weekly-kpi-label">Готовность проекта</div><div class="weekly-kpi-value">${m.progress}%</div><div class="weekly-summary-progress"><span style="width:${Math.max(0,Math.min(100,m.progress))}%"></span></div><div class="weekly-kpi-sub">по статусам этапов</div></div>
            <div class="weekly-kpi"><div class="weekly-kpi-label">В работе</div><div class="weekly-kpi-value">${m.inWork}</div><div class="weekly-kpi-sub">из ${m.total} этапов</div></div>
            <div class="weekly-kpi"><div class="weekly-kpi-label">Завершено</div><div class="weekly-kpi-value">${m.completed}</div><div class="weekly-kpi-sub">этапов проекта</div></div>
            <div class="weekly-kpi"><div class="weekly-kpi-label">Блокеры</div><div class="weekly-kpi-value">${m.blockers}</div><div class="weekly-kpi-sub">активных</div></div>
            <div class="weekly-kpi"><div class="weekly-kpi-label">До завершения</div><div class="weekly-kpi-value">${m.left===null?'91':m.left}</div><div class="weekly-kpi-sub">дней · ${startText} → ${finishText}</div></div>
          </div>
        </div>
        <div class="weekly-bottom">
          <section class="weekly-half"><div class="weekly-half-head"><h3 class="weekly-half-title">Сделали за прошлую неделю</h3><span class="weekly-half-number">01</span></div><textarea id="weekly-done" class="weekly-textarea" placeholder="1. Что завершили\n2. Какой результат получили\n3. Какие договоренности зафиксировали\n4. Что сняли из блокеров">${esc(state.done)}</textarea><div class="weekly-half-foot">Коротко фиксируем фактический результат, а не процесс.</div></section>
          <section class="weekly-half"><div class="weekly-half-head"><h3 class="weekly-half-title">Планируем на следующую неделю</h3><span class="weekly-half-number">02</span></div><textarea id="weekly-plan" class="weekly-textarea" placeholder="1. Что должны завершить\n2. Какой результат ожидаем\n3. От кого нужны данные или решение\n4. Что может стать блокером">${esc(state.plan)}</textarea><div class="weekly-half-foot">Фиксируем конкретный результат, который должен быть получен к следующему отчету.</div></section>
        </div>
      </section>
    </div>`;
    updateSavedLabel();
    bind();
  }

  function bind(){
    const from=document.getElementById('weekly-from'),to=document.getElementById('weekly-to'),done=document.getElementById('weekly-done'),plan=document.getElementById('weekly-plan');
    from?.addEventListener('change',()=>{state.from=from.value;save();document.getElementById('weekly-period-value').textContent=`${formatDateInput(state.from)} - ${formatDateInput(state.to)}`;});
    to?.addEventListener('change',()=>{state.to=to.value;save();document.getElementById('weekly-period-value').textContent=`${formatDateInput(state.from)} - ${formatDateInput(state.to)}`;});
    done?.addEventListener('input',()=>{state.done=done.value;queueSave();});
    plan?.addEventListener('input',()=>{state.plan=plan.value;queueSave();});
    document.getElementById('weekly-print')?.addEventListener('click',()=>{save();window.print();});
    document.getElementById('weekly-clear')?.addEventListener('click',()=>{if(!confirm('Очистить оба текстовых блока отчета?'))return;state.done='';state.plan='';save();render();});
  }

  function button(){
    const sidebar=document.querySelector('.sidebar');
    if(!sidebar||document.getElementById('weekly-report-nav'))return;
    const b=document.createElement('button');
    b.id='weekly-report-nav';b.type='button';b.className='nav';b.textContent='Еженедельный отчет';
    b.addEventListener('click',()=>{document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));b.classList.add('active');state=load();render();});
    sidebar.appendChild(b);
  }

  window.addEventListener('atom-sync-update',()=>{state=load();});
  styles();button();
  window.ATOM_WEEKLY_REPORT={open:render};
})();