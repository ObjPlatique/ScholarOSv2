import { getState, setState } from '../core/store.js';

const DEFAULT_MINUTES = 25;

function normalizeFocus(raw) {
  const minutes = Number(raw?.minutes) || DEFAULT_MINUTES;
  const secondsLeft = Number.isFinite(Number(raw?.secondsLeft))
    ? Math.max(0, Math.floor(Number(raw.secondsLeft)))
    : minutes * 60;
  return {
    minutes,
    running: Boolean(raw?.running),
    startedAt: raw?.startedAt ? Number(raw.startedAt) : null,
    secondsLeft
  };
}

function formatTime(seconds) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

function remainingSeconds(focus, now = Date.now()) {
  const f = normalizeFocus(focus);
  if (!f.running || !f.startedAt) return f.secondsLeft;
  return Math.max(0, f.secondsLeft - Math.floor((now - f.startedAt) / 1000));
}

function saveLog(status, plannedMinutes, actualSeconds, startedAt = null) {
  const state = getState();
  const log = {
    id: `focus-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: new Date().toISOString(),
    status,
    plannedMinutes,
    actualSeconds: Math.max(0, Math.floor(actualSeconds)),
    startedAt: startedAt || null
  };
  setState({
    focusLogs: [log, ...(state.focusLogs || [])].slice(0, 100),
    focusSessions: status === 'completed' ? (state.focusSessions || 0) + 1 : (state.focusSessions || 0)
  });
}

function todayCompletedCount() {
  const key = new Date().toISOString().slice(0, 10);
  return (getState().focusLogs || []).filter(
    log => log.status === 'completed' && String(log.date).slice(0, 10) === key
  ).length;
}

function renderLog(log) {
  const status = log.status === 'completed' ? 'Hoàn thành' : 'Dừng sớm';
  const icon = log.status === 'completed' ? '✓' : '—';
  const actualMinutes = Math.floor((Number(log.actualSeconds) || 0) / 60);
  const actualSeconds = (Number(log.actualSeconds) || 0) % 60;
  const date = new Date(log.date);
  const dateText = Number.isNaN(date.getTime()) ? 'Không rõ thời gian' : date.toLocaleString('vi-VN');

  return `<article class="focus-log-row">
    <div class="focus-log-icon ${log.status === 'completed' ? 'completed' : 'stopped'}">${icon}</div>
    <div class="focus-log-main">
      <strong>${status} · ${log.plannedMinutes} phút</strong>
      <span>${dateText}</span>
    </div>
    <div class="focus-log-duration">${actualMinutes}:${String(actualSeconds).padStart(2, '0')}</div>
  </article>`;
}

function renderLogsSection() {
  const logs = getState().focusLogs || [];

  return `
    <section class="focus-logs-section" aria-labelledby="focusLogsTitle">
      <div class="module-toolbar">
        <div>
          <h2 class="section-title" id="focusLogsTitle">Focus Logs</h2>
          <p class="muted">${logs.length} phiên đã được ghi nhận.</p>
        </div>
        <button class="button" data-action="focus-logs-clear" ${logs.length ? '' : 'disabled'}>Xóa lịch sử</button>
      </div>
      ${logs.length
        ? `<div class="focus-log-list">${logs.map(renderLog).join('')}</div>`
        : `<div class="empty-state">
            <strong>Chưa có Focus Log</strong>
            Hoàn thành hoặc dừng một phiên Focus để lịch sử xuất hiện ở đây.
          </div>`}
    </section>`;
}

export function focus() {
  const f = normalizeFocus(getState().focus);

  return {
    title: 'Focus',
    description: 'Tập trung vào một việc trong một khoảng thời gian rõ ràng.',
    render: () => `
      <section class="card focus-card">
        <div class="focus-layout">
          <div class="focus-timer-panel">
            <span class="eyebrow">FOCUS SESSION</span>
            <div class="timer" id="focusTimer" aria-live="polite">${formatTime(remainingSeconds(f))}</div>
            <div class="timer-status" id="focusTimerStatus">${f.running ? 'Đang tập trung' : 'Sẵn sàng'}</div>
            <div class="focus-controls">
              <button class="button primary" data-action="focus-toggle">${f.running ? 'Tạm dừng' : 'Bắt đầu'}</button>
              <button class="button" data-action="focus-reset">Đặt lại</button>
            </div>
          </div>

          <div class="focus-settings-panel">
            <h2>Thời lượng</h2>
            <p class="muted">Chọn thời lượng trước khi bắt đầu phiên mới.</p>
            <div class="focus-presets">
              ${[25, 50, 90].map(min => `
                <button class="button ${f.minutes === min ? 'selected' : ''}" data-action="focus-preset" data-min="${min}">${min} phút</button>
              `).join('')}
            </div>
            <hr>
            <h2>Hôm nay</h2>
            <p class="muted">${todayCompletedCount()} phiên Focus hoàn thành.</p>
          </div>
        </div>

        <hr>
        ${renderLogsSection()}
      </section>`
  };
}

export function handleFocusAction(action, event, actionTarget = event?.currentTarget) {
  const state = getState();
  const f = normalizeFocus(state.focus);

  if (action === 'focus-preset') {
    if (f.running) return 'ignored';
    const minutes = Math.max(1, Number(actionTarget?.dataset?.min) || DEFAULT_MINUTES);
    setState({ focus: { minutes, running: false, startedAt: null, secondsLeft: minutes * 60 } });
    return 'refresh';
  }

  if (action === 'focus-toggle') {
    if (f.running) {
      const left = remainingSeconds(f);
      const actualSeconds = Math.max(0, f.minutes * 60 - left);
      setState({ focus: { ...f, running: false, startedAt: null, secondsLeft: left } });
      if (actualSeconds > 0) saveLog('stopped', f.minutes, actualSeconds, f.startedAt);
      return 'refresh';
    }

    if (f.secondsLeft <= 0) {
      setState({ focus: { ...f, running: false, startedAt: null, secondsLeft: f.minutes * 60 } });
    }

    setState({
      focus: {
        ...normalizeFocus(getState().focus),
        running: true,
        startedAt: Date.now()
      }
    });
    return 'refresh';
  }

  if (action === 'focus-reset') {
    const left = remainingSeconds(f);
    const actualSeconds = Math.max(0, f.minutes * 60 - left);
    if (f.running && actualSeconds > 0) saveLog('stopped', f.minutes, actualSeconds, f.startedAt);
    setState({ focus: { minutes: f.minutes, running: false, startedAt: null, secondsLeft: f.minutes * 60 } });
    return 'refresh';
  }

  if (action === 'focus-logs-clear') {
    if (!confirm('Xóa toàn bộ Focus Logs?')) return;
    setState({ focusLogs: [] });
    return 'refresh';
  }

  return null;
}

export function tickFocus(now = Date.now()) {
  const f = normalizeFocus(getState().focus);
  if (!f.running || !f.startedAt) return false;

  const left = remainingSeconds(f, now);
  const timer = document.getElementById('focusTimer');
  if (timer) timer.textContent = formatTime(left);

  const status = document.getElementById('focusTimerStatus');
  if (status) status.textContent = 'Đang tập trung';

  if (left > 0) return false;

  const actualSeconds = f.minutes * 60;
  setState({ focus: { ...f, running: false, startedAt: null, secondsLeft: 0 } });
  saveLog('completed', f.minutes, actualSeconds, f.startedAt);
  return true;
}

export function syncFocusTimer() {
  const f = normalizeFocus(getState().focus);
  const timer = document.getElementById('focusTimer');
  if (timer) timer.textContent = formatTime(remainingSeconds(f));
  const status = document.getElementById('focusTimerStatus');
  if (status) status.textContent = f.running ? 'Đang tập trung' : 'Sẵn sàng';
}
