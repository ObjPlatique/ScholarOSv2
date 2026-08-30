/* Live current-time line for the weekly/daily schedule. UI-only: it never reads or writes ScholarOS state. */
(() => {
  const HOUR_HEIGHT_FALLBACK = 64;
  const START_MINUTE = 7 * 60;
  const END_MINUTE = 22 * 60;
  let timer = null;
  let observer = null;
  let updating = false;

  function getTodayColumn() {
    const app = document.getElementById('appView');
    if (!app || !location.hash.replace(/^#/, '').startsWith('schedule')) return null;
    const heads = [...app.querySelectorAll('.schedule-day-head')];
    const index = heads.findIndex(h => h.classList.contains('today'));
    if (index < 0) return null;
    return [...app.querySelectorAll('.schedule-day-column')][index] || null;
  }

  function ensureStyles() {
    if (document.getElementById('scholar-current-time-style')) return;
    const style = document.createElement('style');
    style.id = 'scholar-current-time-style';
    style.textContent = `
      .schedule-current-time-indicator{position:absolute;left:0;right:0;height:0;z-index:20;pointer-events:none;display:flex;align-items:center;}
      .schedule-current-time-indicator::before{content:"";position:absolute;left:0;right:0;top:0;height:2px;background:var(--primary,#2563eb);}
      .schedule-current-time-label{position:absolute;left:4px;top:-11px;padding:2px 7px;border-radius:999px;background:var(--primary,#2563eb);color:#fff;font-size:11px;font-weight:800;line-height:18px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.15);}
      @media (max-width:620px){.schedule-current-time-label{left:3px;font-size:10px;padding:1px 6px;}}
    `;
    document.head.appendChild(style);
  }

  function update() {
    if (updating) return;
    updating = true;
    observer?.disconnect();
    try {
      const app = document.getElementById('appView');
      app?.querySelectorAll('.schedule-current-time-indicator').forEach(el => el.remove());
      const column = getTodayColumn();
      if (!column) return;
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
      if (minutes < START_MINUTE || minutes > END_MINUTE) return;
      const hourLines = [...column.querySelectorAll('.schedule-hour-line')];
      let hourHeight = HOUR_HEIGHT_FALLBACK;
      if (hourLines.length > 1) hourHeight = Math.max(1, hourLines[1].getBoundingClientRect().top - hourLines[0].getBoundingClientRect().top);
      const indicator = document.createElement('div');
      indicator.className = 'schedule-current-time-indicator';
      indicator.style.top = `${(minutes - START_MINUTE) / 60 * hourHeight}px`;
      const label = document.createElement('span');
      label.className = 'schedule-current-time-label';
      label.textContent = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
      indicator.appendChild(label);
      column.style.position = 'relative';
      column.appendChild(indicator);
    } finally {
      updating = false;
      if (observer) observer.observe(document.getElementById('appView'), { childList: true, subtree: true });
    }
  }

  function start() {
    ensureStyles();
    update();
    clearInterval(timer);
    timer = setInterval(update, 30000);
  }

  const app = document.getElementById('appView');
  if (!app) return;
  observer = new MutationObserver(() => { if (!updating) update(); });
  observer.observe(app, { childList: true, subtree: true });
  window.addEventListener('hashchange', update);
  window.addEventListener('resize', update);
  start();
})();
