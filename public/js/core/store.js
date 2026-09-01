const KEY = 'scholaros.v2.state';

// New installs start empty. Legacy default schedule assets are migrated out
// without touching real user-created sessions.
const defaults = {
  streak: 0,
  tasks: [],
  schedule: [],
  calendars: [{ id: 'calendar-main', name: 'Lịch học chính', color: '#2563eb', events: [] }],
  activeCalendarId: 'calendar-main',
  habits: [],
  goals: [],
  notes: [],
  subjects: [],
  materials: [],
  colleges: [],
  focus: { minutes: 25, running: false, startedAt: null, sessionStartedAt: null, accumulatedSeconds: 0, secondsLeft: 1500 },
  focusSessions: 0,
  focusLogs: [],
  theme: 'light'
};

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function stripLegacyDefaultEvents(value) {
  const isLegacy = event => String(event?.id || '').startsWith('asset-default-');
  const schedule = Array.isArray(value.schedule) ? value.schedule.filter(event => !isLegacy(event)) : [];
  const calendars = Array.isArray(value.calendars)
    ? value.calendars.map(calendar => ({ ...calendar, events: Array.isArray(calendar.events) ? calendar.events.filter(event => !isLegacy(event)) : [] }))
    : clone(defaults.calendars);
  return { ...value, schedule, calendars };
}

export function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    return stripLegacyDefaultEvents({ ...clone(defaults), ...(saved || {}) });
  } catch {
    return clone(defaults);
  }
}

let state = loadState();
const listeners = new Set();

export function getState() { return state; }
export function setState(patch) {
  state = stripLegacyDefaultEvents({ ...state, ...patch });
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach(fn => fn(state));
}
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function resetState() { state = clone(defaults); localStorage.setItem(KEY, JSON.stringify(state)); listeners.forEach(fn => fn(state)); }
export function exportState() { return JSON.stringify(state, null, 2); }
export function importState(data) {
  if (!data || typeof data !== 'object') throw new Error('Dữ liệu không hợp lệ.');
  state = stripLegacyDefaultEvents({ ...clone(defaults), ...data });
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach(fn => fn(state));
}
