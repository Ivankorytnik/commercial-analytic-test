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
    extended: '#d99000'
  };

  let activeFilter = 'all';
  let scaleMode = 'weeks';

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

  function ensureStyles() {
    if (document.getElementById('gantt-focus-styles')) return;
    const style = document.createElement('style');
    style.id = 'gantt-focus-styles';
    style.textContent = `
      .content.gantt-content-focus{max-width:none;padding-right:18px}
      .gantt-dashboard{width:100%}
      .gantt-title-row{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin:4px 0 12px}
      .gantt-title-row h2{margin:0;font-size:22px}
      .gantt-title-row small{color:var(--muted)}
      .gantt-info{display:flex;align-items:center;gap:9px;padding:10px 12px;border-left:4px solid var(--accent);background:#eefcfa;border-radius:8px;font-size:12px;margin-bottom:12px}
      .gantt-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:10px}
      .gantt-kpi{background:#fff;border:1px solid var(--line);border-radius:10px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0}
      .gantt-kpi span{font-size:11px;color:var(--muted)}
      .gantt-kpi b{font-size:22px;line-height:1;font-variant-numeric:tabular-nums}
      .gantt-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;background:#fff;border:1px solid var(--line);border-radius:10px;padding:8px 10px;margin-bottom:10px}
      .gantt-filter-group,.gantt-scale-group{display:flex;align-items:center;gap:5px;flex-wrap:wrap}
      .gantt-toolbar-label{font-size:10px;color:var(--muted);margin-right:3px;text-transform:uppercase;letter-spacing:.45px;font-weight:700}
      .gantt-tool-btn{border:1px solid transparent;background:#f3f7f7;color:#53696a;border-radius:7px;padding:6px 9px;font:inherit;font-size:11px;cursor:pointer;white-space:nowrap}
      .gantt-tool-btn:hover{border-color:#b9caca}
      .gantt-tool-btn.active{background:#dff9f5;color:#0f6962;border-color:#9edfd7;font-weight:700}
      .gantt-legend{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:7px 2px 10px;font-size:10px;color:#53696a}
      .gantt-legend-item{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
      .gantt-legend-dot{width:9px;height:9px;border-radius:3px;display:inline-block}
      .gantt-wrap.gantt-focus-wrap{max-height:calc(100vh - 315px);min-height:390px;background:#fff;border:1px solid var(--line);border-radius:12px;overflow:auto;box-shadow:0 4px 14px rgba(20,45,46,.05)}
      .gantt-focus-wrap .gantt-head,.gantt-focus-wrap .gantt-row{display:grid;grid-template-columns:490px minmax(760px,1fr);min-width:1250px}
      .gantt-focus-wrap .gantt-head{position:sticky;top:0;z-index:20;background:#edf3f3;border-bottom:1px solid #cfdada;min-height:51px}
      .gantt-meta-head{position:sticky;left:0;z-index:23;background:#edf3f3;display:grid;grid-template-columns:145px 105px 95px 75px 70px;border-right:1px solid #cfdada}
      .gantt-meta-head>div{display:flex;align-items:center;padding:9px 7px;border-right:1px solid #d7e1e1;font-size:9px;color:#53696a;font-weight:700;line-height:1.2}
      .gantt-meta-head>div:last-child{border-right:0}
      .gantt-timeline-head{position:relative;display:flex;min-width:760px;overflow:hidden}
      .gantt-time-segment{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-width:0;border-right:1px solid #d6e0e0;font-size:10px;font-weight:700;color:#455e5f}
      .gantt-time-segment small{font-size:8px;color:#7b8d8e;font-weight:400;white-space:nowrap}
      .gantt-focus-wrap .gantt-row{position:relative;min-height:62px;border-bottom:1px solid #e2e9e9}
      .gantt-focus-wrap .gantt-row:nth-child(odd){background:#fbfdfd}
      .gantt-focus-wrap .gantt-row:hover{background:#f3fbfa}
      .gantt-meta{position:sticky;left:0;z-index:8;display:grid;grid-template-columns:145px 105px 95px 75px 70px;background:inherit;border-right:1px solid #d5dfdf}
      .gantt-cell{display:flex;flex-direction:column;justify-content:center;gap:3px;padding:8px 7px;border-right:1px solid #e0e7e7;min-width:0;font-size:10px;line-height:1.25}
      .gantt-cell:last-child{border-right:0}
      .gantt-name-cell b{font-size:11px;line-height:1.28}
      .gantt-period-cell{font-variant-numeric:tabular-nums;color:#455e5f}
      .gantt-period-cell b{font-size:10px;color:var(--text)}
      .gantt-status-badge{display:inline-flex;width:max-content;max-width:100%;padding:3px 6px;border-radius:999px;font-size:9px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .gantt-status-badge.notstarted{background:#edf2f2;color:#66797a}
      .gantt-status-badge.work{background:#e3faf7;color:#0f6962}
      .gantt-status-badge.done{background:#e5f7ef;color:#227457}
      .gantt-status-badge.problem{background:#fdeaea;color:#a53636}
      .gantt-mini-progress{height:4px;border-radius:99px;background:#e4ecec;overflow:hidden;margin-top:2px}
      .gantt-mini-progress>span{display:block;height:100%;background:var(--accent-dark);border-radius:99px}
      .gantt-due-cell b{font-size:11px;font-variant-numeric:tabular-nums}
      .gantt-change-label{font-size:8px;color:#738687;line-height:1.2}
      .gantt-change-label.extended{color:#946a00;font-weight:700}
      .gantt-change-label.shortened{color:#526667;font-weight:700}
      .gantt-action-cell{align-items:flex-start}
      .gantt-action-cell .btn{padding:5px 7px;font-size:9px;white-space:nowrap;border-radius:6px}
      .gantt-action-note{font-size:8px;color:#8a9696;line-height:1.2}
      .gantt-track{position:relative;min-height:62px;overflow:hidden;min-width:760px;background:rgba(255,255,255,.3)}
      .gantt-grid-line{position:absolute;top:0;bottom:0;width:1px;background:#dfe6e6;pointer-events:none}
      .gantt-bar{position:absolute;top:16px;height:30px;border-radius:7px;box-shadow:0 2px 5px rgba(15,105,98,.12);overflow:hidden;display:flex;align-items:center;min-width:5px}
      .gantt-bar-label{position:relative;z-index:2;padding-left:7px;font-size:9px;font-weight:700;white-space:nowrap;color:#173233;text-shadow:0 1px 0 rgba(255,255,255,.4)}
      .gantt-bar-label.light{color:#fff;text-shadow:none}
      .gantt-extension{position:absolute;top:16px;height:30px;background:repeating-linear-gradient(135deg,#d99000 0,#d99000 6px,#ffe5a8 6px,#ffe5a8 12px);border:1px solid #b67a00;border-radius:0 7px 7px 0;box-shadow:none}
      .gantt-today-line{position:absolute;top:0;bottom:0;width:2px;background:#d95c5c;z-index:5;pointer-events:none}
      .gantt-today-line:after{content:'';position:absolute;top:0;left:-3px;width:8px;height:8px;border-radius:50%;background:#d95c5c}
      .gantt-today-head{position:absolute;top:0;bottom:0;width:2px;background:#d95c5c;z-index:7;pointer-events:none}
      .gantt-today-head span{position:absolute;top:3px;left:5px;background:#fff1f1;color:#a53636;border:1px solid #efc3c3;border-radius:5px;padding:2px 4px;font-size:8px;font-weight:700;white-space:nowrap}
      .gantt-reschedule-form{grid-column:1/-1;display:none;background:#f8fbfb;border-top:1px solid #dbe5e5;padding:10px 12px;position:relative;z-index:25}
      .gantt-reschedule-grid{display:grid;grid-template-columns:150px minmax(220px,1fr) auto auto;gap:8px;align-items:center}
      .gantt-reschedule-grid input{min-width:0;padding:8px 9px;border:1px solid var(--line);border-radius:7px;font:inherit;font-size:11px;background:#fff}
      .gantt-empty{grid-column:1/-1;padding:28px;text-align:center;color:var(--muted);font-size:12px;background:#fff}
      .gantt-footer-focus{display:flex;gap:18px;flex-wrap:wrap;margin-top:9px;padding:8px 10px;background:#fff;border:1px solid var(--line);border-radius:9px;font-size:10px;color:var(--muted)}
      .gantt-footer-focus b{color:var(--text)}
      @media(max-width:900px){
        .gantt-kpis{grid-template-columns:repeat(2,1fr)}
        .gantt-focus-wrap .gantt-head,.gantt-focus-wrap .gantt-row{grid-template-columns:490px minmax(720px,1fr);min-width:1210px}
        .gantt-wrap.gantt-focus-wrap{max-height:none}
      }
    `;
    document.head.appendChild(style);
  }

  function startOfLocalDay(ts) {
    const d = new Date(ts);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }

  function addCalendarDays(ts, days) {
    const d = new Date(startOfLocalDay(ts));
    d.setDate(d.getDate() + days);
    return d.getTime();
  }

  function dayOffset(fromTs, toTs) {
    return Math.round((startOfLocalDay(toTs) - startOfLocalDay(fromTs)) / DAY_MS);
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

  function shortDate(ts) {
    return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(new Date(ts));
  }

  function monthName(ts) {
    const text = new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(new Date(ts));
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function originalDue(task, projectStart) {
    return endOfLocalDay(toDateInput(addCalendarDays(projectStart, task.end)));
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
    return endOfLocalDay(custom) || originalDue(task, projectStart);
  }

  function effectiveEndDay(task, projectStart) {
    return Math.max(task.start + 1, dayOffset(projectStart, effectiveDue(task, projectStart)));
  }

  function taskState(task, projectStart, now) {
    const status = getStageStatus(task.id);
    const percent = getStageProgress(task.id);
    const due = effectiveDue(task, projectStart);
    const baseDue = originalDue(task, projectStart);
    const start = addCalendarDays(projectStart, task.start);
    const overdue = isStarted() && status !== 'Завершено' && now > due;
    const customDue = localStorage.getItem(dueKey(task.id));
    const changed = Boolean(customDue);
    const extended = changed && due > baseDue;
    const shortened = changed && due < baseDue;
    const deltaDays = changed ? dayOffset(baseDue, due) : 0;
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

  function stateGroup(state) {
    if (state.overdue || state.status === 'Блокер') return 'problem';
    if (state.percent >= 100 || state.status === 'Завершено') return 'done';
    if (state.percent > 0) return 'work';
    return 'notstarted';
  }

  function readinessColor(state) {
    const group = stateGroup(state);
    if (group === 'problem') return COLORS.blocker;
    if (group === 'done') return COLORS.done;
    if (state.percent >= 75) return COLORS.high;
    if (state.percent >= 40) return COLORS.medium;
    if (state.percent > 0) return COLORS.low;
    return COLORS.notStarted;
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
    const taskStart = addCalendarDays(projectStart, task.start);

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
    return `<div class="gantt-reschedule-form" data-reschedule-form="${state.id}">
      <div class="gantt-reschedule-grid">
        <input type="date" class="gantt-new-due" data-id="${state.id}" min="${min}" value="${value}">
        <input type="text" class="gantt-reschedule-reason" data-id="${state.id}" placeholder="Причина изменения срока${state.extended ? '' : ' (обязательна при продлении)'}">
        <button class="btn primary gantt-save-due" data-id="${state.id}">Сохранить</button>
        ${state.changed ? `<button class="btn gantt-reset-due" data-id="${state.id}">Вернуть базовый</button>` : '<span></span>'}
      </div>
    </div>`;
  }

  function timelineSegments(projectStart, horizonDays) {
    if (scaleMode === 'months') {
      const out = [];
      let startDay = 0;
      while (startDay < horizonDays) {
        const date = new Date(addCalendarDays(projectStart, startDay));
        const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime();
        let endDay = Math.min(horizonDays, dayOffset(projectStart, nextMonth));
        if (endDay <= startDay) endDay = Math.min(horizonDays, startDay + 1);
        out.push({
          start: startDay,
          end: endDay,
          label: monthName(date.getTime()),
          sub: `${shortDate(addCalendarDays(projectStart, startDay))} - ${shortDate(addCalendarDays(projectStart, endDay - 1))}`
        });
        startDay = endDay;
      }
      return out;
    }

    const out = [];
    for (let d = 0, n = 1; d < horizonDays; d += 7, n++) {
      const end = Math.min(horizonDays, d + 7);
      out.push({
        start: d,
        end,
        label: `Н${n}`,
        sub: `${shortDate(addCalendarDays(projectStart, d))} - ${shortDate(addCalendarDays(projectStart, end - 1))}`
      });
    }
    return out;
  }

  function renderTimelineHead(segments, horizonDays, todayPct) {
    return `<div class="gantt-timeline-head">
      ${segments.map(seg => `<div class="gantt-time-segment" style="width:${(seg.end - seg.start) / horizonDays * 100}%"><span>${seg.label}</span><small>${seg.sub}</small></div>`).join('')}
      ${todayPct !== null ? `<div class="gantt-today-head" style="left:${todayPct}%"><span>Сегодня</span></div>` : ''}
    </div>`;
  }

  function gridLines(segments, horizonDays) {
    return segments.slice(1).map(seg => `<span class="gantt-grid-line" style="left:${seg.start / horizonDays * 100}%"></span>`).join('');
  }

  function filterStates(states) {
    if (activeFilter === 'all') return states;
    return states.filter(state => stateGroup(state) === activeFilter);
  }

  function statusBadge(state) {
    const group = stateGroup(state);
    const label = state.overdue ? 'Просрочено' : state.status;
    return `<span class="gantt-status-badge ${group}">${label}</span>`;
  }

  function changeLabel(state) {
    if (state.extended) return `<span class="gantt-change-label extended">+${Math.max(1, state.deltaDays)} дн.</span>`;
    if (state.shortened) return `<span class="gantt-change-label shortened">-${Math.abs(state.deltaDays)} дн.</span>`;
    return `<span class="gantt-change-label">Базовый</span>`;
  }

  function barLabelClass(state) {
    return stateGroup(state) === 'done' || stateGroup(state) === 'problem' || state.percent >= 75 ? 'light' : '';
  }

  function renderRow(state, projectStart, horizonDays, segments, todayPct) {
    const currentEndDay = effectiveEndDay(state, projectStart);
    const originalEndDay = state.end;
    const color = readinessColor(state);
    const left = state.start / horizonDays * 100;
    const currentWidth = Math.max(.7, (currentEndDay - state.start) / horizonDays * 100);
    const originalWidth = Math.max(.7, (originalEndDay - state.start) / horizonDays * 100);
    const extensionLeft = originalEndDay / horizonDays * 100;
    const extensionWidth = Math.max(0, (currentEndDay - originalEndDay) / horizonDays * 100);
    const dueText = formatDate(state.due);
    const label = currentWidth >= 5 ? `<span class="gantt-bar-label ${barLabelClass(state)}">${state.percent}%</span>` : '';

    const transferButton = isStarted()
      ? `<button class="btn gantt-reschedule-btn" data-id="${state.id}">Изменить</button>`
      : `<button class="btn gantt-reschedule-btn" data-id="${state.id}" disabled title="Сроки доступны после старта проекта" style="opacity:.45;cursor:not-allowed">Изменить</button><span class="gantt-action-note">После старта</span>`;

    let barHtml = '';
    if (state.extended) {
      barHtml = `<div class="gantt-bar" title="${state.name}. Базовый срок до ${formatDate(state.originalDue)}" style="left:${left}%;width:${originalWidth}%;background:${color}">${label}</div>
        <div class="gantt-extension" title="Продление +${Math.max(1, state.deltaDays)} дн. до ${dueText}" style="left:${extensionLeft}%;width:${extensionWidth}%"></div>`;
    } else {
      barHtml = `<div class="gantt-bar" title="${state.name}: ${state.percent}% · ${state.status}" style="left:${left}%;width:${currentWidth}%;background:${color}">${label}</div>`;
    }

    return `<div class="gantt-row">
      <div class="gantt-meta">
        <div class="gantt-cell gantt-name-cell"><b>${state.name}</b></div>
        <div class="gantt-cell gantt-period-cell"><b>${formatDate(state.startDate)}</b><span>${dueText}</span></div>
        <div class="gantt-cell"><b>${state.percent}%</b>${statusBadge(state)}<div class="gantt-mini-progress"><span style="width:${Math.max(0, Math.min(100, state.percent))}%"></span></div></div>
        <div class="gantt-cell gantt-due-cell"><b>${formatDate(state.originalDue)}</b>${changeLabel(state)}</div>
        <div class="gantt-cell gantt-action-cell">${transferButton}</div>
      </div>
      <div class="gantt-track">
        ${gridLines(segments, horizonDays)}
        ${todayPct !== null ? `<div class="gantt-today-line" style="left:${todayPct}%"></div>` : ''}
        ${barHtml}
      </div>
      ${renderRescheduleForm(state)}
    </div>`;
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
    ensureStyles();
    const content = document.querySelector('.content');
    if (content) content.classList.add('gantt-content-focus');

    const projectStart = startTs();
    const now = Date.now();
    const states = TASKS.map(task => taskState(task, projectStart, now));
    states.forEach(ensureOverdueBlocker);

    const maxEndDay = Math.max(90, ...states.map(state => effectiveEndDay(state, projectStart)));
    const horizonDays = Math.max(91, Math.ceil((maxEndDay + 1) / 7) * 7);
    const segments = timelineSegments(projectStart, horizonDays);
    const todayDay = dayOffset(projectStart, now);
    const todayPct = todayDay >= 0 && todayDay <= horizonDays ? todayDay / horizonDays * 100 : null;
    const visibleStates = filterStates(states);

    const counts = states.reduce((acc, state) => {
      acc[stateGroup(state)]++;
      return acc;
    }, { notstarted: 0, work: 0, problem: 0, done: 0 });

    const legend = `<div class="gantt-legend">
      <span class="gantt-legend-item"><i class="gantt-legend-dot" style="background:${COLORS.notStarted}"></i>Не начато</span>
      <span class="gantt-legend-item"><i class="gantt-legend-dot" style="background:${COLORS.low}"></i>Начало</span>
      <span class="gantt-legend-item"><i class="gantt-legend-dot" style="background:${COLORS.medium}"></i>В работе</span>
      <span class="gantt-legend-item"><i class="gantt-legend-dot" style="background:${COLORS.high}"></i>Близко к завершению</span>
      <span class="gantt-legend-item"><i class="gantt-legend-dot" style="background:${COLORS.done}"></i>Готово</span>
      <span class="gantt-legend-item"><i class="gantt-legend-dot" style="background:${COLORS.blocker}"></i>Блокер / просрочка</span>
      <span class="gantt-legend-item"><i class="gantt-legend-dot" style="background:repeating-linear-gradient(135deg,#d99000 0,#d99000 4px,#ffe5a8 4px,#ffe5a8 8px);border:1px solid #b67a00"></i>Продление</span>
    </div>`;

    return `<div class="gantt-dashboard">
      <div class="gantt-title-row"><div><h2>Диаграмма Ганта</h2><small>Основной контроль сроков и готовности проекта</small></div><small>${isStarted() ? `Старт проекта: ${formatDate(projectStart)}` : 'Проект еще не запущен'}</small></div>
      <div class="gantt-info"><b>${isStarted() ? 'Проект запущен.' : 'Проект еще не запущен.'}</b><span>${isStarted() ? 'Изменяй сроки прямо в строке этапа. Продление выделяется штриховкой.' : 'Сроки станут доступны для изменения после нажатия «Старт проекта».'}</span></div>
      <div class="gantt-kpis">
        <div class="gantt-kpi"><span>Всего этапов</span><b>${states.length}</b></div>
        <div class="gantt-kpi"><span>В работе</span><b>${counts.work}</b></div>
        <div class="gantt-kpi"><span>Просрочено / блокер</span><b>${counts.problem}</b></div>
        <div class="gantt-kpi"><span>Завершено</span><b>${counts.done}</b></div>
      </div>
      <div class="gantt-toolbar">
        <div class="gantt-filter-group"><span class="gantt-toolbar-label">Показать</span>
          <button class="gantt-tool-btn gantt-filter-btn ${activeFilter === 'all' ? 'active' : ''}" data-filter="all">Все ${states.length}</button>
          <button class="gantt-tool-btn gantt-filter-btn ${activeFilter === 'work' ? 'active' : ''}" data-filter="work">В работе ${counts.work}</button>
          <button class="gantt-tool-btn gantt-filter-btn ${activeFilter === 'problem' ? 'active' : ''}" data-filter="problem">Проблемные ${counts.problem}</button>
          <button class="gantt-tool-btn gantt-filter-btn ${activeFilter === 'done' ? 'active' : ''}" data-filter="done">Завершено ${counts.done}</button>
          <button class="gantt-tool-btn gantt-filter-btn ${activeFilter === 'notstarted' ? 'active' : ''}" data-filter="notstarted">Не начато ${counts.notstarted}</button>
        </div>
        <div class="gantt-scale-group"><span class="gantt-toolbar-label">Масштаб</span>
          <button class="gantt-tool-btn gantt-scale-btn ${scaleMode === 'weeks' ? 'active' : ''}" data-scale="weeks">Недели</button>
          <button class="gantt-tool-btn gantt-scale-btn ${scaleMode === 'months' ? 'active' : ''}" data-scale="months">Месяцы</button>
        </div>
      </div>
      ${legend}
      <div class="gantt-wrap gantt-focus-wrap">
        <div class="gantt-head">
          <div class="gantt-meta-head">
            <div>Этап</div><div>Период</div><div>Статус</div><div>Базовый срок</div><div>Действие</div>
          </div>
          ${renderTimelineHead(segments, horizonDays, todayPct)}
        </div>
        ${visibleStates.length ? visibleStates.map(state => renderRow(state, projectStart, horizonDays, segments, todayPct)).join('') : '<div class="gantt-empty">По выбранному фильтру этапов нет.</div>'}
      </div>
      <div class="gantt-footer-focus"><span>Старт: <b>${formatDate(projectStart)}</b></span><span>Базовое завершение: <b>${formatDate(addCalendarDays(projectStart, 90))}</b></span><span>Базовый горизонт: <b>90 дней</b></span><span>Показано: <b>${visibleStates.length} из ${states.length}</b></span></div>
    </div>`;
  };

  document.addEventListener('click', event => {
    const nav = event.target.closest('.nav');
    if (nav && nav.dataset.view !== 'gantt') {
      const content = document.querySelector('.content');
      if (content) content.classList.remove('gantt-content-focus');
    }

    const filter = event.target.closest('.gantt-filter-btn');
    if (filter) {
      activeFilter = filter.dataset.filter || 'all';
      render('gantt');
      return;
    }

    const scale = event.target.closest('.gantt-scale-btn');
    if (scale) {
      scaleMode = scale.dataset.scale === 'months' ? 'months' : 'weeks';
      render('gantt');
      return;
    }

    const toggle = event.target.closest('.gantt-reschedule-btn');
    if (toggle) {
      if (toggle.disabled) return;
      const form = document.querySelector(`[data-reschedule-form="${toggle.dataset.id}"]`);
      if (form) form.style.display = form.style.display === 'block' ? 'none' : 'block';
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
    if (reset) resetDue(Number(reset.dataset.id));
  });
})();