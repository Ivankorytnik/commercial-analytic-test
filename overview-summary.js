(function () {
  const START_KEY = 'atom-project-started-at';
  const PROJECT_DAYS = 90;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const GANTT_TASKS = [
    [1, 'Цели и KPI', 0, 7],
    [2, 'Команды и владельцы', 0, 14],
    [3, 'Источники лидов', 4, 18],
    [4, 'Единая воронка', 10, 22],
    [5, 'Data Dictionary', 15, 31],
    [6, 'Сквозные ID', 22, 38],
    [7, 'Интеграции', 31, 59],
    [8, 'DWH и модель данных', 38, 66],
    [9, 'Контроль качества', 52, 73],
    [10, 'Единый BI-дашборд', 59, 80],
    [11, 'Валидация с бизнесом', 73, 85],
    [12, 'Приемка и закрытие', 84, 90]
  ];

  function started() {
    return Boolean(localStorage.getItem(START_KEY));
  }

  function ownerCount() {
    if (!started() || typeof DATA === 'undefined') return 0;
    return DATA.teams.filter((_, i) => {
      const value = localStorage.getItem(`atom-responsible-${i}`);
      return value && value !== 'Не назначен';
    }).length;
  }

  function stagesDone() {
    if (!started()) return 0;
    return DATA.stages.filter(s => getStageStatus(s.id) === 'Завершено').length;
  }

  function dictionaryDone() {
    if (!started()) return 0;
    return DATA.dictionary.filter((_, i) => localStorage.getItem(`atom-dictionary-ready-${i}`) === '1').length;
  }

  function dodDone() {
    if (!started()) return 0;
    return DATA.dod.filter((_, i) => localStorage.getItem(`atom-mvp-dod-${i}`) === '1').length;
  }

  function scheduleInfo() {
    if (!started()) return { percent: 0, text: 'отсчет начнется после старта' };
    const start = Number(localStorage.getItem(START_KEY));
    const elapsedMs = Math.max(0, Date.now() - start);
    const elapsedDays = Math.floor(elapsedMs / DAY_MS);
    const percent = Math.min(100, Math.floor((elapsedMs / (PROJECT_DAYS * DAY_MS)) * 100));
    const remainingDays = Math.max(0, PROJECT_DAYS - elapsedDays);
    return {
      percent,
      text: remainingDays > 0 ? `осталось ${remainingDays} дн.` : 'плановый срок истек'
    };
  }

  function card(key, label, value, sub, percent) {
    const progressHtml = typeof percent === 'number'
      ? `<div class="progress"><div data-extra-progress="${key}" style="width:${Math.max(0, Math.min(100, percent))}%"></div></div>`
      : '';
    return `<div class="card kpi overview-extra-kpi" data-summary-key="${key}"><div class="label">${label}</div><div class="value">${value}</div>${progressHtml}<div class="sub">${sub}</div></div>`;
  }

  function setText(el, value) {
    if (el && el.textContent !== value) el.textContent = value;
  }

  function patchBaseCards(grid) {
    const cards = [...grid.querySelectorAll('.card.kpi:not(.overview-extra-kpi)')];
    cards.forEach(c => {
      const label = c.querySelector('.label')?.textContent?.trim();
      if (label === 'Владельцы назначены') {
        setText(c.querySelector('.value'), `${ownerCount()} / ${DATA.teams.length}`);
        setText(c.querySelector('.sub'), 'по назначенным ответственным в RACI');
      }
      if (label === 'Критические блокеры') {
        const active = started() ? activeBlockers().length : 0;
        setText(c.querySelector('.sub'), `активных всего: ${active}`);
      }
    });
  }

  function updateExtraCard(grid, key, value, sub, percent) {
    const el = grid.querySelector(`[data-summary-key="${key}"]`);
    if (!el) return false;
    setText(el.querySelector('.value'), value);
    setText(el.querySelector('.sub'), sub);
    if (typeof percent === 'number') {
      const bar = el.querySelector(`[data-extra-progress="${key}"]`);
      const width = `${Math.max(0, Math.min(100, percent))}%`;
      if (bar && bar.style.width !== width) bar.style.width = width;
    }
    return true;
  }

  function todayInfo() {
    if (!started()) {
      return {
        dayText: 'Проект не запущен',
        items: [],
        note: 'После нажатия «Старт проекта» здесь появятся этапы, которые по Ганту должны быть в работе сегодня.'
      };
    }

    const start = Number(localStorage.getItem(START_KEY));
    const dayIndex = Math.floor(Math.max(0, Date.now() - start) / DAY_MS);
    const humanDay = dayIndex + 1;

    if (dayIndex >= PROJECT_DAYS) {
      return { dayText: `День ${humanDay}`, items: [], note: 'Плановый 90-дневный срок проекта завершен.' };
    }

    const planned = GANTT_TASKS.filter(([, , from, to]) => dayIndex >= from && dayIndex < to);
    const active = planned.filter(([id]) => getStageStatus(id) !== 'Завершено');

    if (!active.length && planned.length) {
      return { dayText: `День ${humanDay} из ${PROJECT_DAYS}`, items: [], note: 'Все запланированные на сегодня этапы уже завершены.' };
    }

    return {
      dayText: `День ${humanDay} из ${PROJECT_DAYS}`,
      items: active.map(([id, name, from, to]) => ({
        id,
        name,
        from: from + 1,
        to,
        status: getStageStatus(id),
        progress: getStageProgress(id)
      })),
      note: active.length ? '' : 'На текущий день в Ганте нет активных этапов.'
    };
  }

  function renderTodayBlock() {
    const appRoot = document.getElementById('app');
    const grid = appRoot?.querySelector('.grid');
    if (!appRoot || !grid || typeof DATA === 'undefined') return;

    let block = appRoot.querySelector('[data-overview-today]');
    if (!block) {
      block = document.createElement('div');
      block.setAttribute('data-overview-today', '1');
      block.className = 'card';
      block.style.marginTop = '16px';
      grid.insertAdjacentElement('afterend', block);
    }

    const info = todayInfo();
    const itemsHtml = info.items.length
      ? `<div style="display:grid;gap:8px;margin-top:10px">${info.items.map(item => `
          <div style="display:grid;grid-template-columns:minmax(220px,1fr) 160px 90px;gap:12px;align-items:center;padding:10px 12px;border:1px solid #dbe5e5;border-radius:10px;background:#fff">
            <div><b>${item.name}</b><div style="font-size:11px;color:#66797a;margin-top:3px">План: дни ${item.from}-${item.to}</div></div>
            <div style="font-size:12px">${item.status}</div>
            <div style="font-size:13px;font-weight:700;text-align:right">${item.progress}%</div>
          </div>`).join('')}</div>`
      : `<div style="margin-top:10px;color:#66797a;font-size:13px">${info.note}</div>`;

    const html = `
      <div style="display:flex;justify-content:space-between;gap:16px;align-items:center">
        <div>
          <div style="font-size:12px;color:#66797a;margin-bottom:4px">Из диаграммы Ганта</div>
          <h3 style="margin:0;font-size:18px">Сегодня в работе</h3>
        </div>
        <div style="font-size:12px;color:#66797a">${info.dayText}</div>
      </div>
      ${itemsHtml}`;

    if (block.innerHTML !== html) block.innerHTML = html;
  }

  function renderSummary() {
    const grid = document.querySelector('#app .grid');
    const startCard = document.querySelector('#app .project-start-card');
    if (!grid || !startCard || typeof DATA === 'undefined') return;

    patchBaseCards(grid);

    const schedule = scheduleInfo();
    const values = {
      stages: [`${stagesDone()} / ${DATA.stages.length}`, 'статус «Завершено»'],
      dictionary: [`${dictionaryDone()} / ${DATA.dictionary.length}`, 'поля подтверждены как готовые'],
      dod: [`${dodDone()} / ${DATA.dod.length}`, 'условия закрытия проекта'],
      schedule: [`${schedule.percent}%`, schedule.text, schedule.percent]
    };

    const hasAll = ['stages','dictionary','dod','schedule'].every(key => grid.querySelector(`[data-summary-key="${key}"]`));
    if (!hasAll) {
      grid.querySelectorAll('.overview-extra-kpi').forEach(el => el.remove());
      grid.insertAdjacentHTML('beforeend',
        card('stages', 'Этапы завершены', values.stages[0], values.stages[1]) +
        card('dictionary', 'Data Dictionary', values.dictionary[0], values.dictionary[1]) +
        card('dod', 'Definition of Done', values.dod[0], values.dod[1]) +
        card('schedule', 'Срок использован', values.schedule[0], values.schedule[1], values.schedule[2])
      );
    } else {
      updateExtraCard(grid, 'stages', values.stages[0], values.stages[1]);
      updateExtraCard(grid, 'dictionary', values.dictionary[0], values.dictionary[1]);
      updateExtraCard(grid, 'dod', values.dod[0], values.dod[1]);
      updateExtraCard(grid, 'schedule', values.schedule[0], values.schedule[1], values.schedule[2]);
    }

    renderTodayBlock();
  }

  const appRoot = document.getElementById('app');
  if (appRoot) {
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        renderSummary();
      });
    });
    observer.observe(appRoot, { childList: true });
  }

  setInterval(() => {
    if (document.querySelector('#app .project-start-card')) renderSummary();
  }, 60000);

  renderSummary();
})();