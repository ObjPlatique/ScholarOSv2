import { initRouter, navigate, registerRoute } from './core/router.js';
import { getState, resetState, exportState, importState } from './core/store.js';
import { applyTheme, toggleTheme } from './core/theme.js';
import { dashboard } from './features/dashboard.js';
import { habits, goals, progress, handleToolAction } from './features/tools.js';
import { tasks, handleTaskAction } from './features/tasks.js';
import { schedule, handleScheduleAction } from './features/schedule.js';
import { focus, handleFocusAction } from './features/focus.js';
import { notes, academic, college, handleResourceAction } from './features/resources.js';
import { aiChat, aiStudy, aiPlanner, handleAIAction } from './features/ai.js?v=20260822-render-v1';
import { handlePlannerAction } from './features/ai-planner.js';
import { auth, handleAuthAction } from './features/auth.js';

const routes = { dashboard, 'ai-chat': aiChat, 'ai-study': aiStudy, 'ai-planner': aiPlanner, schedule, tasks, focus, habits, goals, progress, notes, academic, college, auth };
Object.entries(routes).forEach(([name, route]) => registerRoute(name, route));

document.getElementById('openSidebar').addEventListener('click', () => document.getElementById('sidebar').classList.add('open'));
document.getElementById('closeSidebar').addEventListener('click', closeSidebar);
document.getElementById('sidebarBackdrop').addEventListener('click', closeSidebar);
document.getElementById('themeButton').addEventListener('click', toggleTheme);
document.getElementById('quickFocus').addEventListener('click', () => { navigate('focus'); showToast('Đã mở khu vực Focus.'); });
document.getElementById('searchButton').addEventListener('click', () => showToast('Search sẽ được thêm ở Core phase.'));
document.getElementById('loginButton').addEventListener('click', () => auth.open('login'));
document.getElementById('signupButton').addEventListener('click', () => auth.open('signup'));
document.getElementById('exportBtn').addEventListener('click', exportData);
document.getElementById('importFile').addEventListener('change', importData);
document.getElementById('resetBtn').addEventListener('click', () => { if (!confirm('Đặt lại toàn bộ dữ liệu ScholarOS v2?')) return; resetState(); updateStreak(); showToast('Đã đặt lại dữ liệu.'); navigate('dashboard'); });

function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); }
function updateStreak() { document.getElementById('streakValue').textContent = getState().streak; }
function showToast(message) { const el = document.getElementById('toast'); el.textContent = message; el.classList.add('show'); clearTimeout(window.__toast); window.__toast = setTimeout(() => el.classList.remove('show'), 2400); }
function exportData() { const blob = new Blob([exportState()], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `scholaros-v2-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url); showToast('Đã xuất dữ liệu ScholarOS.'); }
function importData(event) { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { importState(JSON.parse(reader.result)); updateStreak(); navigate('dashboard'); showToast('Đã nhập dữ liệu.'); } catch (err) { showToast(err.message || 'Không thể nhập dữ liệu.'); } }; reader.readAsText(file); event.target.value = ''; }

const appView = document.getElementById('appView');
appView.addEventListener('click', event => {
  const routeTarget = event.target.closest('[data-route]');
  if (routeTarget && appView.contains(routeTarget)) { navigate(routeTarget.dataset.route); return; }
  const actionTarget = event.target.closest('button[data-action], [role="button"][data-action], [data-action="schedule-close-modal"], [data-action="resource-close-modal"]');
  if (!actionTarget || !appView.contains(actionTarget)) return;
  const action = actionTarget.dataset.action;
  event.stopPropagation();
  if (action === 'schedule-close-modal' && event.target.closest('.schedule-modal') && !event.target.closest('button[data-action="schedule-close-modal"]')) return;
  if (action === 'resource-close-modal' && event.target.closest('.resource-modal') && !event.target.closest('button[data-action="resource-close-modal"]')) return;
  if (action === 'quiz-answer') { window.__scholarQuizAnswer?.(actionTarget); return; }
  if (action === 'ai-optimize-schedule') { handlePlannerAction(actionTarget); return; }
  if (action?.startsWith('auth-')) { handleAuthAction(action, actionTarget.dataset.id, event, actionTarget); return; }
  if (action?.startsWith('schedule-')) { const r = handleScheduleAction(action, actionTarget.dataset.id, event, actionTarget); if (r === 'refresh') renderCurrentRoute(); return; }
  if (action?.startsWith('task-')) { const r = handleTaskAction(action, actionTarget.dataset.id, event, actionTarget); if (r === 'refresh') renderCurrentRoute(); return; }
  if (action?.startsWith('resource-') || /^(note|subject|material|college)-/.test(action)) { const r = handleResourceAction(action, actionTarget.dataset.id, event, actionTarget); if (r === 'refresh') renderCurrentRoute(); return; }
  const focusResult = handleFocusAction(action, actionTarget); if (focusResult === 'refresh') { renderCurrentRoute(); return; }
  const result = handleAIAction(action, actionTarget.dataset.id, event, actionTarget) || handleToolAction(action, actionTarget.dataset.id, event); if (result === 'refresh') renderCurrentRoute();
});

appView.addEventListener('submit', event => {
  const form = event.target.closest('form[data-action]'); if (!form || !appView.contains(form)) return;
  event.preventDefault(); const action = form.dataset.action;
  if (action?.startsWith('auth-')) { handleAuthAction(action, form.dataset.id, event, form); return; }
  if (action?.startsWith('schedule-')) { const r = handleScheduleAction(action, form.dataset.id, event, form); if (r === 'refresh') renderCurrentRoute(); return; }
  if (action?.startsWith('task-')) { const r = handleTaskAction(action, form.dataset.id, event, form); if (r === 'refresh') renderCurrentRoute(); return; }
  if (action?.startsWith('resource-') || /^(note|subject|material|college)-(create|update)$/.test(action)) { const r = handleResourceAction(action, form.dataset.id, event, form); if (r === 'refresh') renderCurrentRoute(); return; }
  const focusResult = handleFocusAction(action, form); if (focusResult === 'refresh') { renderCurrentRoute(); return; }
  const result = handleAIAction(action, form.dataset.id, event, form) || handleToolAction(action, form.dataset.id, event); if (result === 'refresh') renderCurrentRoute();
});

function renderCurrentRoute() { const route = window.location.hash.replace(/^#\/?/, '') || 'dashboard'; navigate(route, { replace: true }); }
window.addEventListener('scholaros:focus-finished', event => { showToast(event.detail?.log?.status === 'completed' ? 'Hoàn thành một phiên Focus!' : 'Đã lưu phiên Focus.'); const route = window.location.hash.replace(/^#\/?/, '') || 'dashboard'; if (route === 'focus') renderCurrentRoute(); });
applyTheme(getState().theme);
updateStreak();
initRouter();
if (new URLSearchParams(window.location.search).get('auth') === '1') navigate('auth', { replace: true });
