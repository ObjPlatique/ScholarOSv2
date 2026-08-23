const KEY = 'scholaros.v2.state';
const defaults = {
  streak: 0,
  tasks: [],
  schedule: [],
  scheduleCalendars: [{ id: 'schedule-default', name: 'Lịch học', color: 'blue', items: [] }],
  activeScheduleId: 'schedule-default',
  habits: [],
  goals: [],
  notes: [],
  subjects: [],
  materials: [],
  colleges: [],
  focus: { minutes: 25, running: false, startedAt: null, secondsLeft: 1500 },
  focusSessions: 0,
  focusLogs: [],
  theme: 'light'
};

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function normalizeSchedule(saved) {
  const legacy = Array.isArray(saved?.schedule) ? saved.schedule : [];
  const existing = Array.isArray(saved?.scheduleCalendars) && saved.scheduleCalendars.length ? saved.scheduleCalendars : null;
  const calendars = existing || [{ id: 'schedule-default', name: 'Lịch học', color: 'blue', items: legacy }];
  const activeId = saved?.activeScheduleId && calendars.some(c => c.id === saved.activeScheduleId)
    ? saved.activeScheduleId
    : calendars[0].id;
  const active = calendars.find(c => c.id === activeId) || calendars[0];
  return { scheduleCalendars: calendars, activeScheduleId: active.id, schedule: Array.isArray(active.items) ? active.items : [] };
}

export function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null') || {};
    return {
      ...clone(defaults),
      ...saved,
      ...normalizeSchedule(saved),
      focusLogs: Array.isArray(saved.focusLogs) ? saved.focusLogs : []
    };
  } catch {
    return clone(defaults);
  }
}

let state = loadState();
const listeners = new Set();

export function getState() { return state; }
export function setState(patch) {
  state = { ...state, ...patch };
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach(fn => fn(state));
}
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function resetState() { state = clone(defaults); localStorage.setItem(KEY, JSON.stringify(state)); listeners.forEach(fn => fn(state)); }
export function exportState() { return JSON.stringify(state, null, 2); }
export function importState(data) {
  if (!data || typeof data !== 'object') throw new Error('Dữ liệu không hợp lệ.');
  state = {
    ...clone(defaults),
    ...data,
    ...normalizeSchedule(data),
    focusLogs: Array.isArray(data.focusLogs) ? data.focusLogs : []
  };
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach(fn => fn(state));
}
