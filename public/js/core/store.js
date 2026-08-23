const KEY = 'scholaros.v2.state';
const defaults = { streak: 0, tasks: [], schedule: [], habits: [], goals: [], notes: [], subjects: [], materials: [], colleges: [], focus: { minutes: 25, running: false, startedAt: null, sessionStartedAt: null, accumulatedSeconds: 0, secondsLeft: 1500 }, focusSessions: 0, focusLogs: [], theme: 'light' };

function clone(value) { return JSON.parse(JSON.stringify(value)); }

export function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    return { ...clone(defaults), ...(saved || {}) };
  } catch { return clone(defaults); }
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
  state = { ...clone(defaults), ...data };
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach(fn => fn(state));
}
