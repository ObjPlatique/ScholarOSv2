import { getState, setState } from '../core/store.js';

const DEFAULT_CALENDAR_ID = 'calendar-default';
const DAY_NAMES = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const toDateInput = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function mondayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

function addDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

function formatRange(start) {
  const end = addDays(start, 6);
  if (start.getMonth() === end.getMonth()) return `${start.getDate()}–${end.getDate()} tháng ${start.getMonth() + 1}, ${start.getFullYear()}`;
  return `${start.getDate()}/${start.getMonth() + 1}–${end.getDate()}/${end.getMonth() + 1}, ${end.getFullYear()}`;
}

function normalizeEvent(item, index = 0) {
  const legacyDay = Number(item.day);
  const weekStart = mondayOf(new Date());
  const date = item.date || (Number.isInteger(legacyDay)
    ? toDateInput(addDays(weekStart, Math.max(0, Math.min(6, legacyDay))))
    : toDateInput(new Date()));
  return {
    id: item.id || uid('slot'),
    title: item.title || `Phiên ${index + 1}`,
    date,
    startTime: item.startTime || item.time || '19:00',
    duration: Math.max(15, Number(item.duration) || 50),
    type: item.type || 'study',
    repeat: item.repeat || 'none',
    linkFocus: Boolean(item.linkFocus),
    notes: item.notes || ''
  };
}

function makeDefaultCalendar(events = []) {
  return { id: DEFAULT_CALENDAR_ID, name: 'Lịch học', icon: '📚', events: events.map(normalizeEvent) };
}

function ensureCalendars() {
  const state = getState();
  if (Array.isArray(state.schedules) && state.schedules.length) {
    const activeId = state.activeScheduleId && state.schedules.some(x => x.id === state.activeScheduleId)
      ? state.activeScheduleId
      : state.schedules[0].id;
    if (activeId !== state.activeScheduleId) setState({ activeScheduleId: activeId });
    return { ...state, activeScheduleId: activeId };
  }

  const calendar = makeDefaultCalendar(Array.isArray(state.schedule) ? state.schedule : []);
  setState({ schedules: [calendar], activeScheduleId: calendar.id, schedule: calendar.events });
  return { ...state, schedules: [calendar], activeScheduleId: calendar.id, schedule: calendar.events };
}

function getActiveCalendar(state = ensureCalendars()) {
  return state.schedules.find(calendar => calendar.id === state.activeScheduleId) || state.schedules[0];
}

function saveCalendars(schedules, activeScheduleId) {
  const active = schedules.find(calendar => calendar.id === activeScheduleId) || schedules[0];
  setState({ schedules, activeScheduleId: active?.id || null, schedule: active?.events || [] });
}

function getWeekStartFromState() {
  const stored = sessionStorage.getItem('scholaros.schedule.weekStart');
  const parsed = stored ? new Date(`${stored}T00:00:00`) : new Date();
  return Number.isNaN(parsed.getTime()) ? mondayOf(new Date()) : mondayOf(parsed);
}

function setWeekStart(date) {
  sessionStorage.setItem('scholaros.schedule.weekStart', toDateInput(mondayOf(date)));
}

function eventPosition(event) {
  const [hours, minutes] = String(event.startTime || '00:00').split(':').map(Number);
  const top = ((hours * 60 + (minutes || 0)) - 8 * 60) * (64 / 60);
  const height = Math.max(42, Number(event.duration || 50) * (64 / 60));
  return { top: Math.max(0, top), height };
}

function eventMarkup(event) {
  const pos = eventPosition(event);
  const focus = event.linkFocus ? '<span class="schedule-event-focus">◷ Focus</span>' : '';
  return `<button class="schedule-event schedule-event-${esc(event.type)}" data-action="schedule-edit" data-id="${esc(event.id)}" style="top:${pos.top}px;height:${pos.height}px" title="${esc(event.title)}"><strong>${esc(event.title)}</strong><span>${esc(event.startTime)} · ${event.duration} phút</span>${focus}</button>`;
}

