import { getState, setState } from '../core/store.js';

const DEFAULT_MINUTES = 25;
const PRESETS = [25, 50, 90];

function uid(prefix = 'focus') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

function getFocus(state = getState()) {
  const f = state.focus || {};
  const minutes = Math.max(1, Number(f.minutes) || DEFAULT_MINUTES);
  const baseSeconds = minutes * 60;
  const secondsLeft = Math.max(0, Number(f.secondsLeft) || baseSeconds);
  return {
    minutes,
    running: Boolean(f.running),
    startedAt: Number(f.startedAt) || null,
    secondsLeft
  };
}

export function getRemainingSeconds(focus = getFocus()) {
  if (!focus.running || !focus.startedAt) return Math.max(0, focus.secondsLeft);
  return Math.max(0, focus.secondsLeft - Math.floor((Date.now() - focus.startedAt) / 1000));
}

function persistFocus(focus) {
  setState({ focus: { ...focus } });
}

function createLog(focus, status, actualSeconds) {
  const plannedSeconds = Math.max(0, Number(focus.minutes) || DEFAULT_MINUTES) * 60;
  const safeActual = Math.max(0, Math.min(plannedSeconds, Math.floor(Number(actualSeconds) || 0)));
  const startedAt = focus.startedAt ? new Date(focus.startedAt).toISOString() : new Date().toISOString();
  const endedAt = new Date().toISOString();
  return {
    id: uid(),
    startedAt,
    endedAt,
    plannedSeconds,
    actualSeconds: safeActual,
    status,
    subject: '',
    taskId: null
  };
}

function finishSession(status = 'completed') {
  const state = getState();
  const focus = getFocus(state);
  const remaining = getRemainingSeconds(focus);
  const actualSeconds = Math.max(0, focus.secondsLeft - remaining);
  const log = createLog(focus, status, actualSeconds);
  const logs = [log, ...(state.focusLogs || [])].slice(0, 500);
  setState({
    focus: { minutes: focus.minutes, running: false, startedAt: null, secondsLeft: focus.minutes * 60 },
    focusLogs: logs,
    focusSessions: (state.focusSessions || 0) + (status === 'completed' ? 1 : 0)
  });
  window.dispatchEvent(new CustomEvent('scholaros:focus-finished', { detail: { log } }));
}

export function tickFocus() {
  const focus = getFocus();
  const remaining = getRemainingSeconds(focus);
  const timer = document.getElementById('focusTimer');
  if (timer) timer.textContent = formatTime(remaining);
  if (focus.running && remaining <= 0) finishSession('completed');
}

function startFocus() {
  const focus = getFocus();
  const remaining = getRemainingSeconds(focus);
  if (remaining <= 0) {
    persistFocus({ ...focus, running: false, startedAt: null, secondsLeft: focus.minutes * 60 });
    return;
  }
  persistFocus({ ...focus, running: true, startedAt: Date.now(), secondsLeft: remaining });
}

function pauseFocus() {
  const focus = getFocus();
  const remaining = getRemainingSeconds(focus);
  persistFocus({ ...focus, running: false, startedAt: null, secondsLeft: remaining });
}

function resetFocus() {
  const focus = getFocus();
  if (focus.running) finishSession('stopped');
  else persistFocus({ minutes: focus.minutes, running: false, startedAt: null, secondsLeft: focus.minutes * 60 });
}

export function handleFocusAction(action, target) {
  if (!action) return null;
  if (action === 'focus-preset') {
    const minutes = PRESETS.includes(Number(target?.dataset?.min)) ? Number(target.dataset.min) : DEFAULT_MINUTES;
    persistFocus({ minutes, running: false, startedAt: null, secondsLeft: minutes * 60 });
    return 'refresh';
  }
  if (action === 'focus-toggle') {
    const focus = getFocus();
    if (focus.running) pauseFocus();
    else startFocus();
    return 'refresh';
  }
  if (action === 'focus-reset') {
    resetFocus();
    return 'refresh';
  }
  return null;
}

export function focus() {
  const state = getState();
  const f = getFocus(state);
  const remaining = getRemainingSeconds(f);
  const logs = state.focusLogs || [];
  const today = new Date().toISOString().slice(0, 10);
  const todayCompleted = logs.filter(log => log.startedAt?.slice(0, 10) === today && log.status === 'completed').length;
  return {
    title: 'Focus',
    description: 'Tập trung vào một việc trong một khoảng thời gian rõ ràng.',
    render: () => `<div class="focus-layout">
      <section class="card focus-card">
        <span class="eyebrow">FOCUS SESSION</span>
        <div class="timer" id="focusTimer">${formatTime(remaining)}</div>
        <div class="timer-status">${f.running ? 'Đang tập trung' : 'Sẵn sàng'}</div>
        <div class="focus-controls">
          <button class="button primary" data-action="focus-toggle">${f.running ? 'Tạm dừng' : 'Bắt đầu'}</button>
          <button class="button" data-action="focus-reset">Đặt lại</button>
        </div>
        <div class="focus-presets">
          ${PRESETS.map(minutes => `<button class="button ${f.minutes === minutes && !f.running ? 'primary' : ''}" data-action="focus-preset" data-min="${minutes}">${minutes} phút</button>`).join('')}
        </div>
      </section>
      <section class="card">
        <div class="module-toolbar">
          <div><h2>Phiên hôm nay</h2><p class="muted">${todayCompleted} phiên hoàn thành.</p></div>
          <button class="button" data-route="focus-logs">Xem Focus Logs →</button>
        </div>
        <hr>
        <p class="muted">Focus được quản lý bởi một timer engine duy nhất, nên Dashboard và Focus Logs có thể dùng chung dữ liệu.</p>
      </section>
    </div>`
  };
}

export function focusLogs() {
  const logs = getState().focusLogs || [];
  const completed = logs.filter(log => log.status === 'completed');
  const totalSeconds = completed.reduce((sum, log) => sum + (Number(log.actualSeconds) || 0), 0);
  const fmtDuration = seconds => {
    const safe = Math.max(0, Math.floor(Number(seconds) || 0));
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    return h ? `${h}h ${m}m` : `${m} phút`;
  };
  const fmtDate = value => new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
  return {
    title: 'Focus Logs',
    description: 'Lịch sử các phiên tập trung và thời gian học thực tế.',
    render: () => `<div class="stat-grid">
      <article class="card stat-card"><span>Phiên hoàn thành</span><strong>${completed.length}</strong><span>tổng cộng</span></article>
      <article class="card stat-card"><span>Thời gian tập trung</span><strong>${fmtDuration(totalSeconds)}</strong><span>từ các phiên hoàn thành</span></article>
    </div>
    <div class="card">
      <div class="module-toolbar"><div><h2 class="section-title">Lịch sử Focus</h2><p class="muted">Các phiên mới nhất được hiển thị trước.</p></div><button class="button" data-route="focus">← Quay lại Focus</button></div>
      <div class="task-list">${logs.length ? logs.map(log => `<article class="list-row">
        <div class="list-main"><strong>${log.status === 'completed' ? '✓ Hoàn thành' : '○ Dừng sớm'}</strong><span>${fmtDate(log.startedAt)} · ${fmtDuration(log.actualSeconds)} / ${fmtDuration(log.plannedSeconds)}</span></div>
      </article>`).join('') : `<div class="empty-state"><strong>Chưa có Focus Log</strong>Hoàn thành hoặc dừng một phiên Focus để lịch sử xuất hiện ở đây.</div>`}</div>
    </div>`
  };
}

setInterval(tickFocus, 1000);
