import { getState, setState } from './store.js';

export function applyTheme(theme = getState().theme) {
  document.documentElement.dataset.theme = theme;
  const icon = document.getElementById('themeIcon');
  if (icon) icon.textContent = theme === 'dark' ? '☀' : '☾';
}

export function toggleTheme() {
  const next = getState().theme === 'dark' ? 'light' : 'dark';
  setState({ theme: next });
  applyTheme(next);
}