function renderCalendarTabs(calendars, activeId) {
  return `<div class="schedule-tabs" role="tablist" aria-label="Các lịch">${calendars.map(calendar => `<button class="schedule-tab ${calendar.id === activeId ? 'active' : ''}" data-action="schedule-switch" data-id="${esc(calendar.id)}" role="tab" aria-selected="${calendar.id === activeId}"><span>${esc(calendar.icon)}</span><span>${esc(calendar.name)}</span></button>`).join('')}<button class="schedule-tab-add" data-action="schedule-new-calendar" title="Tạo lịch mới">＋</button></div>`;
}

function renderWeek(calendar, weekStart) {
  const dates = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const events = calendar.events || [];
  const hours = Array.from({ length: 15 }, (_, index) => 8 + index);
  return `<div class="schedule-calendar-card"><div class="schedule-calendar-toolbar"><div class="schedule-calendar-nav"><button class="icon-button" data-action="schedule-prev-week" aria-label="Tuần trước">‹</button><button class="button" data-action="schedule-today">Hôm nay</button><button class="icon-button" data-action="schedule-next-week" aria-label="Tuần sau">›</button></div><strong>${esc(formatRange(weekStart))}</strong><div class="schedule-view-label">Tuần</div></div><div class="schedule-week-head"><div class="schedule-time-spacer"></div>${dates.map((date, index) => `<div class="schedule-day-head ${toDateInput(date) === toDateInput(new Date()) ? 'today' : ''}"><span>${DAY_NAMES[index]}</span><strong>${date.getDate()}</strong></div>`).join('')}</div><div class="schedule-week-body"><div class="schedule-time-column">${hours.map(hour => `<div class="schedule-time">${pad(hour)}:00</div>`).join('')}</div><div class="schedule-day-columns">${dates.map(date => { const dateKey = toDateInput(date); const dayEvents = events.filter(item => item.date === dateKey); return `<div class="schedule-day-column">${hours.map(() => '<div class="schedule-hour-line"></div>').join('')}${dayEvents.map(eventMarkup).join('')}</div>`; }).join('')}</div></div></div>`;
}

function modalMarkup(calendar, calendars) {
  return `<div class="schedule-modal-backdrop" id="scheduleModal" hidden><div class="schedule-modal" role="dialog" aria-modal="true" aria-labelledby="scheduleModalTitle"><div class="schedule-modal-head"><div><span class="eyebrow">THỜI GIAN BIỂU</span><h2 id="scheduleModalTitle">Thêm phiên học</h2></div><button class="icon-button" data-action="schedule-close-modal" aria-label="Đóng">×</button></div><div class="schedule-form" id="scheduleSessionForm"><input type="hidden" id="scheduleEditId" value=""><label><span>Tên phiên</span><input id="scheduleTitle" type="text" placeholder="Ví dụ: Toán — Hàm số" autocomplete="off"></label><div class="schedule-form-grid"><label><span>Ngày</span><input id="scheduleDate" type="date" value="${toDateInput(new Date())}"></label><label><span>Giờ bắt đầu</span><input id="scheduleStart" type="time" value="19:00"></label></div><div class="schedule-form-grid"><label><span>Thời lượng</span><select id="scheduleDuration"><option value="25">25 phút</option><option value="50" selected>50 phút</option><option value="90">90 phút</option><option value="120">120 phút</option></select></label><label><span>Loại phiên</span><select id="scheduleType"><option value="study">Học tập</option><option value="review">Ôn tập</option><option value="test">Kiểm tra</option><option value="personal">Cá nhân</option></select></label></div><div class="schedule-form-grid"><label><span>Lặp lại</span><select id="scheduleRepeat"><option value="none">Không lặp</option><option value="daily">Hằng ngày</option><option value="weekdays">Thứ 2–6</option><option value="weekly">Hằng tuần</option></select></label><label><span>Lịch</span><select id="scheduleCalendar">${calendars.map(item => `<option value="${esc(item.id)}" ${item.id === calendar.id ? 'selected' : ''}>${esc(item.icon)} ${esc(item.name)}</option>`).join('')}</select></label></div><label class="schedule-checkbox"><input id="scheduleLinkFocus" type="checkbox"><span>Liên kết phiên này với Focus</span></label><label><span>Ghi chú</span><textarea id="scheduleNotes" rows="3" placeholder="Mục tiêu, nội dung hoặc ghi chú cho phiên..."></textarea></label></div><div class="schedule-modal-actions"><button class="button" data-action="schedule-close-modal">Hủy</button><button class="button danger-outline" id="scheduleDeleteButton" data-action="schedule-delete-event" hidden>Xóa phiên</button><button class="button primary" data-action="schedule-save-event">Lưu phiên</button></div></div></div>`;
}

