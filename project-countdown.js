(function () {
  const START_KEY = 'atom-project-started-at';
  const PROJECT_DURATION_MS = 90 * 24 * 60 * 60 * 1000;
  let countdownTimer = null;

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function formatRemaining(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    return `${pad(days)} дн. ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  function formatFinish(ts) {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(ts));
  }

  function ensureCountdown() {
    const card = document.querySelector('.project-start-card');
    if (!card || document.getElementById('project-countdown')) return;

    const wrap = document.createElement('div');
    wrap.className = 'project-countdown-wrap';
    wrap.innerHTML = `
      <div class="label">До завершения проекта</div>
      <div id="project-countdown" class="project-timer">90 дн. 00:00:00</div>
      <div id="project-finish-at" class="start-meta">Отсчет начнется после старта</div>
    `;

    const button = card.querySelector('#start-project-btn');
    if (button) card.insertBefore(wrap, button);
    else card.appendChild(wrap);

    if (!document.getElementById('project-countdown-style')) {
      const style = document.createElement('style');
      style.id = 'project-countdown-style';
      style.textContent = `
        .project-countdown-wrap{min-width:230px}
        .project-countdown-wrap .project-timer{white-space:nowrap}
        @media(max-width:900px){.project-countdown-wrap{min-width:0;width:100%}}
      `;
      document.head.appendChild(style);
    }
  }

  function updateCountdown() {
    ensureCountdown();
    const counter = document.getElementById('project-countdown');
    const finishLabel = document.getElementById('project-finish-at');
    if (!counter || !finishLabel) return;

    const rawStart = localStorage.getItem(START_KEY);
    if (!rawStart) {
      if (counter.textContent !== '90 дн. 00:00:00') counter.textContent = '90 дн. 00:00:00';
      if (finishLabel.textContent !== 'Отсчет начнется после старта') finishLabel.textContent = 'Отсчет начнется после старта';
      return;
    }

    const start = Number(rawStart);
    const finish = start + PROJECT_DURATION_MS;
    const remaining = finish - Date.now();
    const counterText = formatRemaining(remaining);
    const finishText = remaining > 0
      ? `Плановое завершение: ${formatFinish(finish)}`
      : `Плановый срок истек: ${formatFinish(finish)}`;

    if (counter.textContent !== counterText) counter.textContent = counterText;
    if (finishLabel.textContent !== finishText) finishLabel.textContent = finishText;
  }

  const appRoot = document.getElementById('app');
  if (appRoot) {
    const observer = new MutationObserver(() => requestAnimationFrame(updateCountdown));
    observer.observe(appRoot, { childList: true });
  }

  countdownTimer = setInterval(updateCountdown, 1000);
  updateCountdown();
})();
