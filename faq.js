(function(){
  const FAQ_ITEMS = [
    ['Что это за проект?','Это единый проект по сбору, контролю и визуализации коммерческих данных АТОМ от первого обращения клиента до продажи и оплаты.'],
    ['Главная цель проекта?','Создать единый рабочий сквозной дашборд, который показывает весь путь клиента и позволяет коммерческому блоку принимать решения на основе одних и тех же данных.'],
    ['Кто владелец проекта?','Коммерческий блок. Ответственность за сборку коммерческой аналитики находится у руководителя проекта.'],
    ['Какие основные системы участвуют?','Сайт, Яндекс Метрика, GA4, телефония, 1 и 2 линия поддержки, ELMA, Альфа-Авто, 1С, DWH и BI.'],
    ['Где начинается путь лида?','Лид может прийти с сайта, рекламы, звонка, поддержки, ручного ввода менеджером или другого коммерческого канала.'],
    ['Что происходит с лидом в ELMA?','В ELMA создается Lead, фиксируется источник, контактные данные, проводится квалификация и назначается ответственный.'],
    ['Когда лид попадает в Альфа-Авто?','После квалификации в ELMA лид передается в Альфа-Авто, где проходит основную воронку сделки.'],
    ['Что хранится в Альфа-Авто?','Сделка, этап продажи, менеджер, статус, автомобиль, коммерческие параметры и результат сделки.'],
    ['Зачем нужна 1С?','1С дает финансовый факт: оплаты, поступления, договоры и другие финансовые показатели.'],
    ['Что такое сквозная аналитика в этом проекте?','Это возможность связать источник обращения, Lead ID, Client ID, Deal ID и оплату в одну цепочку.'],
    ['Какие ID являются ключевыми?','Lead ID, Client ID, Deal ID и Payment ID.'],
    ['Зачем нужен Data Dictionary?','Чтобы все команды одинаково понимали названия полей, их смысл, формат, источник и правила заполнения.'],
    ['Что такое RACI?','Это распределение ролей между командами: кто делает, кто отвечает, кого консультируют и кого информируют.'],
    ['Какие команды должны участвовать в проекте?','Коммерческий блок, B2B, B2C, маркетинг, сайт, метрики, поддержка, ELMA, Альфа-Авто, 1С, DATA/DWH, BI и ИБ.'],
    ['Что показывает главная страница проекта?','Общую готовность проекта, готовность источников, назначение ответственных, блокеры, завершенные этапы и текущие задачи.'],
    ['Как считается готовность проекта?','На основании статусов ключевых этапов проекта и фактически закрытых работ.'],
    ['Для чего нужна диаграмма Ганта?','Она показывает этапы проекта, плановые сроки, текущий статус и возможные просрочки.'],
    ['Можно ли менять сроки в Ганте?','Да. В тестовой версии можно менять срок любого этапа после старта проекта.'],
    ['Как отличить первоначальный срок от продленного?','Базовый срок сохраняется отдельно. Если срок увеличен, появляется отметка «ПРОДЛЕН», количество добавленных дней и отдельный штрихованный сегмент на диаграмме.'],
    ['Нужно ли указывать причину продления?','Да. Для продления срока причина обязательна.'],
    ['Что происходит при просрочке этапа?','Просроченный этап становится блокером и отдельно отображается в проекте.'],
    ['Что такое блокер?','Это проблема, которая мешает завершить этап проекта в срок.'],
    ['Что должно быть указано у блокера?','Проблема, источник или этап, критичность, ответственный, срок решения, статус и комментарий.'],
    ['Что означает Definition of Done?','Это список условий, после выполнения которых проект можно считать завершенным.'],
    ['Когда проект можно считать завершенным?','Когда определены все источники, назначены владельцы, настроены интеграции, данные собираются в DWH, работает BI-дашборд и коммерческий директор принял результат.'],
    ['Можно ли работать с проектом с разных компьютеров?','Да. Тестовая версия подключена к облачному хранилищу Supabase и синхронизирует состояние проекта между устройствами.'],
    ['Как быстро появляются изменения на другом устройстве?','Изменения сохраняются в облако, а открытые страницы периодически подтягивают актуальное состояние. Обычно дополнительное ручное обновление не требуется.'],
    ['Где сейчас ведется разработка?','Все новые изменения тестируются в commercial-analytic-test.'],
    ['Что такое production-версия?','commercial-analytics является основной рабочей версией. Новые функции сначала проверяются в тестовой версии.'],
    ['Зачем нужна отдельная тестовая версия?','Чтобы проверять новые функции, синхронизацию и изменения логики без риска повредить основную рабочую версию.'],
    ['Какая конечная польза для коммерческого директора?','Один контур контроля, где видно, откуда приходят клиенты, где они теряются, что происходит с продажами, какие есть проблемы и какие действия нужны от команд.']
  ];

  function esc(s){
    return String(s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m];});
  }

  function ensureStyles(){
    if(document.getElementById('faq-styles')) return;
    const style=document.createElement('style');
    style.id='faq-styles';
    style.textContent=`
      .faq-toolbar{display:flex;gap:10px;align-items:center;margin:0 0 14px;flex-wrap:wrap}
      .faq-search{width:min(520px,100%);padding:11px 12px;border:1px solid var(--line);border-radius:10px;font:inherit;background:#fff;color:var(--text)}
      .faq-count{font-size:12px;color:var(--muted)}
      .faq-list{display:grid;gap:9px}
      .faq-item{background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden}
      .faq-item summary{cursor:pointer;padding:14px 16px;font-weight:700;list-style:none;display:flex;justify-content:space-between;gap:16px;align-items:center}
      .faq-item summary::-webkit-details-marker{display:none}
      .faq-item summary:after{content:'+';font-size:20px;color:var(--accent-dark);font-weight:400}
      .faq-item[open] summary:after{content:'−'}
      .faq-answer{padding:0 16px 15px;color:#425959;line-height:1.5;font-size:14px}
      .faq-empty{background:#fff;border:1px solid var(--line);border-radius:12px;padding:18px;color:var(--muted)}
    `;
    document.head.appendChild(style);
  }

  function renderFaq(filter){
    ensureStyles();
    const term=String(filter||'').trim().toLowerCase();
    const rows=FAQ_ITEMS.filter(function(item){
      return !term || item[0].toLowerCase().includes(term) || item[1].toLowerCase().includes(term);
    });
    app.innerHTML=`
      <div class="section-title"><h2>Вопросы и ответы</h2><small>Справка по проекту коммерческой аналитики</small></div>
      <div class="callout"><b>FAQ проекта.</b> Здесь собраны основные ответы по целям, системам, Ганту, RACI, блокерам и синхронизации.</div>
      <div class="faq-toolbar">
        <input id="faq-search" class="faq-search" type="search" placeholder="Найти вопрос или ответ" value="${esc(filter||'')}">
        <span id="faq-count" class="faq-count">Найдено: ${rows.length}</span>
      </div>
      <div class="faq-list">
        ${rows.length ? rows.map(function(item,i){return `<details class="faq-item"><summary>${i+1}. ${esc(item[0])}</summary><div class="faq-answer">${esc(item[1])}</div></details>`;}).join('') : '<div class="faq-empty">Ничего не найдено.</div>'}
      </div>`;
    const input=document.getElementById('faq-search');
    if(input){
      input.addEventListener('input',function(){
        const value=input.value;
        renderFaq(value);
        const next=document.getElementById('faq-search');
        if(next){next.focus();next.setSelectionRange(value.length,value.length);}
      });
    }
  }

  function ensureButton(){
    const sidebar=document.querySelector('.sidebar');
    if(!sidebar || document.getElementById('faq-nav')) return;
    const btn=document.createElement('button');
    btn.id='faq-nav';
    btn.type='button';
    btn.className='nav';
    btn.textContent='Вопросы и ответы';
    btn.addEventListener('click',function(){
      document.querySelectorAll('.nav').forEach(function(x){x.classList.remove('active');});
      btn.classList.add('active');
      renderFaq('');
    });
    sidebar.appendChild(btn);
  }

  window.ATOM_FAQ={open:function(){renderFaq('');}};
  ensureButton();
})();