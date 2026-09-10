(function(){
  const SOURCE_KEY='atom-custom-sources-v1';
  const DICT_KEY='atom-custom-dictionary-v1';
  const REF_KEY='atom-reference-data-v1';
  const EMAIL_KEY='atom-responsible-emails-v1';
  const PEOPLE_KEY='atom-core-people-v1';
  const DAY=86400000;
  let activeTab='teams';
  let reqTeam='Коммерческий блок';

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const read=(k,f)=>{try{const x=JSON.parse(localStorage.getItem(k)||'');return x??f}catch{return f}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const uid=()=>`${Date.now().toString(36)}${Math.random().toString(36).slice(2,7)}`;
  const pad=n=>String(n).padStart(2,'0');
  const dateInput=ts=>{const d=new Date(ts);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
  const dateTimeInput=ts=>{const d=new Date(ts);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`};
  const fmt=v=>{if(!v)return'Не задано';const p=String(v).split('-');return p.length===3?`${p[2]}.${p[1]}.${p[0]}`:v};
  const core=()=>window.ATOM_CORE;
  const teams=()=>Array.isArray(DATA?.teams)?DATA.teams:[];
  const sourceStatuses=()=>{const r=read(REF_KEY,{});return Array.isArray(r.source)&&r.source.length?r.source:['Не начато','Владелец определен','Доступ запрошен','Доступ получен','Структура данных описана','Данные получены','Интеграция в работе','На проверке','Блокер','Готово']};
  const people=()=>core()?.people?.()||[];
  const personOptions=(selectedName='Не назначен')=>['Не назначен',...people().map(x=>x.name)].filter((v,i,a)=>a.indexOf(v)===i).map(x=>`<option ${x===selectedName?'selected':''}>${esc(x)}</option>`).join('');
  const corePersonOptions=(selected='')=>['<option value="">Не назначен</option>',...people().map(x=>`<option value="${esc(x.id)}" ${x.id===selected?'selected':''}>${esc(x.name)}</option>`)].join('');
  const statusOptions=(selected='')=>core().STATUS.map(x=>`<option value="${x.id}" ${x.id===selected?'selected':''}>${esc(x.label)}</option>`).join('');
  const stageOptions=selected=>Array.from({length:12},(_,i)=>i+1).map(id=>`<option value="${id}" ${Number(selected)===id?'selected':''}>${id}. ${esc(core().stageName(id))}</option>`).join('');
  const sourceStatusOptions=selected=>sourceStatuses().map(x=>`<option ${x===selected?'selected':''}>${esc(x)}</option>`).join('');

  function styles(){
    if(document.getElementById('project-admin-css'))return;
    const s=document.createElement('style');s.id='project-admin-css';s.textContent=`
      .pa-page{display:grid;gap:12px}.pa-title{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap}.pa-title h2{margin:0;font-size:22px}.pa-title p{margin:4px 0 0;color:var(--muted);font-size:12px}.pa-master{padding:10px 12px;border-left:4px solid var(--accent);background:#eefcfa;border-radius:8px;font-size:11px;color:#425959}.pa-tabs{display:flex;gap:5px;flex-wrap:wrap;background:#fff;border:1px solid var(--line);border-radius:10px;padding:6px}.pa-tab{border:0;background:#f3f7f7;color:#526a6b;border-radius:7px;padding:8px 10px;font:inherit;font-size:11px;cursor:pointer}.pa-tab.active{background:#dff9f5;color:#0f6962;font-weight:700}.pa-panel{display:grid;gap:10px}.pa-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.pa-kpi{background:#fff;border:1px solid var(--line);border-radius:10px;padding:10px}.pa-kpi span{display:block;font-size:9px;color:var(--muted)}.pa-kpi b{font-size:20px}.pa-table-wrap{overflow:auto;background:#fff;border:1px solid var(--line);border-radius:11px}.pa-table{width:100%;border-collapse:collapse;min-width:980px}.pa-table th,.pa-table td{padding:9px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top;font-size:11px}.pa-table th{background:#f1f6f6;color:#425959;position:sticky;top:0;z-index:2}.pa-table tr:last-child td{border-bottom:0}.pa-table select,.pa-table input,.pa-table textarea{width:100%;box-sizing:border-box;padding:7px 8px;border:1px solid #ccd9d9;border-radius:7px;background:#fff;font:inherit;font-size:10px;color:var(--text)}.pa-table textarea{min-height:46px;resize:vertical}.pa-toolbar{display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap}.pa-toolbar-left,.pa-toolbar-right{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.pa-toolbar select,.pa-toolbar input{padding:8px;border:1px solid var(--line);border-radius:7px;background:#fff;font:inherit;font-size:11px}.pa-inline{display:flex;gap:6px;align-items:center}.pa-inline>*{min-width:0}.pa-add{display:grid;grid-template-columns:1.2fr 1fr 1fr 1fr auto;gap:7px;background:#fff;border:1px solid var(--line);border-radius:10px;padding:10px;align-items:end}.pa-add.req{grid-template-columns:minmax(280px,1fr) 250px auto}.pa-add.person{grid-template-columns:1fr 1fr auto}.pa-field label{display:block;color:var(--muted);font-size:9px;margin-bottom:4px}.pa-field input,.pa-field select{width:100%;box-sizing:border-box;padding:8px;border:1px solid var(--line);border-radius:7px;background:#fff;font:inherit;font-size:11px}.pa-note{font-size:10px;color:var(--muted)}.pa-status{display:inline-flex;padding:4px 6px;border-radius:999px;font-size:9px;font-weight:700}.pa-status.ok{background:#e5f7ef;color:#227457}.pa-status.work{background:#e3faf7;color:#0f6962}.pa-status.bad{background:#fdeaea;color:#a53636}.pa-status.neutral{background:#edf2f2;color:#65797a}.pa-settings{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.pa-setting{background:#fff;border:1px solid var(--line);border-radius:11px;padding:14px}.pa-setting h3{margin:0 0 8px;font-size:14px}.pa-setting p{font-size:11px;color:var(--muted)}.pa-setting input{width:100%;padding:8px;border:1px solid var(--line);border-radius:7px;font:inherit}.pa-system-list{display:flex;gap:5px;flex-wrap:wrap}.pa-system-list span{padding:4px 6px;border-radius:999px;background:#edf3f3;font-size:9px;color:#53696a}@media(max-width:900px){.pa-kpis{grid-template-columns:repeat(2,1fr)}.pa-add,.pa-add.req,.pa-add.person,.pa-settings{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function emit(type='management'){window.dispatchEvent(new CustomEvent('atom-core-data-changed',{detail:{type}}));core()?.reconcile?.();}
  function setHash(tab=activeTab){history.replaceState(null,'',`#management/${tab}`)}

  function renderShell(){
    if(!core()||typeof DATA==='undefined'||!DATA){app.innerHTML='<div class="callout">Загрузка данных проекта...</div>';setTimeout(render,250);return;}
    styles();setHash();document.querySelector('.content')?.classList.remove('gantt-content-focus');document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));document.getElementById('project-admin-nav')?.classList.add('active');
    const tabs=[['teams','Команды'],['requirements','Требования'],['stages','Этапы и сроки'],['sources','Источники'],['dictionary','Data Dictionary'],['directories','Справочники'],['settings','Настройки']];
    app.innerHTML=`<div class="pa-page"><div class="pa-title"><div><h2>Управление проектом</h2><p>Единый центр изменения данных проекта коммерческой аналитики</p></div><small style="color:var(--muted)">Logic Core ${esc(core().version||'1.2')}</small></div><div class="pa-master"><b>Правило:</b> изменения делаем здесь. Обзор, Ганты, RACI, этапы и Definition of Done используют эти же данные для контроля.</div><div class="pa-tabs">${tabs.map(([id,name])=>`<button class="pa-tab ${activeTab===id?'active':''}" data-pa-tab="${id}">${name}</button>`).join('')}</div><div id="pa-panel" class="pa-panel"></div></div>`;
    renderPanel();
  }

  function renderPanel(){
    const host=document.getElementById('pa-panel');if(!host)return;
    if(activeTab==='teams')host.innerHTML=teamsPanel();
    else if(activeTab==='requirements')host.innerHTML=requirementsPanel();
    else if(activeTab==='stages')host.innerHTML=stagesPanel();
    else if(activeTab==='sources')host.innerHTML=sourcesPanel();
    else if(activeTab==='dictionary')host.innerHTML=dictionaryPanel();
    else if(activeTab==='directories')host.innerHTML=directoriesPanel();
    else if(activeTab==='settings')host.innerHTML=settingsPanel();
  }

  function teamsPanel(){
    const sums=new Map(core().teams().map(t=>[t,core().teamSummary(t)]));
    return `<div class="pa-kpis"><div class="pa-kpi"><span>Команд</span><b>${teams().length}</b></div><div class="pa-kpi"><span>Владельцы назначены</span><b>${core().ownersSummary().ready}/${core().ownersSummary().total}</b></div><div class="pa-kpi"><span>Требований готово</span><b>${core().requirements().filter(r=>core().getState(r.id).statusId==='done').length}/${core().requirements().length}</b></div><div class="pa-kpi"><span>Проблемные требования</span><b>${core().requirements().filter(r=>core().requirementProblem(r)).length}</b></div></div><div class="pa-table-wrap"><table class="pa-table"><thead><tr><th>Команда</th><th>RACI</th><th>Роль</th><th>Ответственный за команду</th><th>Готовность</th><th></th></tr></thead><tbody>${teams().map((r,i)=>{const s=sums.get(r[0]);const owner=localStorage.getItem(`atom-responsible-${i}`)||'Не назначен';return `<tr><td><b>${esc(r[0])}</b></td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td><select data-pa-team-owner="${i}">${personOptions(owner)}</select></td><td><b>${s?.progress||0}%</b><br><span class="pa-note">готово ${s?.done||0}/${s?.total||0}${s?.problem?` · проблем ${s.problem}`:''}</span></td><td><button class="btn pa-open-team" data-team="${esc(r[0])}">Открыть RACI</button></td></tr>`}).join('')}</tbody></table></div>`;
  }

  function requirementsPanel(){
    if(!core().teams().includes(reqTeam))reqTeam=core().teams()[0];
    const rows=core().requirementsByTeam(reqTeam),sum=core().teamSummary(reqTeam);
    return `<div class="pa-toolbar"><div class="pa-toolbar-left"><b>Команда</b><select id="pa-req-team">${core().teams().map(t=>`<option ${t===reqTeam?'selected':''}>${esc(t)}</option>`).join('')}</select></div><div class="pa-note">Готовность ${sum.progress}% · готово ${sum.done}/${sum.total} · проблем ${sum.problem}</div></div><div class="pa-table-wrap"><table class="pa-table"><thead><tr><th style="min-width:280px">Что нужно</th><th>Этап Ганта</th><th>Период</th><th>Статус</th><th>Ответственный за ответ</th><th style="min-width:220px">Комментарий</th><th></th></tr></thead><tbody>${rows.map(r=>{const st=core().getState(r.id),p=core().periodForRequirement(r);return `<tr data-pa-req="${esc(r.id)}"><td>${esc(r.text)}</td><td>${r.custom?`<select data-pa-req-stage>${stageOptions(r.stageId)}</select>`:`<b>${r.stageId}. ${esc(p.stageName)}</b>`}</td><td><b>${fmt(p.startDate)} - ${fmt(p.endDate)}</b>${p.changed?'<br><span class="pa-note">срок этапа перенесен</span>':''}</td><td><select data-pa-req-status>${statusOptions(st.statusId)}</select></td><td><select data-pa-req-person>${corePersonOptions(st.respondentId)}</select></td><td><textarea data-pa-req-comment>${esc(st.comment)}</textarea></td><td>${r.custom?`<button class="btn pa-delete-req" data-id="${esc(r.id)}">Удалить</button>`:''}</td></tr>`}).join('')}</tbody></table></div><div class="pa-add req"><div class="pa-field"><label>Новый пункт «Что нужно»</label><input id="pa-new-req" placeholder="Конкретный результат от команды"></div><div class="pa-field"><label>Этап Ганта</label><select id="pa-new-req-stage">${stageOptions(1)}</select></div><button class="btn primary" id="pa-add-req">Добавить</button></div>`;
  }

  function stageDueState(id){const g=window.ATOM_GANTT?.getTaskState?.(id),s=core().stageSummary(id);return{g,s}}
  function stagesPanel(){
    const start=Number(localStorage.getItem('atom-project-started-at')||0);
    return `<div class="pa-master"><b>Сроки меняются здесь или в обычном Ганте.</b> Это одни и те же даты. Все связанные требования команд автоматически получают новый период.</div><div class="pa-table-wrap"><table class="pa-table"><thead><tr><th>#</th><th>Этап</th><th>Готовность</th><th>Статус</th><th>Начало</th><th>Актуальный срок</th><th>Причина изменения</th><th></th></tr></thead><tbody>${Array.from({length:12},(_,i)=>i+1).map(id=>{const {g,s}=stageDueState(id);const due=g?dateInput(g.due):'',base=g?dateInput(g.originalDue):'',cls=s.problem?'bad':s.progress>=100?'ok':s.progress>0?'work':'neutral';return `<tr data-pa-stage="${id}"><td>${id}</td><td><b>${esc(core().stageName(id))}</b></td><td><b>${s.progress}%</b></td><td><span class="pa-status ${cls}">${esc(s.status)}</span></td><td>${g?fmt(dateInput(g.startDate)):'-'}</td><td><input type="date" data-pa-stage-due value="${esc(due)}" ${!start?'disabled':''}><div class="pa-note">базовый: ${fmt(base)}</div></td><td><input data-pa-stage-reason placeholder="Причина нужна при продлении"></td><td><div class="pa-inline"><button class="btn pa-save-stage" data-id="${id}" ${!start?'disabled':''}>Сохранить</button>${g?.changed?`<button class="btn pa-reset-stage" data-id="${id}">Базовый</button>`:''}</div></td></tr>`}).join('')}</tbody></table></div>${!start?'<div class="callout">Сроки станут редактируемыми после запуска проекта.</div>':''}`;
  }

  function sourcesPanel(){
    const base=Array.isArray(DATA?.sources_list)?DATA.sources_list:[],custom=read(SOURCE_KEY,[]),sum=core().sourcesSummary();
    return `<div class="pa-kpis"><div class="pa-kpi"><span>Всего источников</span><b>${sum.total}</b></div><div class="pa-kpi"><span>Определено</span><b>${sum.identified}</b></div><div class="pa-kpi"><span>Полностью готово</span><b>${sum.ready}</b></div><div class="pa-kpi"><span>Блокеры</span><b>${sum.problem}</b></div></div><div class="pa-table-wrap"><table class="pa-table"><thead><tr><th>Источник</th><th>Данные</th><th>Целевая связка</th><th>Ответственный</th><th>Статус</th><th></th></tr></thead><tbody>${base.map((r,i)=>{const st=localStorage.getItem(`atom-source-status-${i}`)||'Не начато',owner=localStorage.getItem(`atom-source-owner-${i}`)||'Не назначен';return `<tr><td><b>${esc(r[0])}</b></td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td><select data-pa-source-owner="${i}">${personOptions(owner)}</select></td><td><select data-pa-source-status="${i}">${sourceStatusOptions(st)}</select></td><td><span class="pa-note">базовый источник</span></td></tr>`}).join('')}${custom.map(x=>{const st=localStorage.getItem(`atom-source-status-custom-${x.id}`)||'Не начато';return `<tr data-pa-custom-source="${esc(x.id)}"><td><input data-cs-name value="${esc(x.name)}"></td><td><input data-cs-data value="${esc(x.data||'')}"></td><td><input data-cs-target value="${esc(x.target||'')}"></td><td><select data-cs-owner>${personOptions(x.owner||'Не назначен')}</select></td><td><select data-cs-status>${sourceStatusOptions(st)}</select></td><td><div class="pa-inline"><button class="btn pa-save-source">Сохранить</button><button class="btn pa-delete-source">Удалить</button></div></td></tr>`}).join('')}</tbody></table></div><div class="pa-add"><div class="pa-field"><label>Источник</label><input id="pa-source-name" placeholder="Название"></div><div class="pa-field"><label>Какие данные</label><input id="pa-source-data" placeholder="Лиды, звонки..."></div><div class="pa-field"><label>Целевая связка</label><input id="pa-source-target" placeholder="ELMA / DWH..."></div><div class="pa-field"><label>Ответственный</label><select id="pa-source-owner">${personOptions()}</select></div><button class="btn primary" id="pa-add-source">Добавить</button></div>`;
  }

  function dictionaryPanel(){
    const base=Array.isArray(DATA?.dictionary)?DATA.dictionary:[],custom=read(DICT_KEY,[]),sum=core().dictionarySummary();
    return `<div class="pa-kpis"><div class="pa-kpi"><span>Всего полей</span><b>${sum.total}</b></div><div class="pa-kpi"><span>Готово</span><b>${sum.ready}</b></div><div class="pa-kpi"><span>Не готово</span><b>${Math.max(0,sum.total-sum.ready)}</b></div><div class="pa-kpi"><span>Ключевые ID</span><b>${core().criticalIdsSummary().ready}/${core().criticalIdsSummary().total}</b></div></div><div class="pa-table-wrap"><table class="pa-table"><thead><tr><th>Поле</th><th>Система</th><th>Назначение</th><th>Класс</th><th>Готовность</th><th></th></tr></thead><tbody>${base.map((r,i)=>`<tr><td><b>${esc(r[0])}</b></td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${r[3]==='critical'?'Критично':'Обязательно'}</td><td><label><input type="checkbox" data-pa-dict-base="${i}" ${localStorage.getItem(`atom-dictionary-ready-${i}`)==='1'?'checked':''}> ${localStorage.getItem(`atom-dictionary-ready-${i}`)==='1'?'Готово':'Не готово'}</label></td><td><span class="pa-note">базовое поле</span></td></tr>`).join('')}${custom.map(x=>`<tr data-pa-custom-dict="${esc(x.id)}"><td><input data-cd-field value="${esc(x.field)}"></td><td><input data-cd-system value="${esc(x.system||'')}"></td><td><input data-cd-purpose value="${esc(x.purpose||'')}"></td><td><select data-cd-class><option value="required" ${x.class!=='critical'?'selected':''}>Обязательно</option><option value="critical" ${x.class==='critical'?'selected':''}>Критично</option></select></td><td><label><input type="checkbox" data-cd-ready ${x.ready?'checked':''}> ${x.ready?'Готово':'Не готово'}</label></td><td><div class="pa-inline"><button class="btn pa-save-dict">Сохранить</button><button class="btn pa-delete-dict">Удалить</button></div></td></tr>`).join('')}</tbody></table></div><div class="pa-add"><div class="pa-field"><label>Поле</label><input id="pa-dict-field" placeholder="Название поля"></div><div class="pa-field"><label>Система</label><input id="pa-dict-system" placeholder="ELMA, 1С..."></div><div class="pa-field"><label>Назначение</label><input id="pa-dict-purpose" placeholder="Для чего используется"></div><div class="pa-field"><label>Класс</label><select id="pa-dict-class"><option value="required">Обязательно</option><option value="critical">Критично</option></select></div><button class="btn primary" id="pa-add-dict">Добавить</button></div>`;
  }

  function directoriesPanel(){
    const refs=read(REF_KEY,{}),emails=read(EMAIL_KEY,{}),names=Array.isArray(refs.responsibles)?refs.responsibles.filter(x=>x!=='Не назначен'):[];
    const sys=[['Статусы этапов',refs.stage||[]],['Статусы источников',refs.source||[]],['Статусы блокеров',refs.blocker||[]],['Критичность блокеров',refs.severity||[]]];
    return `<div class="pa-master"><b>Ответственные редактируются здесь.</b> Системные статусы Logic Core показаны ниже справочно, их названия лучше не менять, чтобы не нарушить расчеты.</div><div class="pa-table-wrap"><table class="pa-table"><thead><tr><th>ФИО</th><th>E-mail</th><th></th></tr></thead><tbody>${names.map(name=>`<tr data-pa-person="${esc(name)}"><td><input data-pa-person-name value="${esc(name)}"></td><td><input type="email" data-pa-person-email value="${esc(emails[name]||'')}"></td><td><div class="pa-inline"><button class="btn pa-save-person">Сохранить</button><button class="btn pa-delete-person">Удалить</button></div></td></tr>`).join('')}</tbody></table></div><div class="pa-add person"><div class="pa-field"><label>ФИО</label><input id="pa-person-name" placeholder="Фамилия Имя"></div><div class="pa-field"><label>E-mail</label><input id="pa-person-email" type="email" placeholder="name@atom.auto"></div><button class="btn primary" id="pa-add-person">Добавить</button></div><div class="pa-settings">${sys.map(([name,vals])=>`<div class="pa-setting"><h3>${esc(name)}</h3><div class="pa-system-list">${vals.map(v=>`<span>${esc(v)}</span>`).join('')}</div></div>`).join('')}</div>`;
  }

  function settingsPanel(){
    const raw=localStorage.getItem('atom-project-started-at'),start=raw?Number(raw):null,sync=window.ATOM_SYNC?.status?.()||{},finish=start?start+91*DAY:null;
    return `<div class="pa-settings"><div class="pa-setting"><h3>Календарь проекта</h3><p>Единая дата старта для основного и развернутого Ганта. При изменении даты старта уже перенесенные сроки этапов будут сдвинуты на ту же величину.</p><div class="pa-field"><label>Дата и время старта</label><input id="pa-project-start" type="datetime-local" value="${start?dateTimeInput(start):''}"></div><div class="pa-inline" style="margin-top:9px"><button class="btn primary" id="pa-save-start">Сохранить дату старта</button></div><p>Плановый горизонт: <b>13 недель / 91 день</b>${finish?`<br>Базовое завершение: <b>${fmt(dateInput(finish))}</b>`:''}</p></div><div class="pa-setting"><h3>Синхронизация</h3><p>Данные сохраняются в облачный TEST-контур и синхронизируются между устройствами.</p><p>Состояние: <b>${sync.error?'Ошибка':sync.pending?`Сохраняется, очередь ${sync.pending}`:'Синхронизировано'}</b></p><button class="btn" id="pa-sync-now">Синхронизировать сейчас</button></div><div class="pa-setting"><h3>Logic Core</h3><p>Версия ядра: <b>${esc(core().version||'1.2.0')}</b></p><p>Требований: <b>${core().requirements().length}</b><br>Команд: <b>${core().teams().length}</b><br>Этапов: <b>12</b></p></div><div class="pa-setting"><h3>Где теперь менять данные</h3><p><b>Команды:</b> владелец команды.<br><b>Требования:</b> статус, ответственный, комментарий, этап.<br><b>Этапы:</b> сроки.<br><b>Источники:</b> статус и состав.<br><b>Data Dictionary:</b> готовность и дополнительные поля.<br><b>Справочники:</b> ФИО и e-mail.</p></div></div>`;
  }

  function saveStage(id,row){
    const g=window.ATOM_GANTT?.getTaskState?.(id);if(!g)return;
    const value=row.querySelector('[data-pa-stage-due]')?.value,reason=row.querySelector('[data-pa-stage-reason]')?.value.trim()||'';if(!value)return;
    const start=core().startTs(),nd=new Date(value+'T23:59:59.999').getTime(),stageStart=new Date(g.startDate);stageStart.setHours(0,0,0,0);const base=new Date(g.originalDue).getTime();const startDay=new Date(start);startDay.setHours(0,0,0,0);const dueDay=new Date(value+'T00:00:00').getTime(),offset=Math.round((dueDay-startDay.getTime())/DAY);
    if(nd<stageStart.getTime())return alert('Срок не может быть раньше начала этапа');
    if(offset%7!==0)return alert('Срок должен быть на границе проектной недели. Шаг 7 дней.');
    if(nd>base&&!reason)return alert('Для продления срока укажи причину.');
    const histKey=`atom-gantt-reschedule-history-${id}`,hist=read(histKey,[]);hist.push({changedAt:new Date().toISOString(),oldDue:dateInput(g.due),newDue:value,originalDue:dateInput(g.originalDue),type:nd>base?'extended':nd<base?'shortened':'baseline',reason});write(histKey,hist);localStorage.setItem(`atom-gantt-due-${id}`,value);emit('stage-due');renderPanel();
  }

  function resetStage(id){localStorage.removeItem(`atom-gantt-due-${id}`);emit('stage-due-reset');renderPanel()}

  function updateCustomRequirementStage(id,stageId){const key=`atom-core-requirement-meta-${id}`,m=read(key,null);if(!m)return;m.stageId=Number(stageId);write(key,m);emit('requirement-stage')}

  function saveCustomSource(row){
    const id=row.dataset.paCustomSource,list=read(SOURCE_KEY,[]),x=list.find(v=>String(v.id)===String(id));if(!x)return;
    x.name=row.querySelector('[data-cs-name]')?.value.trim()||x.name;x.data=row.querySelector('[data-cs-data]')?.value.trim()||'';x.target=row.querySelector('[data-cs-target]')?.value.trim()||'';x.owner=row.querySelector('[data-cs-owner]')?.value||'Не назначен';write(SOURCE_KEY,list);localStorage.setItem(`atom-source-status-custom-${id}`,row.querySelector('[data-cs-status]')?.value||'Не начато');emit('source');renderPanel();
  }

  function saveCustomDict(row){
    const id=row.dataset.paCustomDict,list=read(DICT_KEY,[]),x=list.find(v=>String(v.id)===String(id));if(!x)return;
    x.field=row.querySelector('[data-cd-field]')?.value.trim()||x.field;x.system=row.querySelector('[data-cd-system]')?.value.trim()||'';x.purpose=row.querySelector('[data-cd-purpose]')?.value.trim()||'';x.class=row.querySelector('[data-cd-class]')?.value||'required';x.ready=Boolean(row.querySelector('[data-cd-ready]')?.checked);write(DICT_KEY,list);emit('dictionary');renderPanel();
  }

  function renamePerson(oldName,newName,email){
    const refs=read(REF_KEY,{}),emails=read(EMAIL_KEY,{});refs.responsibles=Array.isArray(refs.responsibles)?refs.responsibles:['Не назначен'];const i=refs.responsibles.indexOf(oldName);if(i>=0)refs.responsibles[i]=newName;else refs.responsibles.push(newName);if(oldName!==newName){delete emails[oldName];for(let j=0;j<teams().length;j++)if(localStorage.getItem(`atom-responsible-${j}`)===oldName)localStorage.setItem(`atom-responsible-${j}`,newName);for(let j=0;j<(DATA?.sources_list||[]).length;j++)if(localStorage.getItem(`atom-source-owner-${j}`)===oldName)localStorage.setItem(`atom-source-owner-${j}`,newName);const cs=read(SOURCE_KEY,[]);cs.forEach(x=>{if(x.owner===oldName)x.owner=newName});write(SOURCE_KEY,cs);const blockers=read('atom-blockers',[]);blockers.forEach(x=>{if(x.owner===oldName)x.owner=newName});write('atom-blockers',blockers);const ps=read(PEOPLE_KEY,[]),p=ps.find(x=>x.name===oldName);if(p){p.name=newName;p.email=email||'';write(PEOPLE_KEY,ps);}}emails[newName]=email||'';write(REF_KEY,refs);write(EMAIL_KEY,emails);emit('person');
  }

  function deletePerson(name){
    const refs=read(REF_KEY,{}),emails=read(EMAIL_KEY,{});refs.responsibles=(refs.responsibles||[]).filter(x=>x!==name);delete emails[name];write(REF_KEY,refs);write(EMAIL_KEY,emails);for(let j=0;j<teams().length;j++)if(localStorage.getItem(`atom-responsible-${j}`)===name)localStorage.setItem(`atom-responsible-${j}`,'Не назначен');for(let j=0;j<(DATA?.sources_list||[]).length;j++)if(localStorage.getItem(`atom-source-owner-${j}`)===name)localStorage.setItem(`atom-source-owner-${j}`,'Не назначен');const cs=read(SOURCE_KEY,[]);cs.forEach(x=>{if(x.owner===name)x.owner='Не назначен'});write(SOURCE_KEY,cs);const ps=read(PEOPLE_KEY,[]).filter(x=>x.name!==name);write(PEOPLE_KEY,ps);emit('person-delete');
  }

  function saveStart(){
    const v=document.getElementById('pa-project-start')?.value;if(!v)return alert('Укажи дату и время старта проекта');const next=new Date(v).getTime();if(!Number.isFinite(next))return alert('Некорректная дата');const old=Number(localStorage.getItem('atom-project-started-at')||0),delta=old?next-old:0;
    if(old&&delta){for(let id=1;id<=12;id++){const key=`atom-gantt-due-${id}`,d=localStorage.getItem(key);if(!d)continue;const shifted=new Date(new Date(d+'T00:00:00').getTime()+delta);localStorage.setItem(key,dateInput(shifted));}}
    localStorage.setItem('atom-project-started-at',String(next));emit('project-start');renderPanel();
  }

  document.addEventListener('click',e=>{
    const nav=e.target.closest('#project-admin-nav');if(nav){activeTab='teams';renderShell();return;}
    const tab=e.target.closest('[data-pa-tab]');if(tab){activeTab=tab.dataset.paTab;setHash();document.querySelectorAll('.pa-tab').forEach(x=>x.classList.toggle('active',x===tab));renderPanel();return;}
    const open=e.target.closest('.pa-open-team');if(open){window.ATOM_CORE_UI?.renderRaci?.(open.dataset.team);return;}
    if(e.target.closest('#pa-add-req')){const text=document.getElementById('pa-new-req')?.value.trim(),stage=Number(document.getElementById('pa-new-req-stage')?.value||1);if(!text)return alert('Укажи, что нужно получить');core().addRequirement(reqTeam,text,stage);emit('requirement-add');renderPanel();return;}
    const dr=e.target.closest('.pa-delete-req');if(dr){if(confirm('Удалить дополнительное требование?')){core().deleteRequirement(dr.dataset.id);emit('requirement-delete');renderPanel();}return;}
    const ss=e.target.closest('.pa-save-stage');if(ss){saveStage(Number(ss.dataset.id),ss.closest('tr'));return;}
    const rs=e.target.closest('.pa-reset-stage');if(rs){if(confirm('Вернуть базовый срок этапа?'))resetStage(Number(rs.dataset.id));return;}
    if(e.target.closest('#pa-add-source')){const name=document.getElementById('pa-source-name')?.value.trim();if(!name)return alert('Укажи источник');const list=read(SOURCE_KEY,[]);if(list.some(x=>x.name.toLowerCase()===name.toLowerCase()))return alert('Такой источник уже есть');const id=uid();list.push({id,name,data:document.getElementById('pa-source-data')?.value.trim()||'',target:document.getElementById('pa-source-target')?.value.trim()||'',owner:document.getElementById('pa-source-owner')?.value||'Не назначен'});write(SOURCE_KEY,list);localStorage.setItem(`atom-source-status-custom-${id}`,'Не начато');emit('source-add');renderPanel();return;}
    const sc=e.target.closest('.pa-save-source');if(sc){saveCustomSource(sc.closest('[data-pa-custom-source]'));return;}
    const sd=e.target.closest('.pa-delete-source');if(sd){const row=sd.closest('[data-pa-custom-source]');if(row&&confirm('Удалить источник?')){const id=row.dataset.paCustomSource;write(SOURCE_KEY,read(SOURCE_KEY,[]).filter(x=>String(x.id)!==String(id)));localStorage.removeItem(`atom-source-status-custom-${id}`);emit('source-delete');renderPanel();}return;}
    if(e.target.closest('#pa-add-dict')){const field=document.getElementById('pa-dict-field')?.value.trim();if(!field)return alert('Укажи поле');const list=read(DICT_KEY,[]);list.push({id:uid(),field,system:document.getElementById('pa-dict-system')?.value.trim()||'',purpose:document.getElementById('pa-dict-purpose')?.value.trim()||'',class:document.getElementById('pa-dict-class')?.value||'required',ready:false});write(DICT_KEY,list);emit('dictionary-add');renderPanel();return;}
    const dc=e.target.closest('.pa-save-dict');if(dc){saveCustomDict(dc.closest('[data-pa-custom-dict]'));return;}
    const dd=e.target.closest('.pa-delete-dict');if(dd){const row=dd.closest('[data-pa-custom-dict]');if(row&&confirm('Удалить поле Data Dictionary?')){write(DICT_KEY,read(DICT_KEY,[]).filter(x=>String(x.id)!==String(row.dataset.paCustomDict)));emit('dictionary-delete');renderPanel();}return;}
    if(e.target.closest('#pa-add-person')){const name=document.getElementById('pa-person-name')?.value.trim(),email=document.getElementById('pa-person-email')?.value.trim()||'';if(!name)return alert('Укажи ФИО');const refs=read(REF_KEY,{});refs.responsibles=Array.isArray(refs.responsibles)?refs.responsibles:['Не назначен'];if(refs.responsibles.includes(name))return alert('Такой ответственный уже есть');refs.responsibles.push(name);write(REF_KEY,refs);const emails=read(EMAIL_KEY,{});emails[name]=email;write(EMAIL_KEY,emails);core().findPersonId(name);emit('person-add');renderPanel();return;}
    const sp=e.target.closest('.pa-save-person');if(sp){const row=sp.closest('[data-pa-person]'),old=row?.dataset.paPerson,newName=row?.querySelector('[data-pa-person-name]')?.value.trim(),email=row?.querySelector('[data-pa-person-email]')?.value.trim()||'';if(!old||!newName)return;renamePerson(old,newName,email);renderPanel();return;}
    const dp=e.target.closest('.pa-delete-person');if(dp){const row=dp.closest('[data-pa-person]'),name=row?.dataset.paPerson;if(name&&confirm(`Удалить ${name} из справочника?`)){deletePerson(name);renderPanel();}return;}
    if(e.target.closest('#pa-save-start')){saveStart();return;}
    if(e.target.closest('#pa-sync-now')){window.ATOM_SYNC?.flush?.();window.ATOM_SYNC?.pull?.();setTimeout(renderPanel,400);return;}
  });

  document.addEventListener('change',e=>{
    const team=e.target.closest('[data-pa-team-owner]');if(team){localStorage.setItem(`atom-responsible-${team.dataset.paTeamOwner}`,team.value);emit('team-owner');renderPanel();return;}
    if(e.target.id==='pa-req-team'){reqTeam=e.target.value;renderPanel();return;}
    const status=e.target.closest('[data-pa-req-status]');if(status){const row=status.closest('[data-pa-req]');core().setState(row.dataset.paReq,{statusId:status.value});emit('requirement-status');renderPanel();return;}
    const person=e.target.closest('[data-pa-req-person]');if(person){const row=person.closest('[data-pa-req]');core().setState(row.dataset.paReq,{respondentId:person.value});emit('requirement-person');renderPanel();return;}
    const stage=e.target.closest('[data-pa-req-stage]');if(stage){const row=stage.closest('[data-pa-req]');updateCustomRequirementStage(row.dataset.paReq,stage.value);renderPanel();return;}
    const so=e.target.closest('[data-pa-source-owner]');if(so){localStorage.setItem(`atom-source-owner-${so.dataset.paSourceOwner}`,so.value);emit('source-owner');return;}
    const st=e.target.closest('[data-pa-source-status]');if(st){localStorage.setItem(`atom-source-status-${st.dataset.paSourceStatus}`,st.value);emit('source-status');renderPanel();return;}
    const db=e.target.closest('[data-pa-dict-base]');if(db){localStorage.setItem(`atom-dictionary-ready-${db.dataset.paDictBase}`,db.checked?'1':'0');emit('dictionary-ready');renderPanel();return;}
  });

  document.addEventListener('focusout',e=>{const t=e.target.closest('[data-pa-req-comment]');if(t){const row=t.closest('[data-pa-req]');core().setState(row.dataset.paReq,{comment:t.value});emit('requirement-comment');}});

  function ensureNav(){
    const sidebar=document.querySelector('.sidebar'),overview=sidebar?.querySelector('.nav[data-view="overview"]');if(!sidebar||!overview||document.getElementById('project-admin-nav'))return;
    const b=document.createElement('button');b.id='project-admin-nav';b.className='nav';b.type='button';b.textContent='Управление проектом';overview.insertAdjacentElement('afterend',b);
  }

  function render(){renderShell()}
  window.addEventListener('atom-sync-update',()=>{if(location.hash.startsWith('#management/'))renderPanel();});
  window.addEventListener('hashchange',()=>{const h=decodeURIComponent(location.hash.slice(1));if(h.startsWith('management')){const p=h.split('/')[1];if(['teams','requirements','stages','sources','dictionary','directories','settings'].includes(p))activeTab=p;renderShell();}});
  styles();ensureNav();setTimeout(()=>{ensureNav();const h=decodeURIComponent(location.hash.slice(1));if(h.startsWith('management')){const p=h.split('/')[1];if(p)activeTab=p;renderShell();}},650);
  window.ATOM_PROJECT_ADMIN={open:renderShell};
})();