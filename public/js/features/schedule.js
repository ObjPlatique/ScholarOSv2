import { getState, setState } from '../core/store.js';

const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const esc = (s = '') => String(s).replace(/[&<>\'\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '\"': '&quot;' }[c]));
const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6);
const DEFAULT_CALENDAR = { id: 'calendar-main', name: 'Lịch học chính', color: '#2563eb' };
const START_HOUR = 6;
const ROW_HEIGHT = 60;

function normalize() {
  const state = getState();
  const calendars = Array.isArray(state.calendars) && state.calendars.length ? state.calendars : [DEFAULT_CALENDAR];
  const activeCalendarId = state.activeCalendarId || calendars[0].id;
  const schedule = (state.schedule || []).map(item => item.calendarId ? item : { ...item, calendarId: calendars[0].id });
  const needsSave = !Array.isArray(state.calendars) || !state.calendars.length || state.activeCalendarId !== activeCalendarId || schedule.some((item, i) => item.calendarId !== state.schedule?.[i]?.calendarId);
  if (needsSave) setState({ calendars, activeCalendarId, schedule });
  return { ...getState(), calendars, activeCalendarId, schedule };
}

function timeToMinutes(time) {
  const [h, m] = String(time || '00:00').split(':').map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function modal(title, body, footer = '') {
  return `<div class="schedule-modal-backdrop" data-action="schedule-close-modal"><div class="schedule-modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="schedule-modal-head"><div><span class="eyebrow">THỜI GIAN BIỂU</span><h2>${esc(title)}</h2></div><button type="button" class="icon-button" data-action="schedule-close-modal" aria-label="Đóng">×</button></div>${body}<div class="schedule-modal-footer">${footer}</div></div></div>`;
}

function sessionModal(state, item = null) {
  const calendars = state.calendars || [DEFAULT_CALENDAR];
  const edit = Boolean(item);
  const calendarId = item?.calendarId || state.activeCalendarId || calendars[0].id;
  const day = Number.isInteger(item?.day) ? item.day : 0;
  const repeat = item?.repeat || 'weekly';
  const color = item?.color || calendars.find(c => c.id === calendarId)?.color || '#2563eb';
  const body = `<form class="schedule-form" data-action="schedule-save" data-id="${item?.id || ''}"><div class="schedule-form-grid">
    <label class="field"><span>Tên phiên học *</span><input name="title" required maxlength="100" value="${esc(item?.title || '')}" placeholder="Ví dụ: Toán — Hàm số"></label>
    <label class="field"><span>Lịch</span><select name="calendarId">${calendars.map(c => `<option value="${esc(c.id)}" ${c.id === calendarId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
    <label class="field"><span>Ngày</span><select name="day">${DAYS.map((d, i) => `<option value="${i}" ${i === day ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
    <label class="field"><span>Giờ bắt đầu</span><input type="time" name="time" value="${esc(item?.time || '19:00')}" required></label>
    <label class="field"><span>Thời lượng</span><select name="duration"><option value="25" ${item?.duration == 25 ? 'selected' : ''}>25 phút</option><option value="50" ${item?.duration == 50 ? 'selected' : ''}>50 phút</option><option value="90" ${item?.duration == 90 ? 'selected' : ''}>90 phút</option><option value="120" ${item?.duration == 120 ? 'selected' : ''}>120 phút</option><option value="custom" ${![25,50,90,120].includes(Number(item?.duration)) && edit ? 'selected' : ''}>Tùy chỉnh</option></select></label>
    <label class="field"><span>Lặp lại</span><select name="repeat"><option value="weekly" ${repeat === 'weekly' ? 'selected' : ''}>Hàng tuần</option><option value="once" ${repeat === 'once' ? 'selected' : ''}>Một lần</option></select></label>
    <label class="field"><span>Màu phiên</span><input type="color" name="color" value="${esc(color)}"></label>
    <label class="field field-wide"><span>Ghi chú</span><textarea name="note" rows="3" maxlength="300" placeholder="Mục tiêu, tài liệu, ghi chú...">${esc(item?.note || '')}</textarea></label>
  </div><div class="schedule-form-hint">Phiên học được lưu vào lịch đã chọn và hiển thị ngay trên lịch tuần.</div></form>`;
  const footer = `${edit ? `<button type="button" class="button" data-action="schedule-delete" data-id="${esc(item.id)}">Xóa phiên</button>` : ''}<span></span><button type="button" class="button" data-action="schedule-close-modal">Hủy</button><button type="button" class="button primary" data-action="schedule-submit-form">${edit ? 'Lưu thay đổi' : 'Thêm vào lịch'}</button>`;
  return modal(edit ? 'Chỉnh sửa phiên học' : 'Thêm phiên học', body, footer);
}

function calendarModal(state, calendar = null) {
  const edit = Boolean(calendar);
  const body = `<form class="schedule-form" data-action="schedule-save-calendar" data-id="${calendar?.id || ''}"><div class="schedule-form-grid"><label class="field field-wide"><span>Tên lịch *</span><input name="name" required maxlength="60" value="${esc(calendar?.name || '')}" placeholder="Ví dụ: Ôn thi THPT"></label><label class="field"><span>Màu lịch</span><input type="color" name="color" value="${esc(calendar?.color || '#2563eb')}"></label></div></form>`;
  const footer = `${edit && state.calendars.length > 1 ? `<button type="button" class="button" data-action="schedule-delete-calendar" data-id="${esc(calendar.id)}">Xóa lịch</button>` : ''}<span></span><button type="button" class="button" data-action="schedule-close-modal">Hủy</button><button type="button" class="button primary" data-action="schedule-submit-form">${edit ? 'Lưu lịch' : 'Tạo lịch'}</button>`;
  return modal(edit ? 'Đổi tên lịch' : 'Tạo lịch mới', body, footer);
}

function renderWeek(state) {
  const calendarId = state.activeCalendarId;
  const items = (state.schedule || []).filter(item => (item.calendarId || state.calendars[0]?.id) === calendarId);
  const byDay = DAYS.map((_, day) => items.filter(item => Number(item.day) === day));
  const timeLabels = HOURS.map((hour, i) => `<div class="schedule-time-label" style="grid-row:${i + 2}">${String(hour).padStart(2, '0')}:00</div>`).join('');
  const hourLines = HOURS.map((_, i) => `<div class="schedule-hour-line" style="grid-row:${i + 2}"></div>`).join('');
  const dayColumns = DAYS.map((day, dayIndex) => {
    const sessions = byDay[dayIndex].map(item => {
      const top = Math.max(0, timeToMinutes(item.time) - START_HOUR * 60);
      const height = Math.max(34, Number(item.duration || 50));
      const color = item.color || state.calendars.find(c => c.id === calendarId)?.color || '#2563eb';
      return `<button type="button" class="schedule-event" data-action="schedule-edit" data-id="${esc(item.id)}" style="--event-top:${top}px;--event-height:${height}px;--event-color:${esc(color)}" title="${esc(item.note || item.title)}"><strong>${esc(item.title)}</strong><span>${esc(item.time)} · ${esc(item.duration || 50)} phút</span>${item.repeat === 'once' ? '<small>Một lần</small>' : ''}</button>`;
    }).join('');
    return `<div class="schedule-day-column" style="grid-column:${dayIndex + 2};grid-row:2 / ${HOURS.length + 2}"><div class="schedule-day-body">${sessions || '<span class="schedule-day-hint">Trống</span>'}</div></div>`;
  }).join('');
  return `<div class="schedule-calendar-wrap"><div class="schedule-week-grid" style="--schedule-row-height:${ROW_HEIGHT}px"><div class="schedule-corner"></div>${DAYS.map(d => `<div class="schedule-header-day">${d}</div>`).join('')}${timeLabels}${hourLines}${dayColumns}</div></div>`;
}

export function schedule() {
  const state = normalize();
  const active = state.calendars.find(c => c.id === state.activeCalendarId) || state.calendars[0];
  const count = (state.schedule || []).filter(x => (x.calendarId || state.calendars[0]?.id) === active.id).length;
  return { title: 'Thời gian biểu', description: 'Xây dựng lịch học có cấu trúc nhưng vẫn linh hoạt.', render: () => `<div class="schedule-module">
    <div class="schedule-topbar"><div class="schedule-tabs" role="tablist" aria-label="Các lịch học">${state.calendars.map(c => `<button type="button" class="schedule-tab ${c.id === active.id ? 'active' : ''}" data-action="schedule-select-calendar" data-id="${esc(c.id)}" style="--tab-color:${esc(c.color || '#2563eb')}">${esc(c.name)}</button>`).join('')}<button type="button" class="schedule-tab-add" data-action="schedule-add-calendar" title="Tạo lịch mới">＋</button></div><div class="schedule-actions"><button type="button" class="button" data-action="schedule-edit-calendar" data-id="${esc(active.id)}">⚙ Lịch</button><button type="button" class="button primary" data-action="schedule-add">＋ Thêm phiên</button></div></div>
    <div class="schedule-summary"><div><h2 class="section-title">${esc(active.name)}</h2><p class="muted">${count} phiên học trong lịch này · Chọn một phiên để xem hoặc chỉnh sửa.</p></div><div class="schedule-legend"><span class="schedule-color-dot" style="background:${esc(active.color || '#2563eb')}"></span>Lịch đang chọn</div></div>
    ${renderWeek(state)}<div id="scheduleModalHost"></div></div>` };
}

function closeModal() { document.getElementById('scheduleModalHost')?.replaceChildren(); }
function readForm(form) {
  const data = new FormData(form);
  let duration = data.get('duration');
  if (duration === 'custom') duration = Number(prompt('Thời lượng tùy chỉnh (phút):', '60')) || 60;
  return { title: String(data.get('title') || '').trim(), calendarId: String(data.get('calendarId') || ''), day: Number(data.get('day') || 0), time: String(data.get('time') || '19:00'), duration: Math.max(5, Math.min(720, Number(duration) || 50)), repeat: String(data.get('repeat') || 'weekly'), color: String(data.get('color') || '#2563eb'), note: String(data.get('note') || '').trim() };
}

export function handleScheduleAction(action, id, event, target = event?.currentTarget) {
  const state = normalize();
  if (action === 'schedule-add') { const host = document.getElementById('scheduleModalHost'); if (host) host.innerHTML = sessionModal(state); return null; }
  if (action === 'schedule-edit') { const item = state.schedule.find(x => x.id === id); const host = document.getElementById('scheduleModalHost'); if (host && item) host.innerHTML = sessionModal(state, item); return null; }
  if (action === 'schedule-close-modal') { closeModal(); return null; }
  if (action === 'schedule-submit-form') { const form = target?.closest('.schedule-modal')?.querySelector('form[data-action="schedule-save"],form[data-action="schedule-save-calendar"]'); if (form) { if (typeof form.requestSubmit === 'function') form.requestSubmit(); else form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); } return null; }
  if (action === 'schedule-save') { const form = target?.matches?.('form[data-action="schedule-save"]') ? target : target?.closest?.('form[data-action="schedule-save"]'); if (!form) return null; const data = readForm(form); if (!data.title) { form.querySelector('[name="title"]')?.focus(); return null; } const items = [...state.schedule]; const index = items.findIndex(x => x.id === id); const next = { id: id || uid('slot'), ...data }; if (index >= 0) items[index] = { ...items[index], ...next }; else items.push(next); setState({ schedule: items }); closeModal(); return 'refresh'; }
  if (action === 'schedule-delete') { if (!confirm('Xóa phiên học này khỏi lịch?')) return null; setState({ schedule: state.schedule.filter(x => x.id !== id) }); closeModal(); return 'refresh'; }
  if (action === 'schedule-select-calendar') { setState({ activeCalendarId: id }); return 'refresh'; }
  if (action === 'schedule-add-calendar') { const host = document.getElementById('scheduleModalHost'); if (host) host.innerHTML = calendarModal(state); return null; }
  if (action === 'schedule-edit-calendar') { const calendar = state.calendars.find(c => c.id === id); const host = document.getElementById('scheduleModalHost'); if (host && calendar) host.innerHTML = calendarModal(state, calendar); return null; }
  if (action === 'schedule-save-calendar') { const form = target?.matches?.('form[data-action="schedule-save-calendar"]') ? target : target?.closest?.('form[data-action="schedule-save-calendar"]'); if (!form) return null; const data = new FormData(form); const name = String(data.get('name') || '').trim(); if (!name) { form.querySelector('[name="name"]')?.focus(); return null; } const calendars = [...state.calendars]; const index = calendars.findIndex(c => c.id === id); const next = { id: id || uid('calendar'), name, color: String(data.get('color') || '#2563eb') }; if (index >= 0) calendars[index] = { ...calendars[index], ...next }; else calendars.push(next); setState({ calendars, activeCalendarId: next.id }); closeModal(); return 'refresh'; }
  if (action === 'schedule-delete-calendar') { if (state.calendars.length <= 1) return null; if (!confirm('Xóa lịch này? Các phiên thuộc lịch cũng sẽ bị xóa.')) return null; const remaining = state.calendars.filter(c => c.id !== id); setState({ calendars: remaining, activeCalendarId: remaining[0].id, schedule: state.schedule.filter(x => x.calendarId !== id) }); closeModal(); return 'refresh'; }
  return null;
}
