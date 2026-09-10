(function(){
  const REQUIREMENTS={
    'Коммерческий блок':'Утвердить цель проекта и KPI; согласовать определения ключевых показателей; определить приоритеты и формат управленческой отчетности; принимать спорные бизнес-решения; провести финальную приемку BI-дашборда.',
    'B2B продажи':'Передать этапы B2B-воронки и правила переходов; перечень источников B2B-лидов; обязательные поля карточки лида; критерии квалификации; причины отказа и потери; правила назначения менеджера; примеры реальных кейсов для проверки данных; подтвердить корректность итоговых показателей.',
    'B2C продажи':'Передать этапы B2C-воронки и правила переходов; каналы поступления лидов; обязательные поля; критерии квалификации; причины отказа и потери; правила назначения менеджера; тестовые кейсы для сверки; подтвердить корректность B2C-метрик.',
    'Маркетинг':'Дать полный перечень рекламных каналов и кампаний; правила нейминга и UTM; источник расходов; детализацию затрат по каналу/кампании; правила атрибуции; календарь активностей; владельца данных; доступный способ автоматической выгрузки.',
    'Сайт':'Составить карту всех форм и точек входа лида; описать поля форм; события и dataLayer; правила передачи UTM/referrer; идентификатор отправки формы; соответствие полей сайту и ELMA; предоставить тестовый контур и технический способ передачи данных.',
    'Метрики':'Предоставить доступы к Яндекс Метрике и GA4; список целей и событий; параметры Client ID/User ID; UTM и рекламные измерения; правила настройки событий; API/экспорт в DWH; тестовую выборку для сверки; подтвердить полноту и корректность трекинга.',
    '1 линия':'Описать все каналы первичного обращения; категории и причины обращений; обязательные данные клиента; статусы обработки; SLA первого контакта; идентификатор обращения; в какой системе фиксируется результат; какие поля передаются дальше в ELMA.',
    '2 линия':'Описать правила квалификации лида; обязательные поля; результаты обработки; причины неквалификации/отказа; SLA; статусы; кто и когда переводит лид дальше; какие данные обязательны перед передачей в Альфа-Авто.',
    'ELMA':'Предоставить модель сущности Lead; полный перечень полей; Source/Channel/UTM; статусы и историю их изменения; даты и ответственного; Lead ID; правила дедупликации; API/webhook; правила и поля передачи квалифицированного лида в Альфа-Авто; доступ к тестовой выгрузке.',
    'Альфа-Авто':'Предоставить модель сделки; Deal ID и Client ID; правила связки с Lead ID ELMA; этапы сделки и историю статусов; менеджера; причины потерь; данные договора/заказа; дату продажи; API или регулярную выгрузку; тестовые сделки для сквозной сверки.',
    '1С / финансы':'Определить финансовый факт продажи; передать идентификаторы договора/заказа/сделки для связки; даты и суммы платежей; статусы оплаты; возвраты/отмены; Payment ID; правила сверки с Альфа-Авто; формат и периодичность автоматической выгрузки в DWH.',
    'DATA / DWH':'Согласовать архитектуру загрузки источников; ключи Lead ID/Client ID/Deal ID/Payment ID; целевую модель данных; правила хранения истории; расписание обновлений и SLA; проверки полноты и качества; обработку дублей и ошибок; доступы и витрины для BI.',
    'BI':'Согласовать список KPI и формулы; структуру страниц дашборда; фильтры и разрезы; права просмотра; источник каждой метрики; периодичность обновления; контроль расхождений; сценарий приемочного тестирования с бизнесом; финальный рабочий дашборд.',
    'ИБ':'Проверить архитектуру и поток данных; классифицировать данные; определить допустимый состав данных в TEST и PROD; требования к аутентификации и ролям; RLS и права доступа; хранение секретов; аудит и логирование; сроки хранения и удаления; согласовать требования для допуска production.'
  };

  function ensureStyles(){
    if(document.getElementById('raci-requirements-css'))return;
    const s=document.createElement('style');
    s.id='raci-requirements-css';
    s.textContent=`
      .raci-needs-cell{min-width:300px;max-width:520px;line-height:1.45;color:#425959;font-size:11px}
      .raci-needs-cell b{color:#102526}
      .raci-needs-text{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
      .raci-needs-text.open{display:block;overflow:visible}
      .raci-needs-toggle{border:0;background:transparent;color:#0f6962;padding:4px 0 0;cursor:pointer;font:inherit;font-size:10px;font-weight:700}
      .raci-needs-head{min-width:300px}
    `;
    document.head.appendChild(s);
  }

  function inject(){
    const title=[...app.querySelectorAll('.section-title h2')].find(x=>x.textContent.trim()==='Команды и RACI');
    if(!title)return;
    const table=title.closest('.section-title')?.parentElement?.querySelector('table.table');
    if(!table||table.dataset.needsInjected==='1')return;
    const hr=table.querySelector('thead tr');
    if(!hr)return;
    const th=document.createElement('th');
    th.className='raci-needs-head';
    th.textContent='Что нужно от команды';
    const ownerHead=hr.children[3];
    if(ownerHead)hr.insertBefore(th,ownerHead);else hr.appendChild(th);

    table.querySelectorAll('tbody tr').forEach(tr=>{
      const team=tr.children[0]?.textContent.trim()||'';
      const need=REQUIREMENTS[team]||'Уточнить конкретный результат, владельца данных, доступы и срок предоставления.';
      const td=document.createElement('td');
      td.className='raci-needs-cell';
      td.innerHTML=`<div class="raci-needs-text">${need}</div><button type="button" class="raci-needs-toggle">Открыть полностью</button>`;
      const owner=tr.children[3];
      if(owner)tr.insertBefore(td,owner);else tr.appendChild(td);
    });
    table.dataset.needsInjected='1';
  }

  document.addEventListener('click',e=>{
    const btn=e.target.closest('.raci-needs-toggle');
    if(!btn)return;
    const text=btn.previousElementSibling;
    const isOpen=text?.classList.toggle('open');
    btn.textContent=isOpen?'Свернуть':'Открыть полностью';
  });

  let queued=false;
  const observer=new MutationObserver(()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;inject();});
  });
  observer.observe(app,{childList:true,subtree:true});
  ensureStyles();
  inject();
  window.ATOM_RACI_REQUIREMENTS={inject};
})();