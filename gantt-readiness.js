(function () {
  const PROJECT_START_KEY = 'atom-project-started-at';
  const BLOCKERS_KEY = 'atom-blockers';
  const DAY_MS = 24 * 60 * 60 * 1000;
  const COLORS = {
    notStarted: '#dfe7e7',
    low: '#f3c969',
    medium: '#42d7c8',
    high: '#149d91',
    done: '#2ca66f',
    blocker: '#d9534f'
  };

  const TASKS = [
    { id: 1, name: 'Цели и KPI', start: 0, end: 7 },
    { id: 2, name: 'Команды и владельцы', start: 0, end: 14 },
    { id: 3, name: 'Источники лидов', start: 4, end: 18 },
    { id: 4, name: 'Единая воронка', start: 10, end: 22 },
    { id: 5, name: 'Data Dictionary', start: 15, end: 31 },
    { id: 6, name: 'Сквозные ID', start: 22, end: 38 },
    { id: 7, name: 'Интеграции', start: 31, end: 59 },
    { id: 8, name: 'DWH и модель данных', start: 38, end: 66 },
    { id: 9, name: 'Контроль качества', start: 52, end: 73 },
    { id: 10, name: 'Единый BI-дашборд', start: 59, end: 80 },
    { id: 11, name: 'Валидация с бизнесом', start: 73, end: 85 },
    { id: 12, name: 'Приемка и закрытие', start: 84, end: 90 }
  ];

  function startTs() {
    const raw = localStorage.getItem(PROJECT_START_KEY);
    return raw ? Number(raw) : Date.now();
  }

  function toDateInput(ts) {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function endOfLocalDay(dateString) {
    if (!dateString) return null;
    const parts = dateString.split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999).getTime();
  }

  function dueKey(id) {
    return `atom-gantt-due-${id}`;
  }

  function historyKey(id) {
    return `atom-gantt-reschedule-history-${id}`;
  }

  function getHistory(id) {
    try {
      return JSON.parse(localStorage.getItem(historyKey(id)) || '[]');
    } catch {
      return [];
    }
  }

  function effectiveDue(task, projectStart) {
    const custom = localStorage.getItem(dueKey(task.id));
    const customTs = endOfLocalDay(custom);
    return customTs || addDays(projectStart, task.end);
  }

  function effectiveEndDay(task, projectStart) {
    const due = effectiveDue(task, projectStart);
    return Math.max(task.end, Math.ceil((due - projectStart) / DAY_MS));
  }

  function taskState(task, projectStart, now) {
    const status = getStageStatus(task.id);
    const percent = getStageProgress(task.id);
    const due = effectiveDue(task, projectStart);
    const start = addDays(projectStart, task.start);
    const overdue = isStarted() && status !== 'Завершено' && now > due;
    const customDue = localStorage.getItem(dueKey(task.id));
    return { ...task, status, percent, due, startDate: start, overdue, customDue, history: getHistory(task.id) };
  }

  function readinessColor(state) {
    if (!isStarted()) return COLORS.notStarted;
    if (state.overdue || state.status === 'Блокер') return COLORS.blocker;
    if (state.percent >= 100) return COLORS.done;
    if (state.percent >= 75) return COLORS.high;
    if (state.percent >= 40) return COLORS.medium;
    if (state.percent > 0) return COLORS.low;
    return COLORS.notStarted;
  }

  function legendItem(color, text) {
    return `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:16px;margin-bottom:6px"><span style="width:12px;height:12px;border-radius:3px;background:${color};display:inline-block"></span>${text}</span>`;
  }

  function getBlockers() {
    try {
      return JSON.parse(localStorage.getItem(BLOCKERS_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveBlockers(items) {
    localStorage.setItem(BLOCKERS_KEY, JSON.stringify(items));
  }

  function ensureOverdueBlocker(state) {
    if (!state.overdue) return;
    const source = `Гант: ${state.name}`;
    const blockers = getBlockers();
    const existing = blockers.find(x => x.autoKey === source && !['Решен', 'Закрыт'].includes(x.status));
    if (existing) return;
    blockers.push({
      id: Date.now() + state.id,
      autoKey: source,
      source,
      description: `Просрочен срок этапа. Плановый срок: ${formatDate(state.due)}`,
      severity: 'Высокая',
      owner: 'Не назначен',
      due: '',
      status: 'Открыт',
      comment: 'Создан автоматически по просрочке диаграммы Ганта',
      createdAt: new Date().toISOString()
    });
    saveBlockers(blockers);
  }

  function appendRescheduleToBlocker(task, oldDue, newDue, reason) {
    const source = `Гант: ${task.name}`;
    const blockers = getBlockers();
    let blocker = blockers.find(x => x.autoKey === source && !['Закрыт'].includes(x.status));
    if (!blocker) {
      blocker = {
        id: Date.now() + task.id,
        autoKey: source,
        source,
        description: `Перенос срока этапа после просрочки. Старый срок: ${formatDate(oldDue)}`,
        severity: 'Высокая',
        owner: 'Не назначен',
        due: '',
        status: 'Открыт',
        comment: '',
        createdAt: new Date().toISOString()
      };
      blockers.push(blocker);
    }
    const line = `Срок перенесен: ${formatDate(oldDue)} -> ${formatDate(newDue)}${reason ? `. Причина: ${reason}` : ''}`;
    blocker.comment = blocker.comment ? `${blocker.comment}\n${line}` : line;
    saveBlockers(blockers);
  }

  function saveReschedule(id, newDate, reason) {
    const task = TASKS.find(x => x.id === id);
    if (!task || !newDate) return;
    const projectStart = startTs();
    const oldDue = effectiveDue(task, projectStart);
    const newDue = endOfLocalDay(newDate);
    if (!newDue || newDue <= Date.now()) {
      alert('Укажи новый срок позднее текущей даты');
      return;
    }

    const history = getHistory(id);
    history.push({
      changedAt: new Date().toISOString(),
      oldDue: toDateInput(oldDue),
      newDue: newDate,
      reason: reason || ''
    });
    localStorage.setItem(historyKey(id), JSON.stringify(history));
    localStorage.setItem(dueKey(id), newDate);
    appendRescheduleToBlocker(task, oldDue, newDue, reason || 'не указана');
    render('gantt');
  }

  function renderRescheduleForm(state) {
    const min = toDateInput(Date.now() + DAY_MS);
    return `<div class="gantt-reschedule-form" data-reschedule-form="${state.id}" style="display:none;margin-top:8px;padding:10px;border:1px solid #dbe5e5;border-radius:8px;background:#f8fbfb">
      <div style="display:grid;grid-template-columns:150px minmax(180px,1fr) auto;gap:8px;align-items:center">
        <input type="date" class="gantt-new-due" data-id="${state.id}" min="${min}" value="${state.customDue || ''}">
        <input type="text" class="gantt-reschedule-reason" data-id="${state.id}" placeholder="Причина переноса">
        <button class="btn primary gantt-save-due" data-id="${state.id}">Сохранить</button>
      </div>
    </div>`;
  }

  function lastTransferText(state) {
    if (!state.history.length) return '';
    const last = state.history[state.history.length - 1];
    const oldTs = endOfLocalDay(last.oldDue);
    const newTs = endOfLocalDay(last.newDue);
    return `<small style="color:#946a00">Срок перенесен: ${formatDate(oldTs)} -> ${formatDate(newTs)}</small>`;
  }

  window.ATOM_GANTT = {
    tasks: TASKS,
    getTaskState: function (id) {
      const task = TASKS.find(x => x.id === Number(id));
      if (!task) return null;
      return taskState(task, startTs(), Date.now());
    },
    getAllStates: function () {
      const ps = startTs();
      const now = Date.now();
      return TASKS.map(task => taskState(task, ps, now));
    },
    projectStart: startTs
  };

  window.gantt = function () {
    const plannedStart = startTs();
    const now = Date.now();
    const states = TASKS.map(task => taskState(task, plannedStart, now));
    states.forEach(ensureOverdueBlocker);

    const maxEndDay = Math.max(90, ...TASKS.map(task => effectiveEndDay(task, plannedStart)));
    const horizonDays = Math.ceil(maxEndDay / 7) * 7;
    const weeks = Math.ceil(horizonDays / 7);
    const weekHeaders = Array.from({ length: weeks }, (_, i) => `<div class="gantt-week">Н${i + 1}</div>`).join('');
    const gridStep = 100 / weeks;

    const rows = states.map(state => {
      const endDay = effectiveEndDay(state, plannedStart);
      const color = readinessColor(state);
      const left = state.start / horizonDays * 100;
      const width = Math.max(2, (endDay - state.start) / horizonDays * 100);
      const dueText = formatDate(state.due);
      const statusText = state.overdue ? 'Просрочка / Блокер' : state.status;
      const transferButton = state.overdue || state.customDue
        ? `<button class="btn gantt-reschedule-btn" data-id="${state.id}" style="margin-top:6px;padding:5px 8px;font-size:11px">${state.customDue ? 'Изменить срок' : 'Перенести срок'}</button>`
        : '';
      const overdueNote = state.overdue ? `<small style="color:#a53636;font-weight:700">Просрочено. Актуальный срок: ${dueText}</small>` : '';

      return `<div class="gantt-row">
        <div class="gantt-task">
          <b>${state.name}</b>
          <small>${formatDate(state.startDate)} - ${dueText}</small>
          <small><b>${state.percent}%</b> · ${statusText}</small>
          ${overdueNote}
          ${lastTransferText(state)}
          ${transferButton}
          ${renderRescheduleForm(state)}
        </div>
        <div class="gantt-track">
          <div class="gantt-grid" style="background:repeating-linear-gradient(to right,transparent 0,transparent calc(${gridStep}% - 1px),var(--line) calc(${gridStep}% - 1px),var(--line) ${gridStep}%)"></div>
          <div class="gantt-bar" title="${state.name}: ${state.percent}% · ${statusText}" style="left:${left}%;width:${width}%;background:${color}"></div>
        </div>
      </div>`;
    }).join('');

    const legend = `<div style="margin:14px 0 18px;padding:12px 14px;background:#fff;border:1px solid #dbe5e5;border-radius:10px;font-size:12px">
      ${legendItem(COLORS.notStarted, '0% Не начато')}
      ${legendItem(COLORS.low, '1-39% Начало')}
      ${legendItem(COLORS.medium, '40-74% В работе')}
      ${legendItem(COLORS.high, '75-99% Близко к завершению')}
      ${legendItem(COLORS.done, '100% Готово')}
      ${legendItem(COLORS.blocker, 'Блокер / просрочка')}
    </div>`;

    return `<div class="section-title"><h2>Диаграмма Ганта</h2><small>Просрочка автоматически становится блокером</small></div>
      <div class="callout"><b>${isStarted() ? 'Гант рассчитан от фактической даты старта проекта.' : 'Проект еще не запущен.'}</b> ${isStarted() ? 'Если срок этапа прошел, а этап не завершен, он отображается красным и фиксируется в блокерах. Срок можно перенести.' : 'До старта все этапы отображаются нейтральным цветом.'}</div>
      ${legend}
      <div class="gantt-wrap">
        <div class="gantt-head"><div class="gantt-task-head">Этап</div><div class="gantt-weeks" style="grid-template-columns:repeat(${weeks},1fr)">${weekHeaders}</div></div>
        ${rows}
      </div>
      <div class="gantt-footer"><span>Старт: <b>${formatDate(plannedStart)}</b></span><span>Плановое завершение проекта: <b>${formatDate(addDays(plannedStart, 90))}</b></span><span>Базовый срок: <b>3 месяца / 90 дней</b></span></div>`;
  };

  document.addEventListener('click', event => {
    const toggle = event.target.closest('.gantt-reschedule-btn');
    if (toggle) {
      const form = document.querySelector(`[data-reschedule-form="${toggle.dataset.id}"]`);
      if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
      return;
    }

    const save = event.target.closest('.gantt-save-due');
    if (save) {
      const id = Number(save.dataset.id);
      const date = document.querySelector(`.gantt-new-due[data-id="${id}"]`)?.value || '';
      const reason = document.querySelector(`.gantt-reschedule-reason[data-id="${id}"]`)?.value.trim() || '';
      saveReschedule(id, date, reason);
    }
  });
})();