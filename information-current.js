(function(){
  const VERSION='1.0.0';
  const SOURCE_MAP={
    'Сайт':['Сайт'],'Яндекс Метрика':['Метрики'],'GA4':['Метрики'],'Телефония':['1 линия','2 линия'],
    '1 линия':['1 линия'],'2 линия':['2 линия'],'ELMA':['ELMA'],'Альфа-Авто':['Альфа-Авто'],
    '1С':['1С / финансы'],'Маркетинг':['Маркетинг'],'DATA / DWH':['DATA / DWH'],'BI':['BI'],'B2B ручные лиды':['B2B продажи']
  };

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const core=()=>window.ATOM_CORE;
  const activity=()=>window.ATOM_TEAM_ACTIVITY;
  function data(){try{if(typeof DATA!=='undefined'&&DATA)return DATA;}catch{}return window.DATA||null;}
  function activeTeamNames(){
    const all=core()?.teams?.()||(data()?.teams||[]).map(x=>x[0]);
    return all.filter(t=>activity()?.isActive?activity().isActive(t):core()?.isTeamActive?core().isTeamActive(t):true);
  }
  function activeSourceNames(){
    const rows=data()?.sources_list||[];
    return rows.filter((r,i)=>{
      if(window.ATOM_SOURCE_TEAM_SYNC?.baseActive)return window.ATOM_SOURCE_TEAM_SYNC.baseActive(i);
      const linked=SOURCE_MAP[r[0]]||[];
      return linked.some(t=>activity()?.isActive?activity().isActive(t):true);
    }).map(r=>r[0]);
  }
  function sourceSummary(){
    try{return core()?.sourcesSummary?.()||{total:activeSourceNames().length,allTotal:(data()?.sources_list||[]).length};}catch{return{total:0,allTotal:0};}
  }

  function ensureStyles(){
    if(document.getElementById('information-current-css'))return;
    const s=document.createElement('style');s.id='information-current-css';s.textContent=`
      .info-hero{background:#102526;color:#fff;border-radius:15px;padding:18px 20px;border:1px solid #284748;margin-bottom:13px}.info-hero h2{margin:0 0 6px;font-size:22px}.info-hero p{margin:0;color:#bed0d0;line-height:1.5;font-size:12px}.info-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:12px 0}.info-kpi{background:#fff;border:1px solid var(--line);border-radius:11px;padding:11px}.info-kpi span{display:block;color:var(--muted);font-size:9px}.info-kpi b{display:block;margin-top:3px;font-size:18px}.info-flow{display:flex;gap:7px;align-items:center;flex-wrap:wrap;background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px}.info-flow-node{padding:9px 10px;border-radius:8px;background:#eef7f6;border:1px solid #d0e5e2;font-size:10px;font-weight:700;color:#294647}.info-flow-arrow{color:#2e9188;font-weight:700}.info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px}.info-card{background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px}.info-card h3{margin:0 0 8px;font-size:14px}.info-list{display:grid;gap:7px;font-size:11px;line-height:1.45;color:#425959}.info-tag-row{display:flex;gap:5px;flex-wrap:wrap}.info-tag{display:inline-flex;padding:4px 7px;border-radius:999px;background:#eef5f4;color:#3e5f60;font-size:9px;font-weight:700}.info-note{margin-top:10px;padding:10px 12px;border-left:3px solid var(--accent);border-radius:8px;background:#eefcfa;color:#315253;font-size:10px;line-height:1.5}
      .faq-current-toolbar{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin:0 0 12px}.faq-current-search{width:min(520px,100%);padding:10px 11px;border:1px solid var(--line);border-radius:9px;font:inherit}.faq-current-list{display:grid;gap:8px}.faq-current-item{background:#fff;border:1px solid var(--line);border-radius:11px;overflow:hidden}.faq-current-item summary{cursor:pointer;padding:13px 14px;font-weight:700;list-style:none;display:flex;justify-content:space-between;gap:10px}.faq-current-item summary::-webkit-details-marker{display:none}.faq-current-item summary:after{content:'+';font-size:18px;color:var(--accent-dark)}.faq-current-item[open] summary:after{content:'−'}.faq-current-answer{padding:0 14px 14px;color:#425959;line-height:1.5;font-size:12px}
      .ib-current{display:grid;gap:12px}.ib-current-hero{background:#102526;color:#fff;border-radius:15px;padding:19px 21px;border:1px solid #284748}.ib-current-hero h2{margin:0 0 6px;font-size:23px}.ib-current-hero p{margin:0;color:#bdd0d0;font-size:12px;line-height:1.5}.ib-current-badge{display:inline-flex;margin-top:11px;padding:5px 8px;border-radius:999px;background:#314d4e;color:#e7f3f2;font-size:9px;font-weight:700}.ib-current-flow{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-top:13px}.ib-current-node{padding:8px 10px;border-radius:8px;background:#173233;border:1px solid #355556;font-size:10px}.ib-current-arrow{color:#72ded4}.ib-current-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.ib-current-card{background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px}.ib-current-card h3{margin:0 0 8px;font-size:14px}.ib-current-list{display:grid;gap:7px;color:#425959;font-size:11px;line-height:1.45}.ib-current-list b{color:#183536}.ib-current-warn{padding:11px 13px;border-radius:9px;background:#fff6df;border:1px solid #ead28f;color:#6b5310;font-size:11px;line-height:1.5}.ib-current-table{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--line);border-radius:11px;overflow:hidden}.ib-current-table th,.ib-current-table td{padding:9px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top;font-size:10px}.ib-current-table th{background:#f1f6f6;color:#425959}.ib-current-table tr:last-child td{border-bottom:0}.ib-state{display:inline-flex;padding:4px 6px;border-radius:999px;font-size:9px;font-weight:700}.ib-state.ok{background:#e5f7ef;color:#227457}.ib-state.warn{background:#fff4d7;color:#946a00}.ib-state.bad{background:#fdeaea;color:#a53636}
      @media(max-width:850px){.info-kpis,.info-grid,.ib-current-grid{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function renderFunnel(){
    ensureStyles();
    const teams=activeTeamNames(),sources=activeSourceNames(),sum=sourceSummary();
    return `<div class="info-hero"><h2>Сквозной путь коммерческих данных</h2><p>Актуальная логика проекта: от активного источника лида до управленческого BI. Состав контура определяется активностью команд в «Управление проектом → Команды».</p></div>
      <div class="info-kpis"><div class="info-kpi"><span>Активные команды</span><b>${teams.length}</b></div><div class="info-kpi"><span>Источники в расчёте</span><b>${sum.total??sources.length} / ${sum.allTotal??(data()?.sources_list||[]).length}</b></div><div class="info-kpi"><span>Ключевые идентификаторы</span><b>4</b></div></div>
      <div class="info-flow">
        ${['Активный источник','Первичный контакт','ELMA · Lead','Квалификация','Альфа-Авто · Deal','Договор / продажа','1С · финансовый факт','DWH','BI'].map((x,i)=>`${i?'<span class="info-flow-arrow">→</span>':''}<span class="info-flow-node">${esc(x)}</span>`).join('')}
      </div>
      <div class="info-grid">
        <div class="info-card"><h3>Какие источники участвуют сейчас</h3><div class="info-tag-row">${sources.length?sources.map(x=>`<span class="info-tag">${esc(x)}</span>`).join(''):'<span class="info-tag">Нет активных источников</span>'}</div><div class="info-note">Источник считается активным только если связанная с ним команда активна. Отключение команды не удаляет источник и его историю, а исключает его из расчёта готовности.</div></div>
        <div class="info-card"><h3>Как связывается путь клиента</h3><div class="info-list"><div><b>Lead ID</b> связывает поступивший лид и работу в ELMA.</div><div><b>Client ID</b> нужен для идентификации клиента между системами.</div><div><b>Deal ID</b> связывает лид со сделкой в Альфа-Авто.</div><div><b>Payment ID</b> связывает сделку с финансовым фактом.</div></div></div>
        <div class="info-card"><h3>Что является источником истины</h3><div class="info-list"><div><b>Команды:</b> активность задаётся только в «Управление проектом → Команды».</div><div><b>Источники:</b> автоматически наследуют активность связанных команд.</div><div><b>Требования:</b> «Что нужно» ведутся по активным командам, с ответственным, статусом и индивидуальным периодом.</div><div><b>Готовность:</b> рассчитывается только по актуальному активному контуру.</div></div></div>
        <div class="info-card"><h3>Что попадает в BI в финале</h3><div class="info-list"><div>Источник и канал обращения.</div><div>Временная последовательность движения клиента.</div><div>Статусы и причины потерь.</div><div>Менеджер и этап сделки.</div><div>Продажа и финансовый факт.</div><div>Сверенные KPI для коммерческого управления.</div></div></div>
      </div>`;
  }

  const FAQ=[
    ['Что это за проект?','Это система управления внедрением сквозной коммерческой аналитики АТОМ: команды, требования, источники, сроки, блокеры, Data Dictionary и контроль готовности до единого BI.'],
    ['Что является основной точкой управления?','Раздел «Управление проектом». Из него меняются команды, требования, сроки, источники, справочники и другие рабочие данные проекта.'],
    ['Какой раздел является главным для активности команд?','«Управление проектом → Команды». Только там определяется, участвует команда в текущем контуре или исключена из него.'],
    ['Что происходит, если команду сделать неактивной?','Её требования и связанные источники исключаются из актуального расчёта готовности и не должны создавать новые просрочки проекта. Данные при этом не удаляются.'],
    ['Как активность команд связана с источниками?','Базовые источники сопоставлены с командами. Источник входит в расчёт только когда хотя бы одна связанная команда активна.'],
    ['Что будет со статусом источника, если команду отключить?','Статус сохраняется. Источник помечается как исключённый из расчёта. Если команду снова активировать, источник возвращается с прежним статусом.'],
    ['Как считается готовность проекта?','По актуальным релевантным этапам и работам активного контура. Неактивные команды и исключённые источники не должны влиять на итоговый процент.'],
    ['Почему при загрузке больше не должен мигать другой процент?','Интерфейс ждёт готовности синхронизации активных источников и финальных правил прогресса, выполняет контрольный пересчёт и только после этого показывает процент.'],
    ['Что такое «Что нужно»?','Это конкретные результаты или данные, которые необходимо получить от команды для выполнения проекта. У каждого пункта есть этап, период, статус, ответственный и комментарий.'],
    ['Можно ли изменить период у уже созданного «Что нужно»?','Да. В существующей строке доступна корректировка даты начала и окончания. Индивидуальный период можно вернуть обратно к сроку этапа Ганта.'],
    ['Как индивидуальный период влияет на просрочку?','Для этого требования срок закрытия считается по индивидуальной дате. По ней пересчитываются дни до закрытия и признак просрочки.'],
    ['Что такое «Не актуально» и «В очереди»?','Это состояния, позволяющие временно исключить требование из актуальной логики без удаления истории.'],
    ['Что такое блокер?','Проблема, мешающая выполнить работу в срок. Блокеры могут создаваться вручную или появляться из статуса/просрочки требования и этапа.'],
    ['Что происходит с блокером после переноса срока?','Если после корректировки требование больше не просрочено и не имеет статуса «Блокер», связанный автоматический блокер закрывается логикой проекта.'],
    ['Как устроен сквозной путь?','Активный источник → первичный контакт → ELMA → квалификация → Альфа-Авто → договор/продажа → 1С → DWH → BI. Атрибуция и идентификаторы обеспечивают связку между системами.'],
    ['Какие ID ключевые?','Lead ID, Client ID, Deal ID и Payment ID. Они нужны для сквозной связки лида, клиента, сделки и оплаты.'],
    ['Зачем нужен Data Dictionary?','Чтобы команды одинаково понимали названия полей, смысл, формат, источник, обязательность и правила использования данных.'],
    ['Что такое RACI?','Распределение ответственности: R делает, A отвечает за результат, C консультирует, I информируется.'],
    ['Можно ли менять сроки этапов Ганта?','Да. После старта проекта срок этапа можно изменить с фиксацией причины, при этом базовый срок сохраняется.'],
    ['Можно ли работать с разных компьютеров?','Да. TEST использует облачную синхронизацию состояния проекта. Локальные изменения отправляются в облако, а открытые страницы периодически получают обновления.'],
    ['Что происходит при временной недоступности облака?','Локальная работа остаётся доступной. Несохранённые изменения ставятся в очередь и повторно отправляются после восстановления соединения.'],
    ['Что хранится в облачной синхронизации?','Состояние проекта: статусы, сроки, активность команд, справочники, требования, источники и другие ключи проекта. Это не хранилище сырых клиентских данных.'],
    ['Можно ли загружать ПДн и коммерческую тайну в TEST?','Нет. TEST предназначен для проектных метаданных и демонстрации. ПДн, договоры, финансовые реквизиты, секреты и чувствительные выгрузки нельзя размещать до согласования production-контура с ИБ.'],
    ['Где сейчас тестируются новые функции?','В commercial-analytic-test. Это текущий тестовый контур, в котором проверяются изменения логики до переноса в основную рабочую версию.'],
    ['Что получает коммерческий директор?','Единый управленческий контур: текущая готовность, активные команды и источники, обязательства команд, сроки, блокеры и путь данных до BI.']
  ];

  function renderFaq(filter=''){
    ensureStyles();
    const term=String(filter).trim().toLowerCase();
    const rows=FAQ.filter(x=>!term||x[0].toLowerCase().includes(term)||x[1].toLowerCase().includes(term));
    app.innerHTML=`<div class="section-title"><h2>Вопросы и ответы</h2><small>Актуальная справка по текущей логике TEST</small></div><div class="callout"><b>Версия справки синхронизирована с текущим контуром проекта.</b> Включены активные команды и источники, правила готовности, периоды требований, блокеры и облачная синхронизация.</div><div class="faq-current-toolbar"><input id="faq-current-search" class="faq-current-search" type="search" placeholder="Найти вопрос или ответ" value="${esc(filter)}"><span class="faq-count">Найдено: ${rows.length}</span></div><div class="faq-current-list">${rows.length?rows.map((x,i)=>`<details class="faq-current-item"><summary>${i+1}. ${esc(x[0])}</summary><div class="faq-current-answer">${esc(x[1])}</div></details>`).join(''):'<div class="callout">Ничего не найдено.</div>'}</div>`;
    const input=document.getElementById('faq-current-search');
    input?.addEventListener('input',()=>{const v=input.value;renderFaq(v);const n=document.getElementById('faq-current-search');n?.focus();n?.setSelectionRange(v.length,v.length);});
  }

  function renderSecurity(){
    ensureStyles();
    app.innerHTML=`<div class="ib-current">
      <div class="ib-current-hero"><h2>Информационная безопасность</h2><p>Актуальное описание TEST-контура коммерческой аналитики. Главный принцип: TEST хранит и синхронизирует состояние проекта, а не реальные клиентские выгрузки или production-данные.</p><span class="ib-current-badge">TEST · CLOUD SYNC · НЕ PRODUCTION</span><div class="ib-current-flow"><span class="ib-current-node">Браузер</span><span class="ib-current-arrow">→</span><span class="ib-current-node">GitHub Pages</span><span class="ib-current-arrow">→</span><span class="ib-current-node">Supabase Edge Function</span><span class="ib-current-arrow">→</span><span class="ib-current-node">Supabase PostgreSQL</span></div></div>
      <div class="ib-current-warn"><b>Ключевое ограничение:</b> в текущем TEST нет корпоративной аутентификации пользователя и полноценной ролевой авторизации. Поэтому этот контур нельзя использовать для ПДн клиентов, договоров, финансовых реквизитов, секретов, токенов, production-выгрузок и иной чувствительной информации.</div>
      <div class="ib-current-grid">
        <div class="ib-current-card"><h3>Что сейчас синхронизируется</h3><div class="ib-current-list"><div>Активность команд и состав актуального контура.</div><div>Статусы и привязка источников данных.</div><div>Требования «Что нужно», ответственные, комментарии и индивидуальные периоды.</div><div>Сроки этапов, блокеры, справочники и другие проектные настройки.</div><div><b>Не является целью TEST:</b> хранение сырых лидов, телефонов клиентов, договоров или платежных данных.</div></div></div>
        <div class="ib-current-card"><h3>Поведение синхронизации</h3><div class="ib-current-list"><div>Изменения `atom-*` сохраняются локально и ставятся в очередь отправки в облако.</div><div>Открытая страница периодически получает актуальное состояние из облака.</div><div>При временной ошибке облака локальная работа сохраняется, отправка повторяется позже.</div><div>Проект ждёт финального состояния ключевой логики перед отображением итогового процента готовности.</div></div></div>
      </div>
      <table class="ib-current-table"><thead><tr><th>Контроль</th><th>TEST сейчас</th><th>Требование к production</th></tr></thead><tbody>
        <tr><td>Размещение клиентской части</td><td><span class="ib-state warn">TEST</span> GitHub Pages</td><td>Согласованный корпоративный контур размещения.</td></tr>
        <tr><td>Доступ к облаку</td><td><span class="ib-state warn">Через API</span> Клиент обращается к Edge Function.</td><td>Аутентификация пользователя, проверка токена и минимальные права.</td></tr>
        <tr><td>Аутентификация</td><td><span class="ib-state bad">Нет</span></td><td>Корпоративный SSO / утвержденный механизм входа.</td></tr>
        <tr><td>Ролевая модель</td><td><span class="ib-state bad">Не production</span></td><td>Владелец, редактор, просмотр, ИБ/аудитор с серверным контролем прав.</td></tr>
        <tr><td>Данные</td><td><span class="ib-state ok">Проектные метаданные</span></td><td>Классификация данных и отдельное согласование для ПДн/КТ.</td></tr>
        <tr><td>Журналирование</td><td><span class="ib-state warn">Частично</span></td><td>Централизованный аудит: пользователь, объект, действие, время, старое/новое значение.</td></tr>
        <tr><td>Секреты</td><td><span class="ib-state ok">Не должны храниться в UI</span></td><td>Корпоративное хранилище секретов и регламент ротации.</td></tr>
        <tr><td>Резервирование и хранение</td><td><span class="ib-state warn">Не формализовано</span></td><td>Сроки хранения, резервирование, восстановление и контролируемое удаление.</td></tr>
      </tbody></table>
      <div class="ib-current-grid"><div class="ib-current-card"><h3>Что допустимо в TEST</h3><div class="ib-current-list"><div>Названия команд, систем и источников.</div><div>Статусы проекта, сроки, RACI и обезличенные требования.</div><div>Data Dictionary без реальных клиентских значений.</div><div>Обезличенные блокеры и рабочие комментарии без чувствительных деталей.</div></div></div><div class="ib-current-card"><h3>Что нельзя размещать</h3><div class="ib-current-list"><div><b>ПДн клиентов:</b> телефоны, email, паспортные данные и другие идентификаторы.</div><div><b>Секреты:</b> пароли, токены, API-ключи и credentials.</div><div><b>Бизнес-чувствительные данные:</b> договоры, финансовые реквизиты, реальные выгрузки продаж и платежей.</div><div><b>Production-данные:</b> до отдельного решения ИБ и владельцев систем.</div></div></div></div>
      <div class="info-note"><b>Перед production:</b> согласовать архитектуру с ИБ, внедрить SSO/JWT, серверную ролевую модель, аудит, классификацию данных, политики хранения/удаления, резервирование и правила работы с ПДн и коммерческой тайной.</div>
    </div>`;
  }

  function activate(btn,render){
    document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    document.querySelector('.content')?.classList.remove('gantt-content-focus');
    render();
  }

  function replaceNav(id,label,render){
    const old=document.getElementById(id);if(!old)return;
    const btn=old.cloneNode(true);btn.textContent=label;old.replaceWith(btn);btn.addEventListener('click',()=>activate(btn,render));
  }

  function install(){
    ensureStyles();
    try{window.funnel=renderFunnel;}catch{}
    replaceNav('faq-nav','Вопросы и ответы',()=>renderFaq(''));
    replaceNav('security-nav','ИБ',renderSecurity);
    window.ATOM_INFORMATION_CURRENT={version:VERSION,renderFunnel,renderFaq,renderSecurity};
  }

  setTimeout(install,0);
})();