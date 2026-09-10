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
    blocker: '#d9534f',
    extended: '#d99000',
    changed: '#66797a'
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

  function ensureColumnStyles() {
    if (document.getElementById('gantt-column-styles')) return;
    const style = document.createElement('style');
    style.id = 'gantt-column-styles';
    style.textContent = `
      .gantt-head,.gantt-row{grid-template-columns:760px minmax(780px,1fr);min-width:1540px}
      .gantt-task-head{padding:0}
      .gantt-task-head-columns,.gantt-task-columns{display:grid;grid-template-columns:190px 150px 160px 140px 120px}
      .gantt-col-head{padding:12px 10px;border-right:1px solid var(--line);display:flex;align-items:center;min-width:0}
      .gantt-col-head:last-child{border-right:0}
      .gantt-task.gantt-task-columns{padding:0;gap:0;display:grid;flex-direction:initial;justify-content:initial;align-items:stretch}
      .gantt-cell{padding:10px;border-right:1px solid var(--line);display:flex;flex-direction:column;justify-content:center;gap:4px;min-width:0;font-size:12px}
      .gantt-cell small{font-size:10px;line-height:1.3}
      .gantt-name-cell b{font-size:13px;line-height:1.25}
      .gantt-period-cell{flex-direction:row;align-items:center;justify-content:flex-start;gap:5px;white-space:nowrap;font-variant-numeric:tabular-nums}
      .gantt-status-cell b{font-size:13px}
      .gantt-baseline-cell b{font-size:13px;font-variant-numeric:tabular-nums}
      .gantt-action-cell{border-right:0;align-items:flex-start}
      .gantt-action-cell .btn{margin:0!important;white-space:nowrap}
      .gantt-action-note{display:block;margin-top:4px;color:#8a9696;font-size:10px;line-height:1.25}
      .gantt-reschedule-form{grid-column:1/-1!important;margin:0!important;border:0!important;border-top:1px solid var(--line)!important;border-radius:0!important;background:#f8fbfb!important;padding:10px 12px!important}
      .gantt-track{min-height:64px}
      .gantt-bar{top:20px}
      @media(max-width:900px){.gantt-head,.gantt-row{grid-template-columns:760px minmax(780px,1fr)}}
    `;
    document.head.appendChild(style);
  }

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

  function originalDue(task, projectStart) {
    return endOfLocalDay(toDateInput(addDays(projectStart, task.end)));
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
    return customTs || originalDue(task, projectStart);
  }

  function effectiveEndDay(task, projectStart) {
    const due = effectiveDue(task, projectStart);
    return Math.max(task.start + 1, Math.ceil((due - projectStart) / DAY_MS));
  }

  function taskState(task, projectStart, now) {
    const status = getStageStatus(task.id);
    const percent = getStageProgress(task.id);
    const due = effectiveDue(task, projectStart);
    const baseDue = originalDue(task, projectStart);
    const start = addDays(projectStart, task.start);
    const overdue = isStarted() && status !== 'Завершено' && now > due;
    const customDue = localStorage.getItem(dueKey(task.id));
    const changed = Boolean(customDue);
    const extended = changed && due > baseDue;
    const shortened = changed && due < baseDue;
    const deltaDays = changed ? Math.round((due - baseDue) / DAY_MS) : 0;
    return {
      ...task,
      status,
      percent,
      due,
      originalDue: baseDue,
      startDate: start,
      overdue,
      customDue,
      changed,
      extended,
      shortened,
      deltaDays,
      history: getHistory(task.id)
    };
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

  function legendItem(color, text, striped) {
    const bg = striped
      ? `repeating-linear-gradient(135deg,${color} 0,${color} 5px,#ffe5a8 5px,#ffe5a8 10px)`
      : color;
    return `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:16px;margin-bottom:6px"><span style="width:12px;height:12px;border-radius:3px;background:${bg};display:inline-block;border:${striped ? '1px solid #b67a00' : '0'}"></span>${text}</span>`;
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
      description: `Просрочен срок этапа. Актуальный срок: ${formatDate(state.due)}. Базовый срок: ${formatDate(state.originalDue)}`,
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
    const blocker = blockers.find(x => x.autoKey === source && !['Закрыт'].includes(x.status));
    if (!blocker) return;
    const line = `Срок изменен: ${formatDate(oldDue)} -> ${formatDate(newDue)}${reason ? `. Причина: ${reason}` : ''}`;
    blocker.comment = blocker.comment ? `${blocker.comment}\n${line}` : line;
    saveBlockers(blockers);
  }

  function saveReschedule(id, newDate, reason) {
    const task = TASKS.find(x => x.id === id);
    if (!task || !newDate) return;
    if (!isStarted()) {
      alert('Сроки можно менять после старта проекта');
      return;
    }

    const projectStart = startTs();
    const oldDue = effectiveDue(task, projectStart);
    const baseDue = originalDue(task, projectStart);
    const newDue = endOfLocalDay(newDate);
    const taskStart = addDays(projectStart, task.start);

    if (!newDue || newDue < taskStart) {
      alert('Срок не может быть раньше начала этапа');
      return;
    }
    if (newDue > baseDue && !reason.trim()) {
      alert('Для продления срока укажи причину');
      return;
    }

    const history = getHistory(id);
    history.push({
      changedAt: new Date().toISOString(),
      oldDue: toDateInput(oldDue),
      newDue: newDate,
      originalDue: toDateInput(baseDue),
      type: newDue > baseDue ? 'extended' : (newDue < baseDue ? 'shortened' : 'baseline'),
      reason: reason || ''
    });
    localStorage.setItem(historyKey(id), JSON.stringify(history));
    localStorage.setItem(dueKey(id), newDate);
    appendRescheduleToBlocker(task, oldDue, newDue, reason || 'не указана');
    render('gantt');
  }

  function resetDue(id) {
    const task = TASKS.find(x => x.id === id);
    if (!task || !isStarted()) return;
    const projectStart = startTs();
    const oldDue = effectiveDue(task, projectStart);
    const baseDue = originalDue(task, projectStart);
    const history = getHistory(id);
    history.push({
      changedAt: new Date().toISOString(),
      oldDue: toDateInput(oldDue),
      newDue: toDateInput(baseDue),
      originalDue: toDateInput(baseDue),
      type: 'reset',
      reason: 'Возврат к базовому сроку'
    });
    localStorage.setItem(historyKey(id), JSON.stringify(history));
    localStorage.removeItem(dueKey(id));
    appendRescheduleToBlocker(task, oldDue, baseDue, 'Возврат к базовому сроку');
    render('gantt');
  }

  function renderRescheduleForm(state) {
    const min = toDateInput(state.startDate);
    const value = state.customDue || toDateInput(state.originalDue);
    return `<div class="gantt-reschedule-form" data-reschedule-form="${state.id}" style="display:none">
      <div style="font-size:11px;color:#66797a;margin-bottom:7px">Базовый срок: <b>${formatDate(state.originalDue)}</b></div>
      <div style="display:grid;grid-template-columns:150px minmax(180px,1fr) auto;gap:8px;align-items:center">
        <input type="date" class="gantt-new-due" data-id="${state.id}" min="${min}" value="${value}">
        <input type="text" class="gantt-reschedule-reason" data-id="${state.id}" placeholder="Причина изменения срока">
        <button class="btn primary gantt-save-due" data-id="${state.id}">Сохранить</button>
      </div>
      ${state.changed ? `<button class="btn gantt-reset-due" data-id="${state.id}" style="margin-top:8px;padding:5px 8px;font-size:11px">Вернуть базовый срок</button>` : ''}
    </div>`;
  }

  function deadlineChangeLabel(state) {
    if (!state.changed) return `<small style="color:#66797a">Без изменений</small>`;
    if (state.extended) {
      return `<small style="color:#946a00;font-weight:700">ПРОДЛЕН +${Math.max(1, state.deltaDays)} дн.<br>до ${formatDate(state.due)}</small>`;
    }
    if (state.shortened) {
      return `<small style="color:#526667;font-weight:700">На ${Math.abs(state.deltaDays)} дн. раньше<br>до ${formatDate(state.due)}</small>`;
    }
    return `<small style="color:#66797a">По базовому плану</small>`;
  }

  function lastTransferText(state) {
    if (!state.history.length) return '';
    const last = state.history[state.history.length - 1];
    const oldTs = endOfLocalDay(last.oldDue);
    const newTs = endOfLocalDay(last.newDue);
    return `<small style="color:#7a8585">${formatDate(oldTs)} -> ${formatDate(newTs)}</small>`;
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
    ensureColumnStyles();
    const plannedStart = startTs();
    const now = Date.now();
    const states = TASKS.map(task => taskState(task, plannedStart, now));
    states.forEach(ensureOverdueBlocker);

    const maxEndDay = Math.max(90, ...states.map(state => effectiveEndDay(state, plannedStart)));
    const horizonDays = Math.ceil(maxEndDay / 7) * 7;
    const weeks = Math.ceil(horizonDays / 7);
    const weekHeaders = Array.from({ length: weeks }, (_, i) => `<div class="gantt-week">Н${i + 1}</div>`).join('');
    const gridStep = 100 / weeks;

    const rows = states.map(state => {
      const currentEndDay = effectiveEndDay(state, plannedStart);
      const originalEndDay = state.end;
      const color = readinessColor(state);
      const left = state.start / horizonDays * 100;
      const currentWidth = Math.max(2, (currentEndDay - state.start) / horizonDays * 100);
      const originalWidth = Math.max(2, (originalEndDay - state.start) / horizonDays * 100);
      const extensionLeft = originalEndDay / horizonDays * 100;
      const extensionWidth = Math.max(0, (currentEndDay - originalEndDay) / horizonDays * 100);
      const dueText = formatDate(state.due);
      const statusText = state.overdue ? 'Просрочка / Блокер' : state.status;
      const transferButton = isStarted()
        ? `<button class="btn gantt-reschedule-btn" data-id="${state.id}" style="padding:5px 8px;font-size:11px">Изменить срок</button>`
        : `<div><button class="btn gantt-reschedule-btn" data-id="${state.id}" disabled aria-disabled="true" title="Сроки доступны после старта проекта" style="padding:5px 8px;font-size:11px;opacity:.5;cursor:not-allowed">Изменить срок</button><small class="gantt-action-note">После старта проекта</small></div>`;
      const overdueNote = state.overdue ? `<small style="color:#a53636;font-weight:700">Просрочено</small>` : '';

      let barHtml;
      if (state.extended) {
        barHtml = `<div class="gantt-bar" title="${state.name}: базовая часть" style="left:${left}%;width:${originalWidth}%;background:${color}"></div>
          <div class="gantt-bar" title="Продление: +${Math.max(1, state.deltaDays)} дн." style="left:${extensionLeft}%;width:${extensionWidth}%;background:repeating-linear-gradient(135deg,#d99000 0,#d99000 6px,#ffe5a8 6px,#ffe5a8 12px);border:1px solid #b67a00;box-shadow:none"></div>`;
      } else {
        barHtml = `<div class="gantt-bar" title="${state.name}: ${state.percent}% · ${statusText}" style="left:${left}%;width:${currentWidth}%;background:${color}"></div>`;
      }

      return `<div class="gantt-row">
        <div class="gantt-task gantt-task-columns">
          <div class="gantt-cell gantt-name-cell"><b>${state.name}</b></div>
          <div class="gantt-cell gantt-period-cell"><span>${formatDate(state.startDate)}</span><span>-</span><span>${dueText}</span></div>
          <div class="gantt-cell gantt-status-cell"><b>${state.percent}%</b><span>${statusText}</span>${overdueNote}</div>
          <div class="gantt-cell gantt-baseline-cell"><b>${formatDate(state.originalDue)}</b>${deadlineChangeLabel(state)}${state.changed ? lastTransferText(state) : ''}</div>
          <div class="gantt-cell gantt-action-cell">${transferButton}</div>
          ${renderRescheduleForm(state)}
        </div>
        <div class="gantt-track">
          <div class="gantt-grid" style="background:repeating-linear-gradient(to right,transparent 0,transparent calc(${gridStep}% - 1px),var(--line) calc(${gridStep}% - 1px),var(--line) ${gridStep}%)"></div>
          ${barHtml}
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
      ${legendItem(COLORS.extended, 'Продленный срок', true)}
    </div>`;

    return `<div class="section-title"><h2>Диаграмма Ганта</h2><small>Данные этапа разнесены по отдельным столбцам</small></div>
      <div class="callout"><b>${isStarted() ? 'Срок любого этапа можно изменить.' : 'Проект еще не запущен.'}</b> ${isStarted() ? 'Период, статус и базовый срок теперь отображаются отдельно.' : 'Кнопки изменения срока видны, но станут активными после нажатия «Старт проекта».'}</div>
      ${legend}
      <div class="gantt-wrap">
        <div class="gantt-head">
          <div class="gantt-task-head gantt-task-head-columns">
            <div class="gantt-col-head">Этап</div>
            <div class="gantt-col-head">Период</div>
            <div class="gantt-col-head">Готовность / статус</div>
            <div class="gantt-col-head">Базовый срок</div>
            <div class="gantt-col-head">Управление</div>
          </div>
          <div class="gantt-weeks" style="grid-template-columns:repeat(${weeks},1fr)">${weekHeaders}</div>
        </div>
        ${rows}
      </div>
      <div class="gantt-footer"><span>Старт: <b>${formatDate(plannedStart)}</b></span><span>Базовое завершение проекта: <b>${formatDate(addDays(plannedStart, 90))}</b></span><span>Базовый срок: <b>3 месяца / 90 дней</b></span></div>`;
  };

  document.addEventListener('click', event => {
    const toggle = event.target.closest('.gantt-reschedule-btn');
    if (toggle) {
      if (toggle.disabled) return;
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
      return;
    }

    const reset = event.target.closest('.gantt-reset-due');
    if (reset) {
      resetDue(Number(reset.dataset.id));
    }
  });
})();