function renderSidebarTools(calendar) {
  return `<div class="schedule-side-tools"><button class="button" data-action="schedule-rename">✎ Đổi tên lịch</button>${calendar.id !== DEFAULT_CALENDAR_ID ? '<button class="button danger-outline" data-action="schedule-delete-calendar">Xóa lịch</button>' : ''}</div>`;
}

export function schedule() {
  const state = ensureCalendars();
  const calendars = state.schedules;
  const active = getActiveCalendar(state);
  const weekStart = getWeekStartFromState();
  const eventCount = active.events?.length || 0;
  return {
    title: 'Thời gian biểu',
    description: 'Quản lý nhiều lịch học trong một giao diện lịch thống nhất.',
    render: () => `<div class="schedule-module">${renderCalendarTabs(calendars, active.id)}<div class="schedule-module-toolbar"><div><h2 class="section-title">${esc(active.icon)} ${esc(active.name)}</h2><p class="muted">${eventCount} phiên · ${esc(formatRange(weekStart))}</p></div><div class="schedule-toolbar-actions">${renderSidebarTools(active)}<button class="button primary" data-action="schedule-add">＋ Thêm phiên</button></div></div>${renderWeek(active, weekStart)}<div class="schedule-hint"><span>💡</span><span>Click vào một phiên để chỉnh sửa. Mỗi lịch được lưu độc lập và sẵn sàng liên kết với Focus, Nhiệm vụ và Dashboard.</span></div>${modalMarkup(active, calendars)}</div>`,
    mount: () => {
      const modal = document.getElementById('scheduleModal');
      modal?.addEventListener('click', event => { if (event.target === modal) modal.hidden = true; });
    }
  };
}

function openModal(eventId = null) {
  const state = ensureCalendars();
  const active = getActiveCalendar(state);
  const event = active.events.find(item => item.id === eventId);
  const modal = document.getElementById('scheduleModal');
  if (!modal) return;
  document.getElementById('scheduleEditId').value = event?.id || '';
  document.getElementById('scheduleModalTitle').textContent = event ? 'Chỉnh sửa phiên' : 'Thêm phiên học';
  document.getElementById('scheduleTitle').value = event?.title || '';
  document.getElementById('scheduleDate').value = event?.date || toDateInput(new Date());
  document.getElementById('scheduleStart').value = event?.startTime || '19:00';
  document.getElementById('scheduleDuration').value = String(event?.duration || 50);
  document.getElementById('scheduleType').value = event?.type || 'study';
  document.getElementById('scheduleRepeat').value = event?.repeat || 'none';
  document.getElementById('scheduleCalendar').value = active.id;
  document.getElementById('scheduleLinkFocus').checked = Boolean(event?.linkFocus);
  document.getElementById('scheduleNotes').value = event?.notes || '';
  document.getElementById('scheduleDeleteButton').hidden = !event;
  modal.hidden = false;
  requestAnimationFrame(() => document.getElementById('scheduleTitle')?.focus());
}

function closeModal() {
  const modal = document.getElementById('scheduleModal');
  if (modal) modal.hidden = true;
}

function readEventForm() {
  const title = document.getElementById('scheduleTitle')?.value.trim();
  if (!title) { document.getElementById('scheduleTitle')?.focus(); return null; }
  return {
    id: document.getElementById('scheduleEditId')?.value || uid('slot'),
    title,
    date: document.getElementById('scheduleDate')?.value || toDateInput(new Date()),
    startTime: document.getElementById('scheduleStart')?.value || '19:00',
    duration: Math.max(15, Number(document.getElementById('scheduleDuration')?.value) || 50),
    type: document.getElementById('scheduleType')?.value || 'study',
    repeat: document.getElementById('scheduleRepeat')?.value || 'none',
    linkFocus: Boolean(document.getElementById('scheduleLinkFocus')?.checked),
    notes: document.getElementById('scheduleNotes')?.value.trim() || ''
  };
}

