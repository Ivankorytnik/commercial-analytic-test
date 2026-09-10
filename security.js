(function(){
  function ensureStyles(){
    if(document.getElementById('security-css')) return;
    const s=document.createElement('style');
    s.id='security-css';
    s.textContent=`
      .ib-page{display:grid;gap:14px}
      .ib-hero{background:#102526;color:#fff;border-radius:16px;padding:20px 22px;border:1px solid #284748}
      .ib-hero-top{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap}
      .ib-hero h2{margin:0 0 7px;font-size:24px}.ib-hero p{margin:0;color:#bdd0d0;max-width:900px;line-height:1.5}
      .ib-status{display:inline-flex;align-items:center;gap:7px;padding:7px 10px;border-radius:999px;background:#2b4a4b;border:1px solid #49696a;font-size:11px;font-weight:700}
      .ib-dot{width:8px;height:8px;border-radius:50%;background:#f3b63a}
      .ib-flow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:16px}
      .ib-node{padding:9px 11px;border-radius:9px;background:#173233;border:1px solid #355556;font-size:11px}.ib-arrow{color:#6fded3;font-size:16px}
      .ib-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .ib-card{background:#fff;border:1px solid var(--line);border-radius:13px;padding:16px}
      .ib-card h3{margin:0 0 10px;font-size:15px}.ib-card p{margin:0;color:#53696a;font-size:12px;line-height:1.5}
      .ib-list{display:grid;gap:8px;margin-top:8px}.ib-item{display:grid;grid-template-columns:18px 1fr;gap:8px;align-items:flex-start;font-size:12px;line-height:1.45;color:#425959}
      .ib-mark{width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700}
      .ib-ok{background:#e5f7ef;color:#227457}.ib-warn{background:#fff4d7;color:#946a00}.ib-bad{background:#fdeaea;color:#a53636}
      .ib-table{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden}
      .ib-table th,.ib-table td{padding:10px 11px;border-bottom:1px solid var(--line);text-align:left;font-size:11px;vertical-align:top}.ib-table th{background:#f1f6f6;color:#425959}.ib-table tr:last-child td{border-bottom:0}
      .ib-pill{display:inline-block;padding:4px 7px;border-radius:999px;font-size:10px;font-weight:700;white-space:nowrap}.ib-pill.ok{background:#e5f7ef;color:#227457}.ib-pill.warn{background:#fff4d7;color:#946a00}.ib-pill.bad{background:#fdeaea;color:#a53636}
      .ib-summary{background:#eefcfa;border-left:4px solid var(--accent);border-radius:9px;padding:14px 16px;font-size:12px;line-height:1.55;color:#294343}
      .ib-summary b{color:#102526}.ib-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
      .ib-warning{background:#fff8e8;border:1px solid #f0d58f;border-radius:10px;padding:12px 14px;color:#6e550f;font-size:12px;line-height:1.5}
      @media(max-width:900px){.ib-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function open(){
    ensureStyles();
    app.innerHTML=`
      <div class="ib-page">
        <div class="ib-hero">
          <div class="ib-hero-top">
            <div>
              <h2>Информационная безопасность</h2>
              <p>Архитектура тестового контура коммерческой аналитики и базовые меры защиты. Раздел предназначен для предварительного обсуждения с ИБ.</p>
            </div>
            <span class="ib-status"><i class="ib-dot"></i>ТЕСТОВЫЙ КОНТУР</span>
          </div>
          <div class="ib-flow">
            <span class="ib-node">Браузер пользователя</span><span class="ib-arrow">→</span>
            <span class="ib-node">GitHub Pages</span><span class="ib-arrow">→</span>
            <span class="ib-node">Edge Function</span><span class="ib-arrow">→</span>
            <span class="ib-node">Supabase PostgreSQL</span>
          </div>
        </div>

        <div class="ib-summary" id="ib-copy-text"><b>Краткое обоснование для ИБ.</b> Клиентская часть не содержит секретного ключа базы данных. Запись и чтение состояния идут через серверную Edge Function, которая ограничивает доступ фиксированным перечнем таблиц. Передача данных выполняется по HTTPS. Для таблицы синхронизации включен RLS. CORS ограничивает браузерные обращения доменом проекта. Тестовый контур предназначен только для проектных данных без ПДн и коммерческой тайны. Для промышленного контура необходимо добавить корпоративную аутентификацию, JWT, ролевой RLS и полный журнал аудита.</div>
        <div class="ib-actions"><button class="btn" id="ib-copy">Скопировать обоснование для ИБ</button></div>

        <div class="ib-grid">
          <div class="ib-card">
            <h3>Что уже снижает риски</h3>
            <div class="ib-list">
              <div class="ib-item"><span class="ib-mark ib-ok">✓</span><span><b>Секреты не хранятся во frontend.</b> В GitHub Pages не размещен ключ доступа к базе данных.</span></div>
              <div class="ib-item"><span class="ib-mark ib-ok">✓</span><span><b>Нет прямого доступа браузера к PostgreSQL.</b> Обращения проходят через Edge Function.</span></div>
              <div class="ib-item"><span class="ib-mark ib-ok">✓</span><span><b>Allowlist таблиц.</b> API работает только с заранее разрешенными таблицами проекта.</span></div>
              <div class="ib-item"><span class="ib-mark ib-ok">✓</span><span><b>HTTPS.</b> Сайт и облачный API работают через защищенное соединение.</span></div>
              <div class="ib-item"><span class="ib-mark ib-ok">✓</span><span><b>RLS включен.</b> На таблице синхронизации активирован механизм Row Level Security.</span></div>
              <div class="ib-item"><span class="ib-mark ib-warn">!</span><span><b>CORS ограничен доменом проекта.</b> Это снижает риск случайного доступа из другого браузерного сайта, но не заменяет аутентификацию.</span></div>
            </div>
          </div>

          <div class="ib-card">
            <h3>Какие данные допустимы сейчас</h3>
            <div class="ib-list">
              <div class="ib-item"><span class="ib-mark ib-ok">✓</span><span>Статусы этапов и сроки проекта.</span></div>
              <div class="ib-item"><span class="ib-mark ib-ok">✓</span><span>Названия систем и источников данных.</span></div>
              <div class="ib-item"><span class="ib-mark ib-ok">✓</span><span>RACI, рабочие роли и служебные контакты проекта.</span></div>
              <div class="ib-item"><span class="ib-mark ib-ok">✓</span><span>Data Dictionary без реальных клиентских значений.</span></div>
              <div class="ib-item"><span class="ib-mark ib-warn">!</span><span>Блокеры и комментарии только без чувствительной внутренней информации.</span></div>
              <div class="ib-item"><span class="ib-mark ib-bad">×</span><span><b>Не загружать:</b> пароли, токены, ключи API, ПДн клиентов, договоры, финансовые реквизиты и коммерческую тайну до закрытия production требований.</span></div>
            </div>
          </div>
        </div>

        <div class="section-title"><h2>Матрица требований ИБ</h2><small>текущее состояние тестовой версии</small></div>
        <table class="ib-table">
          <thead><tr><th>Требование</th><th>Статус</th><th>Что реализовано / что требуется</th></tr></thead>
          <tbody>
            <tr><td>Секреты и ключи</td><td><span class="ib-pill ok">Выполнено</span></td><td>Секретный ключ базы не размещается в GitHub и клиентском коде.</td></tr>
            <tr><td>Шифрование канала</td><td><span class="ib-pill ok">Выполнено</span></td><td>Передача между браузером, сайтом и API идет по HTTPS.</td></tr>
            <tr><td>Ограничение поверхности API</td><td><span class="ib-pill ok">Выполнено</span></td><td>Edge Function принимает обращения только к разрешенному перечню таблиц.</td></tr>
            <tr><td>CORS</td><td><span class="ib-pill warn">Частично</span></td><td>Браузерный Origin ограничен доменом GitHub Pages. CORS не является механизмом идентификации пользователя.</td></tr>
            <tr><td>RLS</td><td><span class="ib-pill warn">Частично</span></td><td>RLS включен, но текущая тестовая политика синхронизации разрешает anonymous доступ.</td></tr>
            <tr><td>Аутентификация</td><td><span class="ib-pill bad">До production</span></td><td>В тестовой версии нет входа пользователя, JWT verification отключена. Для production нужен корпоративный вход.</td></tr>
            <tr><td>Ролевая модель</td><td><span class="ib-pill bad">До production</span></td><td>Нужны роли: владелец проекта, редактор, просмотр, ИБ/аудитор и ограничения операций на уровне БД.</td></tr>
            <tr><td>Аудит действий</td><td><span class="ib-pill warn">Частично</span></td><td>История отдельных изменений есть, но требуется единый неизменяемый журнал: пользователь, действие, дата, объект, старое и новое значение.</td></tr>
            <tr><td>ПДн и конфиденциальные данные</td><td><span class="ib-pill bad">Запрещено в TEST</span></td><td>До внедрения аутентификации и ролевых политик тестовый контур использовать только для нечувствительных проектных метаданных.</td></tr>
          </tbody>
        </table>

        <div class="ib-grid">
          <div class="ib-card">
            <h3>Что обязательно сделать перед production</h3>
            <div class="ib-list">
              <div class="ib-item"><span class="ib-mark ib-warn">1</span><span>Подключить корпоративную аутентификацию или SSO.</span></div>
              <div class="ib-item"><span class="ib-mark ib-warn">2</span><span>Включить проверку JWT на Edge Function.</span></div>
              <div class="ib-item"><span class="ib-mark ib-warn">3</span><span>Закрыть anonymous политики и настроить RLS по ролям.</span></div>
              <div class="ib-item"><span class="ib-mark ib-warn">4</span><span>Ввести минимально необходимые права на чтение и изменение.</span></div>
              <div class="ib-item"><span class="ib-mark ib-warn">5</span><span>Добавить централизованный аудит действий и журналирование ошибок.</span></div>
              <div class="ib-item"><span class="ib-mark ib-warn">6</span><span>Согласовать классификацию данных, сроки хранения, резервирование и процесс удаления.</span></div>
            </div>
          </div>
          <div class="ib-card">
            <h3>Вывод для службы ИБ</h3>
            <p><b>Текущий TEST можно использовать для разработки и демонстрации на обезличенных проектных данных.</b> Архитектура уже исключает хранение секретного ключа в браузере, ограничивает API и использует HTTPS. При этом текущий контур нельзя считать промышленно защищенным для ПДн или коммерческой тайны, потому что отсутствуют аутентификация и ролевая авторизация. Production допускается после закрытия пунктов из соседнего блока.</p>
          </div>
        </div>

        <div class="ib-warning"><b>Важно:</b> ограничение Origin и CORS само по себе не защищает API от прямого запроса вне браузера. Поэтому до внедрения JWT и ролевого RLS этот раздел не должен использоваться как формальное подтверждение полной защищенности системы.</div>
      </div>`;
  }

  function ensureButton(){
    const sidebar=document.querySelector('.sidebar');
    if(!sidebar||document.getElementById('security-nav')) return;
    const btn=document.createElement('button');
    btn.id='security-nav';
    btn.type='button';
    btn.className='nav';
    btn.textContent='ИБ';
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));
      btn.classList.add('active');
      document.querySelector('.content')?.classList.remove('gantt-content-focus');
      open();
    });
    sidebar.appendChild(btn);
  }

  document.addEventListener('click',async e=>{
    if(!e.target.closest('#ib-copy')) return;
    const text=document.getElementById('ib-copy-text')?.innerText||'';
    try{
      await navigator.clipboard.writeText(text);
      const b=document.getElementById('ib-copy');
      if(b){b.textContent='Скопировано';setTimeout(()=>b.textContent='Скопировать обоснование для ИБ',1400);}
    }catch{
      alert('Не удалось скопировать автоматически. Выдели текст вручную.');
    }
  });

  ensureStyles();
  ensureButton();
  window.ATOM_SECURITY={open};
})();