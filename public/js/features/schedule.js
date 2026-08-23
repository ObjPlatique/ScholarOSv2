import { getState, setState } from '../core/store.js';

const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 07:00 → 21:00

const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const esc = (s = '') => String(s).replace(/[&<>\'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));

function timeToMinutes(time) {
  const [h, m] = String(time || '19:00').split(':').map(Number);
  return (Number.isFinite(h) ? h : 19) * 60 + (Number.isFinite(m) ? m : 0);
}

function formatTime(time) {
  return String(time || '19:00').slice(0, 5);
}

function colorClass(color) {
  return `schedule-event tone-${['blue', 'green', 'purple', 'orange', 'red'].includes(color) ? color : 'blue'}`;
}

function ensureCalendars(state) {
  if (Array.isArray(state.scheduleCalendars) && state.scheduleCalendars.length) {
    return state.scheduleCalendars;
  }
  return [{
    id: 'schedule-default',
    name: 'Lịch học',
    color: 'blue',
    items: Array.isArray(state.schedule) ? state.schedule : []
  }];
}

function getActiveCalendar(state) {
  const calendars = ensureCalendars(state);
  return calendars.find(x => x.id === state.activeScheduleId) || calendars[0];
}

function syncCalendars(calendars, activeId) {
  const active = calendars.find(x => x.id === activeId) || calendars[0];
  return {
    scheduleCalendars: calendars,
    activeScheduleId: active.id,
    schedule: active.items
  };
}

function renderEvent(item) {
  const start = timeToMinutes(item.time);
  const duration = Math.max(30, Number(item.duration) || 50);
  const top = Math.max(0, (start - 7 * 60) * (72 / 60));
  const height = Math.max(48, duration * (72 / 60));
  return `<article class="schedule-calendar-event ${colorClass(item.color)}" style="top:${top}px;height:${height}px" title="${esc(item.title)}">
    <strong>${esc(item.title)}</strong>
    <span>${esc(formatTime(item.time))} · ${duration} phút</span>
    ${item.subject ? `<small>${esc(item.subject)}</small>` : ''}
    <button class="schedule-event-delete" data-action="schedule-delete" data-id="${esc(item.id)}" aria-label="Xóa phiên">×</button>
  </article>`;
}

function renderCalendarGrid(items) {
  return `<div class="schedule-calendar-wrap">
    <div class="schedule-calendar-head">
      <div class="schedule-time-gutter"></div>
      ${DAYS.map((day, i) => `<div class="schedule-day-head"><strong>${day}</strong><span>${items.filter(x => Number(x.day) === i).length} phiên</span></div>`).join('')}
    </div>
    <div class="schedule-calendar-body">
      <div class="schedule-time-column">${HOURS.map(hour => `<div class="schedule-hour-label" style="top:${(hour - 7) * 72}px">${String(hour).padStart(2, '0')}:00</div>`).join('')}</div>
      <div class="schedule-day-columns">
        ${DAYS.map((_, day) => `<div class="schedule-day-column" data-day="${day}">
          ${HOURS.slice(0, -1).map((hour) => `<div class="schedule-hour-line" style="top:${(hour - 7) * 72}px"></div>`).join('')}
          ${items.filter(x => Number(x.day) === day).sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)).map(renderEvent).join('')}
        </div>`).join('')}
      </div>
    </div>
  </div>`;
}

function renderModal() {
  return `<div class="schedule-modal" data-schedule-modal hidden>
    <div class="schedule-modal-backdrop" data-action="schedule-close-modal"></div>
    <section class="schedule-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="scheduleModalTitle">
      <div class="schedule-modal-header"><div><span class="eyebrow">THỜI GIAN BIỂU</span><h2 id="scheduleModalTitle">Thêm phiên học</h2></div><button class="icon-button" data-action="schedule-close-modal" aria-label="Đóng">×</button></div>
      <form class="schedule-form" data-action="schedule-save">
        <div class="schedule-form-grid">
          <label class="field"><span>Tên phiên</span><input name="title" required maxlength="80" placeholder="Ví dụ: Toán — Hàm số" /></label>
          <label class="field"><span>Môn học</span><input name="subject" maxlength="40" placeholder="Ví dụ: Toán" /></label>
          <label class="field"><span>Ngày</span><select name="day">${DAYS.map((day, i) => `<option value="${i}">${day}</option>`).join('')}</select></label>
          <label class="field"><span>Giờ bắt đầu</span><input name="time" type="time" value="19:00" required /></label>
          <label class="field"><span>Thời lượng</span><select name="duration"><option value="25">25 phút</option><option value="50" selected>50 phút</option><option value="90">90 phút</option><option value="120">120 phút</option></select></label>
          <label class="field"><span>Lặp lại</span><select name="repeat"><option value="weekly">Hàng tuần</option><option value="once">Một lần</option></select></label>
        </div>
        <label class="field"><span>Ghi chú</span><textarea name="note" rows="3" maxlength="180" placeholder="Mục tiêu hoặc nội dung của phiên học..." ></textarea></label>
        <div class="schedule-color-picker"><span>Màu phiên</span><div>${['blue', 'green', 'purple', 'orange', 'red'].map((c, i) => `<label class="schedule-color-option tone-${c}"><input type="radio" name="color" value="${c}" ${i === 0 ? 'checked' : ''}><i></i></label>`).join('')}</div></div>
        <div class="button-row"><button type="button" class="button" data-action="schedule-close-modal">Hủy</button><button type="submit" class="button primary">Thêm vào lịch</button></div>
      </form>
    </section>
  </div>`;
}

