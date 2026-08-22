import { initRouter, navigate, registerRoute } from './core/router.js';
import { getState, setState, resetState, exportState, importState } from './core/store.js';
import { applyTheme, toggleTheme } from './core/theme.js';
import { dashboard } from './features/dashboard.js';
import { tasks, schedule, focus, habits, goals, progress, handleToolAction } from './features/tools.js';
import { notes, academic, college, handleResourceAction } from './features/resources.js';
import { aiChat, aiStudy, aiPlanner, handleAIAction } from './features/ai.js?v=20260822-render-v1';

const routes = {
  dashboard,
  'ai-chat': aiChat,
  'ai-study': aiStudy,
  'ai-planner': aiPlanner,
  schedule,
  tasks,
  focus,
  habits,
  goals,
  progress,
  notes,
  academic,
  college
};

Object.entries(routes).forEach(([name, route]) => registerRoute(name, route));

document.getElementById('openSidebar').addEventListener('click', () => document.getElementById('sidebar').classList.add('open'));
document.getElementById('closeSidebar').addEventListener('click', closeSidebar);
document.getElementById('sidebarBackdrop').addEventListener('click', closeSidebar);
document.getElementById('themeButton').addEventListener('click', toggleTheme);
document.getElementById('quickFocus').addEventListener('click', () => { navigate('focus'); showToast('Đã mở khu vực Focus.'); });
document.getElementById('searchButton').addEventListener('click', () => showToast('Search sẽ được thêm ở Core phase.'));
document.getElementById('exportBtn').addEventListener('click', exportData);
document.getElementById('importFile').addEventListener('change', importData);
document.getElementById('resetBtn').addEventListener('click', () => {
  if (!confirm('Đặt lại toàn bộ dữ liệu ScholarOS v2?')) return;
  resetState();
  updateStreak();
  showToast('Đã đặt lại dữ liệu.');
  navigate('dashboard');
});

function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); }
function updateStreak() { document.getElementById('streakValue').textContent = getState().streak; }
function showToast(message) { const el = document.getElementById('toast'); el.textContent = message; el.classList.add('show'); clearTimeout(window.__toast); window.__toast = setTimeout(() => el.classList.remove('show'), 2400); }
function exportData() {
  const blob = new Blob([exportState()], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = `scholaros-v2-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url);
  showToast('Đã xuất dữ liệu ScholarOS.');
}
function importData(event) {
  const file = event.target.files?.[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { try { importState(JSON.parse(reader.result)); updateStreak(); navigate('dashboard'); showToast('Đã nhập dữ liệu.'); } catch (err) { showToast(err.message || 'Không thể nhập dữ liệu.'); } };
  reader.readAsText(file); event.target.value = '';
}

const appView = document.getElementById('appView');

appView.addEventListener('click', event => {
  const routeTarget = event.target.closest('[data-route]');
  if (routeTarget && appView.contains(routeTarget)) {
    navigate(routeTarget.dataset.route);
    return;
  }

  const actionTarget = event.target.closest('button[data-action], [role="button"][data-action]');
  if (!actionTarget || !appView.contains(actionTarget)) return;

  const action = actionTarget.dataset.action;
  event.stopPropagation();
  if (action === 'quiz-answer') {
    window.__scholarQuizAnswer?.(actionTarget);
    return;
  }

  const result = handleAIAction(action, actionTarget.dataset.id, event, actionTarget)
    || handleToolAction(action, actionTarget.dataset.id, event)
    || handleResourceAction(action, actionTarget.dataset.id);

  if (result === 'refresh') {
    renderCurrentRoute();
  }
});

appView.addEventListener('submit', event => {
  const form = event.target.closest('form[data-action]');
  if (!form || !appView.contains(form)) return;

  const action = form.dataset.action;
  const result = handleAIAction(action, form.dataset.id, event, form);
  if (result === 'refresh') renderCurrentRoute();
});

function renderCurrentRoute() {
  const route = window.location.hash.replace(/^#\/?/, '') || 'dashboard';
  navigate(route, { replace: true });
}

setInterval(() => {
  const f = getState().focus;
  const timer = document.getElementById('focusTimer');
  if (!f?.running || !f.startedAt) return;

  const left = Math.max(0, f.secondsLeft - Math.floor((Date.now() - f.startedAt) / 1000));
  if (timer) {
    const minutes = String(Math.floor(left / 60)).padStart(2, '0');
    const seconds = String(left % 60).padStart(2, '0');
    timer.textContent = `${minutes}:${seconds}`;
  }

  if (left <= 0) {
    setState({ focus: { ...f, running: false, startedAt: null, secondsLeft: f.minutes * 60 }, focusSessions: (getState().focusSessions || 0) + 1 });
    showToast('Hoàn thành một phiên Focus!');
    navigate('focus');
  }
}, 1000);

applyTheme(getState().theme);
updateStreak();
initRouter();
