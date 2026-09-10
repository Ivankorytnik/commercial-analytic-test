(function(){
  const KEY='atom-weekly-report-v1';
  const DAY=86400000;
  const PDF_LIB='https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.2/dist/html2pdf.bundle.min.js';
  let saveTimer=null;
  let directoryHandle=null;
  let pdfLoading=null;

  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
  function pad(n){return String(n).padStart(2,'0');}
  function inputDate(ts){const d=new Date(ts);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;}
  function compactDate(ts=Date.now()){const d=new Date(ts);return `${pad(d.getDate())}${pad(d.getMonth()+1)}${d.getFullYear()}`;}
  function counterKey(ts=Date.now()){return `atom-weekly-report-download-counter-${compactDate(ts)}`;}
  function nextNumber(increment=false){const key=counterKey();const current=Number(localStorage.getItem(key)||'0');const next=current+1;if(increment)localStorage.setItem(key,String(next));return next;}
  function reportFilename(number=nextNumber(false)){return `skvanait-${pad(number)}-${compactDate()}.pdf`;}
  function formatDateInput(v){if(!v)return 'Не задано';const p=v.split('-').map(Number);if(p.length!==3)return v;return `${pad(p[2])}.${pad(p[1])}.${p[0]}`;}
  function weekBounds(){const d=new Date(),day=(d.getDay()+6)%7;const monday=new Date(d.getFullYear(),d.getMonth(),d.getDate()-day);const sunday=new Date(monday.getFullYear(),monday.getMonth(),monday.getDate()+6);return {from:inputDate(monday.getTime()),to:inputDate(sunday.getTime())};}
  function defaultState(){const w=weekBounds();return {from:w.from,to:w.to,done:'',plan:'',updatedAt:''};}
  function load(){try{return {...defaultState(),...(JSON.parse(localStorage.getItem(KEY)||'{}')||{})};}catch{return defaultState();}}
  let state=load();

  function save(){state.updatedAt=new Date().toISOString();localStorage.setItem(KEY,JSON.stringify(state));updateSavedLabel();}
  function queueSave(){clearTimeout(saveTimer);saveTimer=setTimeout(save,450);}
  function updateSavedLabel(){const el=document.getElementById('weekly-save-state');if(!el)return;if(!state.updatedAt){el.textContent='Шаблон еще не заполнен';return;}const d=new Date(state.updatedAt);el.textContent=`Сохранено ${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;}
  function updateDownloadInfo(){const folder=document.getElementById('weekly-folder-state'),name=document.getElementById('weekly-file-name');if(folder)folder.textContent=directoryHandle?`Папка: ${directoryHandle.name}`:'Папка не выбрана';if(name)name.textContent=`Файл: ${reportFilename()}`;}

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
      .weekly-page-wrap{max-width:1180px;margin:0 auto}.weekly-toolbar{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:0 0 12px}.weekly-toolbar-left,.weekly-toolbar-right{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.weekly-toolbar-right{justify-content:flex-end}.weekly-toolbar label{font-size:11px;color:var(--muted)}.weekly-toolbar input[type=date]{padding:7px 8px;border:1px solid var(--line);border-radius:7px;background:#fff;font:inherit;font-size:11px}.weekly-save-state{font-size:11px;color:var(--muted)}.weekly-download-meta{display:flex;flex-direction:column;align-items:flex-end;gap:2px;width:100%;font-size:10px;color:var(--muted)}.weekly-download-meta span{white-space:nowrap}
      .weekly-sheet{width:100%;aspect-ratio:1.414/1;min-height:690px;background:#fff;border:1px solid #d5dfdf;border-radius:14px;overflow:hidden;box-shadow:0 5px 18px rgba(20,45,46,.07);display:flex;flex-direction:column}
      .weekly-summary{flex:0 0 33.333%;padding:22px 24px 18px;background:linear-gradient(180deg,#102526 0,#153435 100%);color:#fff;display:flex;flex-direction:column;justify-content:space-between;gap:14px;border-bottom:4px solid var(--accent)}
      .weekly-summary-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.weekly-brand{font-size:11px;letter-spacing:1.2px;color:var(--accent);font-weight:700}.weekly-title{margin:5px 0 3px;font-size:25px;line-height:1.1}.weekly-subtitle{font-size:11px;color:#b9cccc}.weekly-period-box{text-align:right;min-width:210px}.weekly-period-label{font-size:9px;color:#92aaaa;text-transform:uppercase;letter-spacing:.7px}.weekly-period-value{font-size:14px;font-weight:700;margin-top:4px}.weekly-kpis{display:grid;grid-template-columns:1.35fr repeat(4,1fr);gap:9px}.weekly-kpi{border:1px solid #365657;border-radius:10px;background:#18393a;padding:10px 11px;min-width:0}.weekly-kpi.primary{background:#0f6962;border-color:#288e86}.weekly-kpi-label{font-size:9px;color:#a9c0c0;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.weekly-kpi-value{font-size:20px;font-weight:700;line-height:1}.weekly-kpi-sub{font-size:8px;color:#9db4b4;margin-top:4px}.weekly-summary-progress{height:5px;background:#274849;border-radius:99px;overflow:hidden;margin-top:7px}.weekly-summary-progress span{display:block;height:100%;background:var(--accent);border-radius:99px}
      .weekly-bottom{flex:1;display:grid;grid-template-columns:1fr 1fr;min-height:0}.weekly-half{padding:22px 24px;display:flex;flex-direction:column;min-width:0}.weekly-half:first-child{border-right:1px solid var(--line)}.weekly-half-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;padding-bottom:10px;border-bottom:2px solid #e6eeee}.weekly-half-title{margin:0;font-size:18px}.weekly-half-number{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#e8fbf8;color:#0f6962;font-weight:700;font-size:12px}.weekly-textarea{flex:1;width:100%;resize:none;border:0;outline:0;padding:0;background:transparent;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:var(--text);min-height:260px}.weekly-textarea::placeholder{color:#9babab}.weekly-half-foot{padding-top:9px;border-top:1px solid #eef2f2;font-size:9px;color:#89999a}.weekly-pdf-text{flex:1;width:100%;white-space:pre-wrap;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#102526;min-height:260px}
      @media(max-width:900px){.weekly-sheet{aspect-ratio:auto;min-height:850px}.weekly-kpis{grid-template-columns:repeat(3,1fr)}.weekly-bottom{grid-template-columns:1fr}.weekly-half:first-child{border-right:0;border-bottom:1px solid var(--line)}.weekly-download-meta{align-items:flex-start}}
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
        <div class="weekly-toolbar-right"><button id="weekly-folder" class="btn">Выбрать папку</button><button id="weekly-download" class="btn primary">Скачать отчет</button><button id="weekly-clear" class="btn">Очистить текст</button><button id="weekly-print" class="btn">Печать / PDF</button><div class="weekly-download-meta"><span id="weekly-folder-state"></span><span id="weekly-file-name"></span></div></div>
      </div>
      <section class="weekly-sheet" id="weekly-report-sheet">
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
    updateDownloadInfo();
    bind();
  }

  function loadPdfLibrary(){
    if(window.html2pdf)return Promise.resolve(window.html2pdf);
    if(pdfLoading)return pdfLoading;
    pdfLoading=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=PDF_LIB;s.onload=()=>window.html2pdf?resolve(window.html2pdf):reject(new Error('PDF библиотека не загрузилась'));s.onerror=()=>reject(new Error('Не удалось загрузить PDF библиотеку'));document.head.appendChild(s);});
    return pdfLoading;
  }

  function pdfClone(){
    const source=document.getElementById('weekly-report-sheet');
    if(!source)throw new Error('Отчет не найден');
    const clone=source.cloneNode(true);
    clone.style.width='1122px';clone.style.height='794px';clone.style.minHeight='794px';clone.style.aspectRatio='auto';clone.style.border='0';clone.style.borderRadius='0';clone.style.boxShadow='none';
    const replacements=[['weekly-done',state.done],['weekly-plan',state.plan]];
    replacements.forEach(([id,text])=>{const ta=clone.querySelector(`#${id}`);if(!ta)return;const div=document.createElement('div');div.className='weekly-pdf-text';div.textContent=text||'';ta.replaceWith(div);});
    return clone;
  }

  async function createPdfBlob(){
    const html2pdf=await loadPdfLibrary();
    const clone=pdfClone();
    const host=document.createElement('div');host.style.position='fixed';host.style.left='-20000px';host.style.top='0';host.style.width='1122px';host.appendChild(clone);document.body.appendChild(host);
    try{
      const worker=html2pdf().set({margin:0,filename:'report.pdf',image:{type:'jpeg',quality:.98},html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff'},jsPDF:{unit:'mm',format:'a4',orientation:'landscape'},pagebreak:{mode:['avoid-all']}}).from(clone);
      return await worker.outputPdf('blob');
    }finally{host.remove();}
  }

  async function chooseFolder(){
    if(!window.showDirectoryPicker){alert('В этом браузере нельзя выбрать папку напрямую. При скачивании будет использована стандартная папка загрузок браузера.');return false;}
    try{directoryHandle=await window.showDirectoryPicker({mode:'readwrite'});updateDownloadInfo();return true;}catch(e){if(e?.name!=='AbortError')alert('Не удалось выбрать папку');return false;}
  }

  async function saveBlob(blob,filename){
    if(directoryHandle){
      try{const fileHandle=await directoryHandle.getFileHandle(filename,{create:true});const writable=await fileHandle.createWritable();await writable.write(blob);await writable.close();return 'folder';}catch(e){directoryHandle=null;updateDownloadInfo();}
    }
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);return 'download';
  }

  async function downloadReport(){
    const btn=document.getElementById('weekly-download');
    if(btn){btn.disabled=true;btn.textContent='Формирую PDF...';}
    try{
      save();
      if(window.showDirectoryPicker&&!directoryHandle){const ok=await chooseFolder();if(!ok)return;}
      const number=nextNumber(false),filename=reportFilename(number),blob=await createPdfBlob();
      await saveBlob(blob,filename);
      nextNumber(true);
      updateDownloadInfo();
      alert(`Отчет сохранен: ${filename}`);
    }catch(e){console.error(e);alert('Не удалось скачать PDF. Можно использовать кнопку «Печать / PDF».');}
    finally{if(btn){btn.disabled=false;btn.textContent='Скачать отчет';}}
  }

  function bind(){
    const from=document.getElementById('weekly-from'),to=document.getElementById('weekly-to'),done=document.getElementById('weekly-done'),plan=document.getElementById('weekly-plan');
    from?.addEventListener('change',()=>{state.from=from.value;save();document.getElementById('weekly-period-value').textContent=`${formatDateInput(state.from)} - ${formatDateInput(state.to)}`;});
    to?.addEventListener('change',()=>{state.to=to.value;save();document.getElementById('weekly-period-value').textContent=`${formatDateInput(state.from)} - ${formatDateInput(state.to)}`;});
    done?.addEventListener('input',()=>{state.done=done.value;queueSave();});
    plan?.addEventListener('input',()=>{state.plan=plan.value;queueSave();});
    document.getElementById('weekly-folder')?.addEventListener('click',chooseFolder);
    document.getElementById('weekly-download')?.addEventListener('click',downloadReport);
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