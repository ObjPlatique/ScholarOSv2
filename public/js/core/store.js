const KEY = 'scholaros.v2.state';

// Keep initial state lightweight. The old default generated 112 weekly
// placeholder sessions (7 days × 16 hours), which polluted the calendar and
// made AI Planner treat sample data as the user's real schedule.
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

// Migrate existing installations without deleting real user-created sessions.
// Only the generated asset records use the asset-default-* ID namespace.
function removeLegacyDefaultSessions(value) {
  const isLegacy = event => String(event?.id || '').startsWith('asset-default-');
  const state = clone(value);
  state.schedule = Array.isArray(state.schedule) ? state.schedule.filter(event => !isLegacy(event)) : [];
  if (Array.isArray(state.calendars)) {
    state.calendars = state.calendars.map(calendar => ({
      ...calendar,
      events: Array.isArray(calendar.events) ? calendar.events.filter(event => !isLegacy(event)) : []
    }));
  }
  return state;
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!saved || typeof saved !== 'object') return clone(defaults);
    return { ...clone(defaults), ...removeLegacyDefaultSessions(saved) };
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
  state = { ...clone(defaults), ...removeLegacyDefaultSessions(data) };
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach(fn => fn(state));
}
