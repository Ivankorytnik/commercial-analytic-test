(function(){
  const STATE_KEY='atom-raci-requirement-state-v2';
  const CUSTOM_KEY='atom-raci-custom-requirements-v2';
  const DAY=86400000;
  const STATUS_PROGRESS={'Не запрошено':0,'Запрос подготовлен':10,'Запрос отправлен':25,'В работе':50,'Ответ получен':75,'Требует уточнения':60,'Блокер':50,'Готово':100};
  const STATUSES=['Не запрошено','Запрос подготовлен','Запрос отправлен','В работе','Ответ получен','Требует уточнения','Блокер','Готово'];
  const COLLAPSED=new Set();
  let teamFilter='all';
  let statusFilter='all';
  let searchTerm='';

  const REQUIREMENTS={
    'Коммерческий блок':'Утвердить цель проекта и KPI; Согласовать определения ключевых показателей; Определить приоритеты и формат управленческой отчетности; Принять спорные бизнес-решения по методологии; Провести финальную приемку BI-дашборда',
    'B2B продажи':'Передать этапы B2B-воронки и правила переходов; Передать перечень источников B2B-лидов; Определить обязательные поля карточки лида; Зафиксировать критерии квалификации; Передать причины отказа и потери; Описать правила назначения менеджера; Дать примеры реальных кейсов для проверки данных; Подтвердить корректность итоговых B2B-показателей',
    'B2C продажи':'Передать этапы B2C-воронки и правила переходов; Передать каналы поступления лидов; Определить обязательные поля карточки лида; Зафиксировать критерии квалификации; Передать причины отказа и потери; Описать правила назначения менеджера; Дать тестовые кейсы для сверки; Подтвердить корректность B2C-метрик',
    'Маркетинг':'Передать полный перечень рекламных каналов и кампаний; Передать правила нейминга кампаний и UTM; Определить источник данных по расходам; Передать детализацию затрат по каналу и кампании; Согласовать правила атрибуции; Передать календарь маркетинговых активностей; Назначить владельца маркетинговых данных; Определить способ автоматической выгрузки данных',
    'Сайт':'Составить карту всех форм и точек входа лида; Описать поля каждой формы; Передать список событий и dataLayer; Описать правила передачи UTM и referrer; Определить идентификатор отправки формы; Сверить соответствие полей сайта и ELMA; Предоставить тестовый контур; Определить технический способ передачи данных',
    'Метрики':'Предоставить доступы к Яндекс Метрике и GA4; Передать список целей и событий; Передать параметры Client ID и User ID; Описать UTM и рекламные измерения; Согласовать правила настройки событий; Определить API или экспорт в DWH; Передать тестовую выборку для сверки; Подтвердить полноту и корректность трекинга',
    '1 линия':'Описать все каналы первичного обращения; Передать категории и причины обращений; Определить обязательные данные клиента; Передать статусы обработки; Зафиксировать SLA первого контакта; Определить идентификатор обращения; Указать систему фиксации результата; Определить поля для передачи в ELMA',
    '2 линия':'Описать правила квалификации лида; Определить обязательные поля квалификации; Передать возможные результаты обработки; Передать причины неквалификации и отказа; Зафиксировать SLA обработки; Передать статусы; Определить кто и когда переводит лид дальше; Зафиксировать обязательные данные перед передачей в Альфа-Авто',
    'ELMA':'Предоставить модель сущности Lead; Передать полный перечень полей Lead; Передать Source, Channel и UTM; Передать статусы и историю их изменения; Передать даты событий и ответственного; Определить Lead ID; Описать правила дедупликации; Предоставить API или webhook; Описать правила передачи лида в Альфа-Авто; Передать поля, которые уходят в Альфа-Авто; Предоставить тестовую выгрузку',
    'Альфа-Авто':'Предоставить модель сделки; Определить Deal ID; Определить Client ID; Описать связку с Lead ID из ELMA; Передать этапы сделки; Передать историю изменения статусов; Передать менеджера сделки; Передать причины потерь; Передать данные договора или заказа; Передать дату продажи; Предоставить API или регулярную выгрузку; Передать тестовые сделки для сквозной сверки',
    '1С / финансы':'Определить финансовый факт продажи; Передать идентификатор договора; Передать идентификатор заказа или сделки для связки; Передать даты платежей; Передать суммы платежей; Передать статусы оплаты; Передать возвраты и отмены; Определить Payment ID; Описать правила сверки с Альфа-Авто; Согласовать формат автоматической выгрузки; Согласовать периодичность выгрузки в DWH',
    'DATA / DWH':'Согласовать архитектуру загрузки всех источников; Зафиксировать ключ Lead ID; Зафиксировать ключ Client ID; Зафиксировать ключ Deal ID; Зафиксировать ключ Payment ID; Согласовать целевую модель данных; Согласовать правила хранения истории; Определить расписание обновлений и SLA; Определить проверки полноты и качества данных; Описать обработку дублей и ошибок; Настроить доступы и витрины для BI',
    'BI':'Согласовать список KPI; Согласовать формулы расчета KPI; Согласовать структуру страниц дашборда; Согласовать фильтры и разрезы; Определить права просмотра; Зафиксировать источник каждой метрики; Согласовать периодичность обновления; Настроить контроль расхождений; Согласовать сценарий приемочного тестирования; Подготовить финальный рабочий дашборд',
    'ИБ':'Проверить архитектуру и поток данных; Классифицировать данные проекта; Определить допустимый состав данных в TEST; Определить допустимый состав данных в PROD; Согласовать требования к аутентификации; Согласовать ролевую модель; Согласовать RLS и права доступа; Согласовать хранение секретов; Согласовать аудит и логирование; Согласовать сроки хранения и удаления данных; Выдать требования для допуска production'
  };

  const TEAM_WINDOWS={
    'Коммерческий блок':[0,14],
    'B2B продажи':[7,35],
    'B2C продажи':[7,35],
    'Маркетинг':[7,35],
    'Сайт':[7,42],
    'Метрики':[7,42],
    '1 линия':[7,35],
    '2 линия':[7,35],
    'ELMA':[14,63],
    'Альфа-Авто':[28,63],
    '1С / финансы':[35,70],
    'DATA / DWH':[35,77],
    'BI':[63,91],
    'ИБ':[0,91]
  };

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'')||fallback}catch{return fallback}};
  const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const pad=n=>String(n).padStart(2,'0');
  const dateInput=ts=>{const d=new Date(ts);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
  const parseDate=v=>{if(!v)return null;const p=v.split('-').map(Number);if(p.length!==3||p.some(Number.isNaN))return null;return new Date(p[0],p[1]-1,p[2]).getTime()};
  const addDays=(ts,n)=>{const d=new Date(ts);d.setHours(0,0,0,0);d.setDate(d.getDate()+n);return d.getTime()};
  const diffDays=(a,b)=>Math.round((new Date(new Date(b).getFullYear(),new Date(b).getMonth(),new Date(b).getDate()).getTime()-new Date(new Date(a).getFullYear(),new Date(a).getMonth(),new Date(a).getDate()).getTime())/DAY);
  const fmt=ts=>new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit'}).format(new Date(ts));
  const today=()=>dateInput(Date.now());

  function teams(){
    if(typeof DATA!=='undefined'&&Array.isArray(DATA?.teams))return DATA.teams.map(r=>r[0]);
    return Object.keys(REQUIREMENTS);
  }
  function basePoints(team){return (REQUIREMENTS[team]||'').split(';').map((x,i)=>({id:`base-${i+1}`,text:x.trim(),custom:false})).filter(x=>x.text)}
  function customMap(){return read(CUSTOM_KEY,{})}
  function stateMap(){return read(STATE_KEY,{})}
  function points(team){return [...basePoints(team),...((customMap()[team]||[]).map(x=>({...x,custom:true})))]}
  function itemState(team,id){const all=stateMap();return {...{status:'Не запрошено',requestDate:'',dueDate:'',responseDate:'',respondent:'',comment:''},...(all[team]?.[id]||{})}}
  function saveItem(team,id,patch){const all=stateMap();all[team]=all[team]||{};all[team][id]={...itemState(team,id),...patch};write(STATE_KEY,all)}
  function teamMeta(team){const rows=Array.isArray(DATA?.teams)?DATA.teams:[];const i=rows.findIndex(r=>r[0]===team);const row=i>=0?rows[i]:null;return{raci:row?.[1]||'',role:row?.[2]||'',owner:i>=0?(localStorage.getItem(`atom-responsible-${i}`)||'Не назначен'):'Не назначен'}}
  function isOverdue(st){return Boolean(st.dueDate)&&!['Ответ получен','Готово'].includes(st.status)&&st.dueDate<today()}
  function statusGroup(st){if(st.status==='Блокер'||isOverdue(st))return'problem';if(st.status==='Готово')return'done';if(st.status==='Не запрошено')return'idle';return'work'}
  function statusColor(st){const g=statusGroup(st);return g==='problem'?'#d9534f':g==='done'?'#2ca66f':g==='work'?'#35bfb1':'#cfdada'}

  function derivedRange(team,index,total,projectStart){
    const window=TEAM_WINDOWS[team]||[0,91];
    const span=Math.max(7,window[1]-window[0]);
    const slots=Math.max(1,total);
    const slot=Math.max(7,Math.ceil(span/slots/7)*7);
    let start=window[0]+Math.floor(index*span/slots/7)*7;
    let end=Math.min(window[1],start+slot);
    if(end<=start)end=Math.min(91,start+7);
    return {start:addDays(projectStart,start),end:addDays(projectStart,end),derived:true};
  }

  function rangeFor(team,p,index,total,projectStart){
    const st=itemState(team,p.id);
    const req=parseDate(st.requestDate),due=parseDate(st.dueDate);
    if(req&&due)return{start:req,end:Math.max(req,due),derived:false};
    if(req)return{start:req,end:addDays(req,7),derived:false};
    if(due)return{start:addDays(due,-7),end:due,derived:false};
    return derivedRange(team,index,total,projectStart);
  }

  function allRows(projectStart){
    const out=[];
    teams().forEach(team=>{
      const list=points(team),meta=teamMeta(team);
      list.forEach((p,i)=>out.push({team,meta,p,st:itemState(team,p.id),range:rangeFor(team,p,i,list.length,projectStart)}));
    });
    return out;
  }

  function horizon(projectStart,rows){
    const max=Math.max(91,...rows.map(r=>Math.max(0,diffDays(projectStart,r.range.end))));
    return Math.max(91,Math.ceil(max/7)*7);
  }

  function weekHead(projectStart,h){
    let html='';
    for(let d=0,n=1;d<h;d+=7,n++){
      const end=Math.min(h,d+7);
      html+=`<div class="xg-week" style="width:${(end-d)/h*100}%"><b>Н${n}</b><small>${fmt(addDays(projectStart,d))}-${fmt(addDays(projectStart,end-1))}</small></div>`;
    }
    return html;
  }

  function grid(h){let x='';for(let d=7;d<h;d+=7)x+=`<i class="xg-gridline" style="left:${d/h*100}%"></i>`;return x}

  function ensureStyles(){
    if(document.getElementById('expanded-gantt-css'))return;
    const s=document.createElement('style');s.id='expanded-gantt-css';s.textContent=`
      .xg-page{width:100%;display:grid;gap:12px}.xg-top{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap}.xg-top h2{margin:0;font-size:22px}.xg-top p{margin:4px 0 0;color:var(--muted);font-size:12px}.xg-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;background:#fff;border:1px solid var(--line);border-radius:10px;padding:9px 10px}.xg-filters,.xg-actions{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.xg-toolbar select,.xg-toolbar input{padding:7px 8px;border:1px solid var(--line);border-radius:7px;background:#fff;font:inherit;font-size:11px}.xg-toolbar input{min-width:230px}.xg-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.xg-kpi{background:#fff;border:1px solid var(--line);border-radius:10px;padding:9px 11px}.xg-kpi span{font-size:10px;color:var(--muted);display:block}.xg-kpi b{font-size:20px}.xg-legend{display:flex;gap:12px;flex-wrap:wrap;font-size:10px;color:#53696a}.xg-legend span{display:inline-flex;align-items:center;gap:5px}.xg-dot{width:9px;height:9px;border-radius:3px}.xg-wrap{background:#fff;border:1px solid var(--line);border-radius:12px;overflow:auto;max-height:calc(100vh - 290px);min-height:420px}.xg-head,.xg-team-head,.xg-row{display:grid;grid-template-columns:620px minmax(900px,1fr);min-width:1520px}.xg-head{position:sticky;top:0;z-index:30;background:#edf3f3;border-bottom:1px solid #cfdada;min-height:54px}.xg-meta-head{position:sticky;left:0;z-index:32;background:#edf3f3;display:grid;grid-template-columns:120px 55px 250px 115px 80px;border-right:1px solid #ccd8d8}.xg-meta-head div{padding:9px 7px;border-right:1px solid #d9e2e2;font-size:9px;font-weight:700;color:#53696a;display:flex;align-items:center}.xg-timeline-head{position:relative;display:flex;min-width:900px}.xg-week{display:flex;flex-direction:column;align-items:center;justify-content:center;border-right:1px solid #d5dfdf;font-size:10px;color:#40595a}.xg-week small{font-size:8px;color:#809091;font-weight:400}.xg-team-head{background:#f0f7f6;border-top:2px solid #cfe9e5;border-bottom:1px solid #dbe5e5;min-height:42px}.xg-team-meta{position:sticky;left:0;z-index:12;background:#f0f7f6;border-right:1px solid #d3dfdf;padding:8px 10px;display:flex;align-items:center;justify-content:space-between;gap:10px}.xg-team-title{display:flex;align-items:center;gap:8px;min-width:0}.xg-team-title b{font-size:12px}.xg-team-title small{font-size:9px;color:#657a7b}.xg-team-actions{display:flex;gap:6px}.xg-team-actions button{border:1px solid #b8d4d1;background:#fff;color:#0f6962;border-radius:6px;padding:5px 7px;font:inherit;font-size:9px;cursor:pointer}.xg-team-summary{display:flex;align-items:center;padding:7px 10px;color:#53696a;font-size:10px}.xg-row{min-height:58px;border-bottom:1px solid #e7eded}.xg-row:hover{background:#fbfdfd}.xg-meta{position:sticky;left:0;z-index:9;background:inherit;display:grid;grid-template-columns:120px 55px 250px 115px 80px;border-right:1px solid #d6e0e0}.xg-cell{padding:7px;border-right:1px solid #e4eaea;font-size:10px;line-height:1.3;display:flex;align-items:center;min-width:0}.xg-cell.req{align-items:flex-start}.xg-cell.req span{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.xg-raci{font-weight:700;color:#0f6962}.xg-owner{word-break:break-word}.xg-status{display:inline-flex;padding:3px 5px;border-radius:999px;font-size:8px;font-weight:700;white-space:nowrap}.xg-status.idle{background:#edf2f2;color:#65797a}.xg-status.work{background:#e3faf7;color:#0f6962}.xg-status.done{background:#e5f7ef;color:#227457}.xg-status.problem{background:#fdeaea;color:#a53636}.xg-track{position:relative;min-width:900px;min-height:58px}.xg-gridline{position:absolute;top:0;bottom:0;width:1px;background:#e1e8e8}.xg-bar{position:absolute;top:17px;height:24px;border-radius:6px;min-width:4px;display:flex;align-items:center;overflow:hidden}.xg-bar.derived{opacity:.42;background:#91aaa9!important;border:1px dashed #4f696a}.xg-bar span{font-size:8px;font-weight:700;padding-left:5px;white-space:nowrap;color:#fff}.xg-today{position:absolute;top:0;bottom:0;width:2px;background:#d95c5c;z-index:6}.xg-response{position:absolute;top:12px;width:8px;height:8px;border-radius:50%;background:#2ca66f;border:2px solid #fff;box-shadow:0 0 0 1px #2ca66f;z-index:7}.xg-editor{grid-column:1/-1;display:none;background:#f8fbfb;padding:10px 12px;border-bottom:1px solid #dbe5e5}.xg-editor-grid{display:grid;grid-template-columns:150px 150px 165px 170px minmax(220px,1fr) auto;gap:8px;align-items:end}.xg-field label{display:block;font-size:9px;color:var(--muted);margin-bottom:4px}.xg-field input,.xg-field select{width:100%;box-sizing:border-box;padding:7px 8px;border:1px solid var(--line);border-radius:7px;background:#fff;font:inherit;font-size:10px}.xg-edit-btn{border:1px solid #b9cfcd;background:#fff;color:#0f6962;border-radius:6px;padding:5px 6px;font:inherit;font-size:9px;cursor:pointer}.xg-empty{padding:28px;text-align:center;color:var(--muted)}@media(max-width:1000px){.xg-kpis{grid-template-columns:repeat(2,1fr)}.xg-wrap{max-height:none}.xg-toolbar input{min-width:160px}}
    `;document.head.appendChild(s);
  }

  function statusOptions(selected){return STATUSES.map(x=>`<option ${x===selected?'selected':''}>${x}</option>`).join('')}
  function respondents(){let list=[];try{const r=JSON.parse(localStorage.getItem('atom-reference-data-v1')||'{}');list=Array.isArray(r.responsibles)?r.responsibles:[]}catch{}return [...new Set(list.filter(x=>x&&x!=='Не назначен'))]}
  function respondentList(){return respondents().map(x=>`<option value="${esc(x)}"></option>`).join('')}

  function editor(row){const s=row.st;return `<div class="xg-editor" data-xg-editor="${esc(row.team)}|${esc(row.p.id)}"><div class="xg-editor-grid"><div class="xg-field"><label>Дата запроса</label><input type="date" data-xg-field="requestDate" value="${esc(s.requestDate)}"></div><div class="xg-field"><label>Срок ответа</label><input type="date" data-xg-field="dueDate" value="${esc(s.dueDate)}"></div><div class="xg-field"><label>Статус</label><select data-xg-field="status">${statusOptions(s.status)}</select></div><div class="xg-field"><label>Ответственный за ответ</label><input list="xg-respondents" data-xg-field="respondent" value="${esc(s.respondent)}" placeholder="ФИО"></div><div class="xg-field"><label>Комментарий</label><input data-xg-field="comment" value="${esc(s.comment)}" placeholder="Комментарий"></div><button class="btn primary xg-save" data-team="${esc(row.team)}" data-id="${esc(row.p.id)}">Сохранить</button></div></div>`}

  function requirementRow(row,projectStart,h){
    const start=Math.max(0,diffDays(projectStart,row.range.start));
    const end=Math.max(start+1,diffDays(projectStart,row.range.end));
    const left=Math.max(0,start/h*100),width=Math.max(.5,(Math.min(h,end)-Math.max(0,start))/h*100);
    const g=statusGroup(row.st),response=parseDate(row.st.responseDate),responsePos=response?diffDays(projectStart,response):null;
    const owner=row.st.respondent||row.meta.owner||'Не назначен';
    return `<div class="xg-row" data-xg-row="${esc(row.team)}|${esc(row.p.id)}"><div class="xg-meta"><div class="xg-cell">${esc(row.team)}</div><div class="xg-cell xg-raci">${esc(row.meta.raci)}</div><div class="xg-cell req"><span title="${esc(row.p.text)}">${esc(row.p.text)}</span></div><div class="xg-cell xg-owner">${esc(owner)}</div><div class="xg-cell"><button class="xg-edit-btn" data-xg-edit="${esc(row.team)}|${esc(row.p.id)}">Открыть</button></div></div><div class="xg-track">${grid(h)}${todayLine(projectStart,h)}<div class="xg-bar ${row.range.derived?'derived':''}" style="left:${left}%;width:${width}%;background:${statusColor(row.st)}" title="${row.range.derived?'Базовый план по команде':'Даты из RACI'}: ${fmt(row.range.start)} - ${fmt(row.range.end)}"><span>${esc(row.st.status)}</span></div>${responsePos!==null&&responsePos>=0&&responsePos<=h?`<i class="xg-response" title="Ответ получен ${fmt(response)}" style="left:${responsePos/h*100}%"></i>`:''}</div>${editor(row)}</div>`;
  }

  function todayLine(projectStart,h){const d=diffDays(projectStart,Date.now());return d>=0&&d<=h?`<i class="xg-today" style="left:${d/h*100}%"></i>`:''}

  function visibleRows(rows){
    const q=searchTerm.trim().toLowerCase();
    return rows.filter(r=>{
      if(teamFilter!=='all'&&r.team!==teamFilter)return false;
      if(statusFilter==='problem'&&statusGroup(r.st)!=='problem')return false;
      if(statusFilter==='done'&&statusGroup(r.st)!=='done')return false;
      if(statusFilter==='work'&&statusGroup(r.st)!=='work')return false;
      if(statusFilter==='idle'&&statusGroup(r.st)!=='idle')return false;
      if(q&&!`${r.team} ${r.p.text} ${r.st.respondent} ${r.st.comment}`.toLowerCase().includes(q))return false;
      return true;
    });
  }

  function teamBlock(team,rows,projectStart,h){
    if(!rows.length)return'';
    const ready=rows.filter(r=>r.st.status==='Готово').length,problem=rows.filter(r=>statusGroup(r.st)==='problem').length;
    const pct=Math.round(rows.reduce((n,r)=>n+(STATUS_PROGRESS[r.st.status]||0),0)/rows.length);
    const meta=teamMeta(team),collapsed=COLLAPSED.has(team);
    return `<div class="xg-team-head"><div class="xg-team-meta"><div class="xg-team-title"><button class="xg-edit-btn xg-collapse" data-team="${esc(team)}">${collapsed?'Развернуть':'Свернуть'}</button><div><b>${esc(team)}</b><br><small>RACI ${esc(meta.raci)} · ${esc(meta.owner)}</small></div></div><div class="xg-team-actions"><button class="xg-open-raci" data-team="${esc(team)}">Открыть RACI</button></div></div><div class="xg-team-summary">Готовность ${pct}% · готово ${ready}/${rows.length}${problem?` · проблем ${problem}`:''}</div></div>${collapsed?'':rows.map(r=>requirementRow(r,projectStart,h)).join('')}`;
  }

  function render(){
    ensureStyles();
    document.querySelector('.content')?.classList.add('gantt-content-focus');
    document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));
    document.getElementById('expanded-gantt-nav')?.classList.add('active');
    const start=Number(localStorage.getItem('atom-project-started-at')||0)||Date.now();
    const rows=allRows(start),visible=visibleRows(rows),h=horizon(start,rows);
    const grouped=teams().map(team=>[team,visible.filter(r=>r.team===team)]).filter(([,r])=>r.length);
    const ready=rows.filter(r=>r.st.status==='Готово').length,work=rows.filter(r=>statusGroup(r.st)==='work').length,problem=rows.filter(r=>statusGroup(r.st)==='problem').length;
    app.innerHTML=`<div class="xg-page"><div class="xg-top"><div><h2>Развернутая диаграмма Ганта</h2><p>Детализированный план-график по командам, RACI и каждому пункту «Что нужно»</p></div><small style="color:var(--muted)">${rows.length} требований · ${teams().length} команд</small></div><div class="xg-kpis"><div class="xg-kpi"><span>Всего требований</span><b>${rows.length}</b></div><div class="xg-kpi"><span>Готово</span><b>${ready}</b></div><div class="xg-kpi"><span>В работе</span><b>${work}</b></div><div class="xg-kpi"><span>Проблемы / просрочка</span><b>${problem}</b></div><div class="xg-kpi"><span>Показано</span><b>${visible.length}</b></div></div><div class="xg-toolbar"><div class="xg-filters"><select id="xg-team-filter"><option value="all">Все команды</option>${teams().map(x=>`<option ${teamFilter===x?'selected':''}>${esc(x)}</option>`).join('')}</select><select id="xg-status-filter"><option value="all" ${statusFilter==='all'?'selected':''}>Все статусы</option><option value="work" ${statusFilter==='work'?'selected':''}>В работе</option><option value="problem" ${statusFilter==='problem'?'selected':''}>Проблемные</option><option value="done" ${statusFilter==='done'?'selected':''}>Готово</option><option value="idle" ${statusFilter==='idle'?'selected':''}>Не запрошено</option></select><input id="xg-search" value="${esc(searchTerm)}" placeholder="Найти по команде, требованию, ФИО"></div><div class="xg-actions"><button class="btn" id="xg-expand-all">Развернуть все</button><button class="btn" id="xg-collapse-all">Свернуть все</button></div></div><div class="xg-legend"><span><i class="xg-dot" style="background:#91aaa9"></i>Базовый план по команде</span><span><i class="xg-dot" style="background:#35bfb1"></i>Даты заданы в RACI</span><span><i class="xg-dot" style="background:#2ca66f"></i>Готово</span><span><i class="xg-dot" style="background:#d9534f"></i>Блокер / просрочка</span><span><i class="xg-dot" style="background:#d95c5c;width:2px"></i>Сегодня</span></div><div class="xg-wrap"><div class="xg-head"><div class="xg-meta-head"><div>Команда</div><div>RACI</div><div>Что нужно</div><div>Ответственный</div><div>Детали</div></div><div class="xg-timeline-head">${weekHead(start,h)}${todayLine(start,h)}</div></div>${grouped.length?grouped.map(([team,r])=>teamBlock(team,r,start,h)).join(''):'<div class="xg-empty">По выбранным фильтрам ничего не найдено.</div>'}</div><datalist id="xg-respondents">${respondentList()}</datalist></div>`;
  }

  function ensureButton(){
    const gantt=document.querySelector('.nav[data-view="gantt"]');
    if(!gantt||document.getElementById('expanded-gantt-nav'))return;
    const b=document.createElement('button');b.type='button';b.id='expanded-gantt-nav';b.className='nav';b.textContent='Развернутый Гант';
    b.addEventListener('click',()=>{history.replaceState(null,'','#expanded-gantt');render();});
    gantt.insertAdjacentElement('afterend',b);
  }

  document.addEventListener('click',e=>{
    const edit=e.target.closest('[data-xg-edit]');if(edit){const panel=document.querySelector(`[data-xg-editor="${CSS.escape(edit.dataset.xgEdit)}"]`);if(panel)panel.style.display=panel.style.display==='block'?'none':'block';return;}
    const save=e.target.closest('.xg-save');if(save){const key=`${save.dataset.team}|${save.dataset.id}`,panel=document.querySelector(`[data-xg-editor="${CSS.escape(key)}"]`);if(!panel)return;const patch={};panel.querySelectorAll('[data-xg-field]').forEach(x=>patch[x.dataset.xgField]=x.value);const old=itemState(save.dataset.team,save.dataset.id);if(patch.status==='Запрос отправлен'&&!patch.requestDate)patch.requestDate=old.requestDate||today();if(['Ответ получен','Готово'].includes(patch.status)&&!old.responseDate)patch.responseDate=today();saveItem(save.dataset.team,save.dataset.id,patch);render();return;}
    const c=e.target.closest('.xg-collapse');if(c){COLLAPSED.has(c.dataset.team)?COLLAPSED.delete(c.dataset.team):COLLAPSED.add(c.dataset.team);render();return;}
    const r=e.target.closest('.xg-open-raci');if(r){window.ATOM_RACI_REQUIREMENTS?.open?.(r.dataset.team);history.replaceState(null,'','#teams');return;}
    if(e.target.closest('#xg-expand-all')){COLLAPSED.clear();render();return;}
    if(e.target.closest('#xg-collapse-all')){teams().forEach(x=>COLLAPSED.add(x));render();return;}
  });

  document.addEventListener('change',e=>{
    if(e.target.id==='xg-team-filter'){teamFilter=e.target.value;render();return;}
    if(e.target.id==='xg-status-filter'){statusFilter=e.target.value;render();return;}
  });
  document.addEventListener('input',e=>{if(e.target.id==='xg-search'){searchTerm=e.target.value;clearTimeout(window.__xgSearchTimer);window.__xgSearchTimer=setTimeout(render,180);}});
  window.addEventListener('hashchange',()=>{if(location.hash==='#expanded-gantt')render();});
  window.addEventListener('atom-sync-update',()=>{if(location.hash==='#expanded-gantt')render();});
  ensureStyles();ensureButton();
  setTimeout(()=>{ensureButton();if(location.hash==='#expanded-gantt')render();},700);
  window.ATOM_EXPANDED_GANTT={open:render};
})();