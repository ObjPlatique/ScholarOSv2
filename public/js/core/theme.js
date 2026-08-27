import { getState, setState } from './store.js';

export function applyTheme(theme = getState().theme) {
  const next = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  const icon = document.getElementById('themeIcon');
  if (icon) icon.textContent = next === 'dark' ? '☀' : '☾';
}

export function setTheme(theme) {
  const next = theme === 'dark' ? 'dark' : 'light';
  setState({ theme: next });
  applyTheme(next);
  return next;
}

export function toggleTheme() {
  return setTheme(getState().theme === 'dark' ? 'light' : 'dark');
}