function saveEvent() {
  const event = readEventForm();
  if (!event) return null;
  const state = ensureCalendars();
  const targetCalendarId = document.getElementById('scheduleCalendar')?.value || state.activeScheduleId;
  const schedules = state.schedules.map(calendar => {
    if (calendar.id !== targetCalendarId) return calendar;
    const exists = calendar.events.some(item => item.id === event.id);
    return { ...calendar, events: exists ? calendar.events.map(item => item.id === event.id ? event : item) : [...calendar.events, event] };
  });
  saveCalendars(schedules, targetCalendarId);
  closeModal();
  return 'refresh';
}

function deleteEvent(id = document.getElementById('scheduleEditId')?.value) {
  if (!id) return null;
  const state = ensureCalendars();
  const active = getActiveCalendar(state);
  const target = active.events.find(item => item.id === id);
  if (!target || !confirm(`Xóa phiên “${target.title}”?`)) return null;
  saveCalendars(state.schedules.map(calendar => calendar.id === active.id ? { ...calendar, events: calendar.events.filter(item => item.id !== id) } : calendar), active.id);
  closeModal();
  return 'refresh';
}

function switchCalendar(id) {
  const state = ensureCalendars();
  if (!state.schedules.some(calendar => calendar.id === id)) return null;
  const active = state.schedules.find(calendar => calendar.id === id);
  setState({ activeScheduleId: id, schedule: active.events });
  return 'refresh';
}

function createCalendar() {
  const name = prompt('Tên lịch mới:', 'Lịch mới');
  if (!name?.trim()) return null;
  const icon = prompt('Biểu tượng (ví dụ: 📚, 🎯, 🏠):', '📅') || '📅';
  const state = ensureCalendars();
  const calendar = { id: uid('calendar'), name: name.trim(), icon: icon.trim().slice(0, 2) || '📅', events: [] };
  saveCalendars([...state.schedules, calendar], calendar.id);
  return 'refresh';
}

function renameCalendar() {
  const state = ensureCalendars();
  const active = getActiveCalendar(state);
  const name = prompt('Tên lịch:', active.name);
  if (!name?.trim() || name.trim() === active.name) return null;
  saveCalendars(state.schedules.map(calendar => calendar.id === active.id ? { ...calendar, name: name.trim() } : calendar), active.id);
  return 'refresh';
}

function deleteCalendar() {
  const state = ensureCalendars();
  const active = getActiveCalendar(state);
  if (active.id === DEFAULT_CALENDAR_ID || state.schedules.length <= 1) return null;
  if (!confirm(`Xóa lịch “${active.name}” và toàn bộ phiên trong lịch này?`)) return null;
  const schedules = state.schedules.filter(calendar => calendar.id !== active.id);
  saveCalendars(schedules, schedules[0].id);
  return 'refresh';
}

export function handleScheduleAction(action, id) {
  switch (action) {
    case 'schedule-add': openModal(); return null;
    case 'schedule-edit': openModal(id); return null;
    case 'schedule-close-modal': closeModal(); return null;
    case 'schedule-save-event': return saveEvent();
    case 'schedule-delete-event': return deleteEvent();
    case 'schedule-switch': return switchCalendar(id);
    case 'schedule-new-calendar': return createCalendar();
    case 'schedule-rename': return renameCalendar();
    case 'schedule-delete-calendar': return deleteCalendar();
    case 'schedule-prev-week': setWeekStart(addDays(getWeekStartFromState(), -7)); return 'refresh';
    case 'schedule-next-week': setWeekStart(addDays(getWeekStartFromState(), 7)); return 'refresh';
    case 'schedule-today': setWeekStart(new Date()); return 'refresh';
    default: return null;
  }
}