function renderCalendarTabs(calendars, activeId) {
  return `<div class="schedule-tabs-bar">
    <div class="schedule-tabs" role="tablist" aria-label="Các lịch">
      ${calendars.map(calendar => `<button class="schedule-tab ${calendar.id === activeId ? 'active' : ''}" data-action="schedule-select-calendar" data-id="${esc(calendar.id)}" role="tab" aria-selected="${calendar.id === activeId}"><i class="schedule-tab-dot tone-${esc(calendar.color || 'blue')}"></i>${esc(calendar.name)}<span>${calendar.items.length}</span></button>`).join('')}
      <button class="schedule-tab-add" data-action="schedule-new-calendar" title="Thêm lịch">+</button>
    </div>
    <div class="schedule-tabs-actions"><button class="button" data-action="schedule-new-calendar">+ Lịch mới</button></div>
  </div>`;
}

export function schedule() {
  const state = getState();
  const calendars = ensureCalendars(state);
  const active = getActiveCalendar(state);
  return {
    title: 'Thời gian biểu',
    description: 'Quản lý nhiều lịch học bằng các tab và xem toàn bộ tuần trong một giao diện trực quan.',
    render: () => `<div class="schedule-module">
      ${renderCalendarTabs(calendars, active.id)}
      <div class="schedule-toolbar">
        <div><h2 class="section-title">${esc(active.name)}</h2><p class="muted">${active.items.length} phiên trong lịch này · Kéo mắt theo tuần để biết bạn đang học gì và khi nào.</p></div>
        <div class="toolbar-actions"><button class="button" data-action="schedule-rename">Đổi tên lịch</button><button class="button" data-action="schedule-delete-calendar" ${calendars.length === 1 ? 'disabled title="Phải có ít nhất một lịch"' : ''}>Xóa lịch</button><button class="button primary" data-action="schedule-add">+ Thêm phiên</button></div>
      </div>
      ${active.items.length ? renderCalendarGrid(active.items) : `<div class="schedule-empty-calendar"><div class="feature-icon">▦</div><strong>Lịch này đang trống</strong><p>Thêm phiên học để bắt đầu xây dựng thời gian biểu.</p><button class="button primary" data-action="schedule-add">+ Thêm phiên</button></div>`}
      ${renderModal()}
    </div>`
  };
}

export function handleScheduleAction(action, id, event, target) {
  const state = getState();
  const calendars = ensureCalendars(state);
  const active = getActiveCalendar(state);

  if (action === 'schedule-add') {
    const modal = document.querySelector('[data-schedule-modal]');
    if (modal) { modal.hidden = false; modal.querySelector('input[name="title"]')?.focus(); }
    return;
  }

  if (action === 'schedule-close-modal') {
    const modal = document.querySelector('[data-schedule-modal]');
    if (modal) modal.hidden = true;
    return;
  }

  if (action === 'schedule-select-calendar') {
    if (!id || id === active.id) return;
    setState(syncCalendars(calendars, id));
    return 'refresh';
  }

  if (action === 'schedule-new-calendar') {
    const name = prompt('Tên lịch mới:', `Lịch ${calendars.length + 1}`);
    if (!name?.trim()) return;
    const calendar = { id: uid('calendar'), name: name.trim(), color: ['blue', 'green', 'purple', 'orange', 'red'][calendars.length % 5], items: [] };
    setState(syncCalendars([...calendars, calendar], calendar.id));
    return 'refresh';
  }

  if (action === 'schedule-rename') {
    const name = prompt('Tên lịch:', active.name);
    if (!name?.trim() || name.trim() === active.name) return;
    const next = calendars.map(c => c.id === active.id ? { ...c, name: name.trim() } : c);
    setState(syncCalendars(next, active.id));
    return 'refresh';
  }

  if (action === 'schedule-delete-calendar') {
    if (calendars.length === 1) return;
    if (!confirm(`Xóa lịch “${active.name}” và toàn bộ phiên trong lịch này?`)) return;
    const next = calendars.filter(c => c.id !== active.id);
    setState(syncCalendars(next, next[0].id));
    return 'refresh';
  }

  if (action === 'schedule-delete') {
    const next = calendars.map(c => c.id === active.id ? { ...c, items: c.items.filter(item => item.id !== id) } : c);
    setState(syncCalendars(next, active.id));
    return 'refresh';
  }

  if (action === 'schedule-save') {
    const form = target?.tagName === 'FORM' ? target : event?.target?.closest('form');
    if (!form) return;
    const data = new FormData(form);
    const title = String(data.get('title') || '').trim();
    if (!title) return;
    const item = {
      id: uid('slot'),
      title,
      subject: String(data.get('subject') || '').trim(),
      day: Number(data.get('day') || 0),
      time: String(data.get('time') || '19:00'),
      duration: Number(data.get('duration') || 50),
      repeat: String(data.get('repeat') || 'weekly'),
      note: String(data.get('note') || '').trim(),
      color: String(data.get('color') || 'blue'),
      createdAt: new Date().toISOString()
    };
    const next = calendars.map(c => c.id === active.id ? { ...c, items: [...c.items, item] } : c);
    setState(syncCalendars(next, active.id));
    return 'refresh';
  }
}
