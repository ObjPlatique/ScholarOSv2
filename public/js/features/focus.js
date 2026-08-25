import { getState, setState } from '../core/store.js';

const DEFAULT_MINUTES = 25;
const PRESETS = [25, 50, 90];
const MIN_MINUTES = 1;
const MAX_MINUTES = 240;

function uid(prefix = 'focus') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

function formatDuration(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m} phút`;
}

function formatLogDate(value) {
  return new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

function normalizeMinutes(value) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes)) return DEFAULT_MINUTES;
  return Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, Math.round(minutes)));
}

function getFocus(state = getState()) {
  const f = state.focus || {};
  const minutes = normalizeMinutes(f.minutes || DEFAULT_MINUTES);
  const plannedSeconds = minutes * 60;
  const startedAt = Number(f.startedAt) || null;
  const sessionStartedAt = Number(f.sessionStartedAt) || startedAt;
  const secondsLeft = Math.max(0, Number(f.secondsLeft) || plannedSeconds);
  return {
    minutes,
    running: Boolean(f.running),
    startedAt,
    sessionStartedAt,
    accumulatedSeconds: Math.max(0, Number(f.accumulatedSeconds) || 0),
    secondsLeft
  };
}

export function getRemainingSeconds(focus = getFocus()) {
  if (!focus.running || !focus.startedAt) return Math.max(0, focus.secondsLeft);
  return Math.max(0, focus.secondsLeft - Math.floor((Date.now() - focus.startedAt) / 1000));
}

function getActualSeconds(focus) {
  const currentSegment = focus.running && focus.startedAt
    ? Math.max(0, Math.floor((Date.now() - focus.startedAt) / 1000))
    : 0;
  return Math.max(0, focus.accumulatedSeconds + currentSegment);
}

function persistFocus(focus) {
  setState({ focus: { ...focus } });
}

function createLog(focus, status, actualSeconds) {
  const plannedSeconds = Math.max(0, Number(focus.minutes) || DEFAULT_MINUTES) * 60;
  const safeActual = Math.max(0, Math.min(plannedSeconds, Math.floor(Number(actualSeconds) || 0)));
  const startedAt = focus.sessionStartedAt || focus.startedAt || Date.now();
  return {
    id: uid(),
    startedAt: new Date(startedAt).toISOString(),
    endedAt: new Date().toISOString(),
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
  const actualSeconds = status === 'completed' ? focus.minutes * 60 : getActualSeconds(focus);
  const log = createLog(focus, status, actualSeconds);
  const logs = [log, ...(state.focusLogs || [])].slice(0, 500);
  setState({
    focus: { minutes: focus.minutes, running: false, startedAt: null, sessionStartedAt: null, accumulatedSeconds: 0, secondsLeft: focus.minutes * 60 },
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
    persistFocus({ minutes: focus.minutes, running: false, startedAt: null, sessionStartedAt: null, accumulatedSeconds: 0, secondsLeft: focus.minutes * 60 });
    return;
  }
  const now = Date.now();
  persistFocus({
    ...focus,
    running: true,
    startedAt: now,
    sessionStartedAt: focus.sessionStartedAt || now,
    secondsLeft: remaining
  });
}

function pauseFocus() {
  const focus = getFocus();
  const remaining = getRemainingSeconds(focus);
  const actual = getActualSeconds(focus);
  persistFocus({
    ...focus,
    running: false,
    startedAt: null,
    accumulatedSeconds: actual,
    secondsLeft: remaining
  });
}

function resetFocus() {
  const focus = getFocus();
  if (focus.sessionStartedAt && getActualSeconds(focus) > 0) finishSession('stopped');
  else persistFocus({ minutes: focus.minutes, running: false, startedAt: null, sessionStartedAt: null, accumulatedSeconds: 0, secondsLeft: focus.minutes * 60 });
}

function setFocusMinutes(minutes) {
  const safeMinutes = normalizeMinutes(minutes);
  persistFocus({ minutes: safeMinutes, running: false, startedAt: null, sessionStartedAt: null, accumulatedSeconds: 0, secondsLeft: safeMinutes * 60 });
}

export function handleFocusAction(action, target) {
  if (!action) return null;
  if (action === 'focus-preset') {
    const minutes = PRESETS.includes(Number(target?.dataset?.min)) ? Number(target.dataset.min) : DEFAULT_MINUTES;
    setFocusMinutes(minutes);
    return 'refresh';
  }
  if (action === 'focus-custom') {
    const form = target?.matches?.('form[data-action="focus-custom"]') ? target : document.querySelector('form[data-action="focus-custom"]');
    const input = form?.querySelector('input[name="minutes"]');
    if (!input) return 'handled';
    const value = Number(input.value);
    if (!Number.isFinite(value) || value < MIN_MINUTES || value > MAX_MINUTES) {
      input.setCustomValidity(`Nhập từ ${MIN_MINUTES} đến ${MAX_MINUTES} phút.`);
      input.reportValidity();
      input.setCustomValidity('');
      return 'handled';
    }
    setFocusMinutes(value);
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

function renderLogRows(logs) {
  if (!logs.length) return `<div class="empty-state"><strong>Chưa có Focus Log</strong><span>Hoàn thành hoặc dừng một phiên Focus để lịch sử xuất hiện ở đây.</span></div>`;
  return `<div class="task-list">${logs.map(log => `<article class="list-row"><div class="list-main"><strong>${log.status === 'completed' ? '✓ Hoàn thành' : '○ Dừng sớm'}</strong><span>${formatLogDate(log.startedAt)} · ${formatDuration(log.actualSeconds)} / ${formatDuration(log.plannedSeconds)}</span></div></article>`).join('')}</div>`;
}

export function focus() {
  const state = getState();
  const f = getFocus(state);
  const remaining = getRemainingSeconds(f);
  const logs = state.focusLogs || [];
  const completed = logs.filter(log => log.status === 'completed');
  const totalSeconds = completed.reduce((sum, log) => sum + (Number(log.actualSeconds) || 0), 0);
  const recentLogs = logs.slice(0, 10);

  return {
    title: 'Focus',
    description: 'Tập trung vào một việc trong một khoảng thời gian rõ ràng.',
    render: () => `<div class="focus-layout">
      <section class="card focus-card">
        <span class="eyebrow">FOCUS SESSION</span>
        <div class="timer" id="focusTimer">${formatTime(remaining)}</div>
        <div class="timer-status">${f.running ? 'Đang tập trung' : `Sẵn sàng · ${f.minutes} phút`}</div>
        <div class="focus-controls"><button class="button primary" data-action="focus-toggle">${f.running ? 'Tạm dừng' : 'Bắt đầu'}</button><button class="button" data-action="focus-reset">Đặt lại</button></div>
        <div class="focus-presets">${PRESETS.map(minutes => `<button class="button ${f.minutes === minutes && !f.running ? 'primary' : ''}" data-action="focus-preset" data-min="${minutes}">${minutes} phút</button>`).join('')}</div>
        <form class="focus-custom-form" data-action="focus-custom"><label><span>Thời lượng tùy chọn</span><div class="focus-custom-row"><input name="minutes" type="number" min="${MIN_MINUTES}" max="${MAX_MINUTES}" step="1" value="${f.minutes}" aria-label="Số phút Focus"><button type="submit" class="button">Áp dụng</button></div><small>Từ ${MIN_MINUTES}–${MAX_MINUTES} phút. Chọn thời lượng mới sẽ bắt đầu một phiên mới.</small></label></form>
      </section>

      <section class="card" id="focusLogsSection"><div class="module-toolbar"><div><span class="eyebrow">FOCUS LOGS</span><h2>Lịch sử Focus</h2><p class="muted">Theo dõi các phiên tập trung ngay trong Focus, không cần mở trang riêng.</p></div></div><div class="stat-grid"><article class="card stat-card"><span>Phiên hoàn thành</span><strong>${completed.length}</strong><span>tổng cộng</span></article><article class="card stat-card"><span>Thời gian tập trung</span><strong>${formatDuration(totalSeconds)}</strong><span>từ các phiên hoàn thành</span></article></div><hr>${renderLogRows(recentLogs)}</section>
    </div>`
  };
}

// Kept for backward compatibility with old saved hashes/bookmarks. The UI no longer exposes this as a separate navigation item.
export function focusLogs() {
  const logs = getState().focusLogs || [];
  const completed = logs.filter(log => log.status === 'completed');
  const totalSeconds = completed.reduce((sum, log) => sum + (Number(log.actualSeconds) || 0), 0);
  return { title: 'Focus Logs', description: 'Lịch sử các phiên tập trung và thời gian học thực tế.', render: () => `<div class="card"><div class="module-toolbar"><div><h2>Lịch sử Focus</h2><p class="muted">Trang cũ được giữ để tránh lỗi với liên kết/hash cũ.</p></div><button class="button" data-route="focus">← Quay lại Focus</button></div><p class="muted">${completed.length} phiên hoàn thành · ${formatDuration(totalSeconds)} tập trung.</p>${renderLogRows(logs)}</div>` };
}

setInterval(tickFocus, 1000);
