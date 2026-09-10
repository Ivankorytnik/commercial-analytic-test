(function(){
  const STATE_KEY='atom-raci-requirement-state-v2';
  const CUSTOM_KEY='atom-raci-custom-requirements-v2';
  const STATUSES=['Не запрошено','Запрос подготовлен','Запрос отправлен','В работе','Ответ получен','Требует уточнения','Блокер','Готово'];
  const STATUS_PROGRESS={'Не запрошено':0,'Запрос подготовлен':10,'Запрос отправлен':25,'В работе':50,'Ответ получен':75,'Требует уточнения':60,'Блокер':50,'Готово':100};
  let currentTeam='';

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

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'')||fallback}catch{return fallback}};
  const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const today=()=>{const d=new Date(),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`};
  const basePoints=team=>(REQUIREMENTS[team]||'Уточнить конкретный результат от команды').split(';').map((x,i)=>({id:`base-${i+1}`,text:x.trim(),custom:false}));

  function customMap(){return read(CUSTOM_KEY,{})}
  function stateMap(){return read(STATE_KEY,{})}
  function points(team){return [...basePoints(team),...((customMap()[team]||[]).map(x=>({...x,custom:true})))]}
  function itemState(team,id){const all=stateMap();return {...{status:'Не запрошено',requestDate:'',dueDate:'',responseDate:'',respondent:'',comment:''},...(all[team]?.[id]||{})}}
  function saveItem(team,id,patch){const all=stateMap();all[team]=all[team]||{};all[team][id]={...itemState(team,id),...patch};write(STATE_KEY,all)}
  function isDone(s){return s.status==='Готово'}
  function isOverdue(s){return Boolean(s.dueDate)&&!isDone(s)&&s.dueDate<today()}
  function pct(team){const list=points(team);if(!list.length)return 0;return Math.round(list.reduce((sum,p)=>sum+(STATUS_PROGRESS[itemState(team,p.id).status]||0),0)/list.length)}

  function responsibleList(){
    let out=[];
    try{if(typeof RESPONSIBLES!=='undefined'&&Array.isArray(RESPONSIBLES))out=[...RESPONSIBLES]}catch{}
    try{const refs=JSON.parse(localStorage.getItem('atom-reference-data-v1')||'{}');if(Array.isArray(refs.responsibles))out.push(...refs.responsibles)}catch{}
    return [...new Set(out.filter(x=>x&&x!=='Не назначен'))];
  }

  function ensureStyles(){
    if(document.getElementById('raci-requirements-css'))return;
    const s=document.createElement('style');s.id='raci-requirements-css';s.textContent=`
      .raci-needs-cell{min-width:245px;max-width:340px;line-height:1.4;color:#425959;font-size:11px}.raci-needs-head{min-width:245px}
      .raci-needs-summary{display:flex;align-items:center;justify-content:space-between;gap:8px}.raci-needs-summary b{font-size:11px;color:#102526}.raci-needs-summary span{font-size:10px;color:var(--muted)}
      .raci-open-team{margin-top:7px;border:1px solid #9edfd7;background:#eefcfa;color:#0f6962;border-radius:7px;padding:6px 9px;font:inherit;font-size:10px;font-weight:700;cursor:pointer}.raci-open-team:hover{background:#dff9f5}
      .raci-detail-page{display:grid;gap:14px}.raci-detail-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-end;flex-wrap:wrap}.raci-detail-title h2{margin:0 0 4px;font-size:22px}.raci-detail-title p{margin:0;color:var(--muted);font-size:12px}.raci-detail-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.raci-detail-actions select{padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:#fff;font:inherit;font-size:12px}
      .raci-team-meta{display:grid;grid-template-columns:110px minmax(220px,1fr);gap:10px;background:#102526;color:#fff;border-radius:13px;padding:14px 16px}.raci-team-meta .meta-label{font-size:10px;color:#9fb6b7;text-transform:uppercase;letter-spacing:.45px}.raci-team-meta b{font-size:13px}.raci-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.raci-kpi{background:#fff;border:1px solid var(--line);border-radius:11px;padding:11px 12px}.raci-kpi span{display:block;font-size:10px;color:var(--muted);margin-bottom:5px}.raci-kpi b{font-size:21px}.raci-kpi .progress{margin-top:6px}
      .raci-detail-wrap{overflow:auto;background:#fff;border:1px solid var(--line);border-radius:12px}.raci-detail-table{width:100%;min-width:1260px;border-collapse:collapse}.raci-detail-table th,.raci-detail-table td{padding:9px 9px;border-bottom:1px solid var(--line);border-right:1px solid #edf1f1;vertical-align:top;text-align:left;font-size:11px}.raci-detail-table th{position:sticky;top:0;background:#edf3f3;color:#425959;z-index:2;font-size:10px}.raci-detail-table tr:last-child td{border-bottom:0}.raci-detail-table tr.overdue{background:#fff7f3}.raci-req-text{min-width:290px;line-height:1.45}.raci-req-num{display:inline-flex;width:22px;height:22px;border-radius:6px;background:#eef5f4;align-items:center;justify-content:center;margin-right:7px;color:#0f6962;font-weight:700}.raci-detail-table select,.raci-detail-table input,.raci-detail-table textarea{width:100%;box-sizing:border-box;border:1px solid #ccd9d9;border-radius:7px;padding:7px 8px;font:inherit;font-size:11px;background:#fff;color:var(--text)}.raci-detail-table textarea{min-height:52px;resize:vertical}.raci-detail-table input[type=date]{min-width:130px}.raci-status{min-width:150px}.raci-person{min-width:155px}.raci-comment{min-width:190px}.raci-date{min-width:135px}.raci-custom-delete{border:0;background:transparent;color:#a53636;cursor:pointer;font:inherit;font-size:10px;padding:5px}.raci-overdue-note{display:block;margin-top:5px;color:#a53636;font-size:9px;font-weight:700}
      .raci-add-point{background:#fff;border:1px solid var(--line);border-radius:11px;padding:12px;display:flex;gap:8px;align-items:center}.raci-add-point input{flex:1;min-width:220px;border:1px solid var(--line);border-radius:8px;padding:9px 10px;font:inherit;font-size:12px}
      @media(max-width:1000px){.raci-kpis{grid-template-columns:repeat(2,1fr)}.raci-team-meta{grid-template-columns:1fr}.raci-detail-top{align-items:flex-start}}
    `;document.head.appendChild(s);
  }

  function statusOptions(selected){return STATUSES.map(x=>`<option ${x===selected?'selected':''}>${x}</option>`).join('')}
  function teamOptions(team){return Object.keys(REQUIREMENTS).map(x=>`<option value="${esc(x)}" ${x===team?'selected':''}>${esc(x)}</option>`).join('')}
  function respondentList(){return responsibleList().map(x=>`<option value="${esc(x)}"></option>`).join('')}

  function summary(team){
    const list=points(team),states=list.map(p=>itemState(team,p.id));
    return {total:list.length,done:states.filter(isDone).length,work:states.filter(s=>['Запрос подготовлен','Запрос отправлен','В работе','Ответ получен','Требует уточнения'].includes(s.status)).length,blockers:states.filter(s=>s.status==='Блокер').length,overdue:states.filter(isOverdue).length,readiness:pct(team)};
  }

  function teamMeta(team){
    const row=(typeof DATA!=='undefined'&&Array.isArray(DATA?.teams))?DATA.teams.find(r=>r[0]===team):null;
    return {raci:row?.[1]||'',role:row?.[2]||''};
  }

  function renderDetail(team){
    currentTeam=team;
    document.querySelector('.content')?.classList.remove('gantt-content-focus');
    const list=points(team),sum=summary(team),meta=teamMeta(team);
    document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));
    document.querySelector('.nav[data-view="teams"]')?.classList.add('active');
    const rows=list.map((p,i)=>{
      const st=itemState(team,p.id),over=isOverdue(st);
      return `<tr class="${over?'overdue':''}" data-raci-item="${esc(p.id)}">
        <td class="raci-req-text"><span class="raci-req-num">${i+1}</span>${esc(p.text)}${over?'<span class="raci-overdue-note">Срок ответа просрочен</span>':''}${p.custom?`<br><button class="raci-custom-delete" data-delete-raci-item="${esc(p.id)}">Удалить пункт</button>`:''}</td>
        <td class="raci-status"><select data-raci-field="status" data-item-id="${esc(p.id)}">${statusOptions(st.status)}</select></td>
        <td class="raci-date"><input type="date" value="${esc(st.requestDate)}" data-raci-field="requestDate" data-item-id="${esc(p.id)}"></td>
        <td class="raci-date"><input type="date" value="${esc(st.dueDate)}" data-raci-field="dueDate" data-item-id="${esc(p.id)}"></td>
        <td class="raci-date"><input type="date" value="${esc(st.responseDate)}" data-raci-field="responseDate" data-item-id="${esc(p.id)}"></td>
        <td class="raci-person"><input list="raci-respondents" value="${esc(st.respondent)}" placeholder="ФИО" data-raci-field="respondent" data-item-id="${esc(p.id)}"></td>
        <td class="raci-comment"><textarea placeholder="Комментарий, ссылка, уточнение" data-raci-field="comment" data-item-id="${esc(p.id)}">${esc(st.comment)}</textarea></td>
      </tr>`;
    }).join('');

    app.innerHTML=`<div class="raci-detail-page">
      <div class="raci-detail-top">
        <div class="raci-detail-title"><h2>Что нужно от команды</h2><p>Подробный контроль запросов, ответов, сроков и ответственных</p></div>
        <div class="raci-detail-actions"><button class="btn" id="raci-back">Назад к RACI</button><select id="raci-team-switch">${teamOptions(team)}</select></div>
      </div>
      <div class="raci-team-meta"><div><div class="meta-label">Команда</div><b>${esc(team)}</b></div><div><div class="meta-label">Роль в проекте</div><b>${esc(meta.raci)} · ${esc(meta.role)}</b></div></div>
      <div class="raci-kpis">
        <div class="raci-kpi"><span>Готовность</span><b>${sum.readiness}%</b>${typeof progress==='function'?progress(sum.readiness):''}</div>
        <div class="raci-kpi"><span>Всего пунктов</span><b>${sum.total}</b></div>
        <div class="raci-kpi"><span>Готово</span><b>${sum.done}</b></div>
        <div class="raci-kpi"><span>В работе / ответ</span><b>${sum.work}</b></div>
        <div class="raci-kpi"><span>Просрочено</span><b>${sum.overdue}</b></div>
      </div>
      <div class="raci-detail-wrap"><table class="raci-detail-table"><thead><tr><th>Что нужно</th><th>Статус</th><th>Дата запроса</th><th>Срок ответа</th><th>Дата ответа</th><th>Ответственный за ответ</th><th>Комментарий</th></tr></thead><tbody>${rows}</tbody></table></div>
      <datalist id="raci-respondents">${respondentList()}</datalist>
      <div class="raci-add-point"><input id="raci-new-point" placeholder="Добавить дополнительный пункт для команды ${esc(team)}"><button class="btn primary" id="raci-add-point">Добавить пункт</button></div>
    </div>`;
  }

  function inject(){
    const title=[...app.querySelectorAll('.section-title h2')].find(x=>x.textContent.trim()==='Команды и RACI');
    if(!title)return;
    const table=title.closest('.section-title')?.parentElement?.querySelector('table.table');
    if(!table||table.dataset.needsInjected==='1')return;
    const hr=table.querySelector('thead tr');if(!hr)return;
    const th=document.createElement('th');th.className='raci-needs-head';th.textContent='Что нужно от команды';
    const ownerHead=hr.children[3];if(ownerHead)hr.insertBefore(th,ownerHead);else hr.appendChild(th);
    table.querySelectorAll('tbody tr').forEach(tr=>{
      const team=tr.children[0]?.textContent.trim()||'',sum=summary(team);
      const td=document.createElement('td');td.className='raci-needs-cell';
      td.innerHTML=`<div class="raci-needs-summary"><div><b>${sum.done} / ${sum.total} готово</b><br><span>готовность ${sum.readiness}%${sum.overdue?` · просрочено ${sum.overdue}`:''}</span></div></div><button type="button" class="raci-open-team" data-team="${esc(team)}">Открыть подробную страницу</button>`;
      const owner=tr.children[3];if(owner)tr.insertBefore(td,owner);else tr.appendChild(td);
    });
    table.dataset.needsInjected='1';
  }

  function addCustom(team,text){
    const all=customMap();all[team]=all[team]||[];
    all[team].push({id:`custom-${Date.now().toString(36)}`,text:text.trim()});write(CUSTOM_KEY,all);
  }

  function deleteCustom(team,id){
    const all=customMap();all[team]=(all[team]||[]).filter(x=>x.id!==id);write(CUSTOM_KEY,all);
    const states=stateMap();if(states[team])delete states[team][id];write(STATE_KEY,states);
  }

  document.addEventListener('click',e=>{
    const openBtn=e.target.closest('.raci-open-team');
    if(openBtn){renderDetail(openBtn.dataset.team);return;}
    if(e.target.closest('#raci-back')){currentTeam='';render('teams');return;}
    if(e.target.closest('#raci-add-point')){const input=document.getElementById('raci-new-point'),text=input?.value.trim()||'';if(!text)return alert('Укажи, что нужно получить от команды');addCustom(currentTeam,text);renderDetail(currentTeam);return;}
    const del=e.target.closest('[data-delete-raci-item]');
    if(del){if(confirm('Удалить дополнительный пункт?')){deleteCustom(currentTeam,del.dataset.deleteRaciItem);renderDetail(currentTeam);}return;}
  });

  document.addEventListener('change',e=>{
    if(e.target.id==='raci-team-switch'){renderDetail(e.target.value);return;}
    const field=e.target.dataset.raciField,id=e.target.dataset.itemId;
    if(!field||!id||!currentTeam)return;
    const patch={[field]:e.target.value};
    if(field==='status'){
      const old=itemState(currentTeam,id);
      if(e.target.value==='Запрос отправлен'&&!old.requestDate)patch.requestDate=today();
      if(['Ответ получен','Готово'].includes(e.target.value)&&!old.responseDate)patch.responseDate=today();
    }
    saveItem(currentTeam,id,patch);renderDetail(currentTeam);
  });

  let queued=false;
  const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;inject();});});
  observer.observe(app,{childList:true,subtree:true});
  window.addEventListener('atom-sync-update',()=>{if(currentTeam)renderDetail(currentTeam);else inject();});
  ensureStyles();inject();
  window.ATOM_RACI_REQUIREMENTS={inject,open:renderDetail};
})();