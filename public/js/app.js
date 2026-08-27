import { initRouter, navigate, registerRoute } from './core/router.js';
import { getState, resetState } from './core/store.js';
import { applyTheme, toggleTheme } from './core/theme.js';
import { getSupabase } from './core/supabase.js';
import { dashboard } from './features/dashboard.js';
import { habits, goals, progress, handleToolAction } from './features/tools.js';
import { tasks, handleTaskAction } from './features/tasks.js';
import { schedule, handleScheduleAction } from './features/schedule.js';
import { focus, handleFocusAction } from './features/focus.js';
import { notes, academic, college, handleResourceAction } from './features/resources.js';
import { aiChat, aiStudy, aiPlanner, handleAIAction } from './features/ai.js?v=20260822-render-v1';
import { handlePlannerAction } from './features/ai-planner.js';
import { auth, handleAuthAction } from './features/auth.js';
import { settings, handleSettingsAction } from './features/settings.js';

const routes = { dashboard, 'ai-chat': aiChat, 'ai-study': aiStudy, 'ai-planner': aiPlanner, schedule, tasks, focus, habits, goals, progress, notes, academic, college, auth, settings };
Object.entries(routes).forEach(([name, route]) => registerRoute(name, route));

const $ = id => document.getElementById(id);
$('openSidebar').addEventListener('click', () => $('sidebar').classList.add('open'));
$('closeSidebar').addEventListener('click', closeSidebar);
$('sidebarBackdrop').addEventListener('click', closeSidebar);
$('themeButton').addEventListener('click', toggleTheme);
$('quickFocus').addEventListener('click', () => { navigate('focus'); showToast('Đã mở khu vực Focus.'); });
$('searchButton').addEventListener('click', () => showToast('Search sẽ được thêm ở Core phase.'));
$('loginButton').addEventListener('click', () => auth.open('login'));
$('signupButton').addEventListener('click', () => auth.open('signup'));
$('settingsBtn').addEventListener('click', () => navigate('settings'));
$('resetBtn').addEventListener('click', () => { if (!confirm('Đặt lại toàn bộ dữ liệu ScholarOS v2?')) return; resetState(); updateStreak(); showToast('Đã đặt lại dữ liệu.'); navigate('dashboard'); });
$('accountButton').addEventListener('click', event => { event.stopPropagation(); toggleAccountMenu(); });
$('accountSettings').addEventListener('click', () => { closeAccountMenu(); navigate('settings'); });
$('accountSignout').addEventListener('click', signOutFromMenu);
document.addEventListener('click', event => { if (!event.target.closest('#accountMenu')) closeAccountMenu(); });

function closeSidebar() { $('sidebar').classList.remove('open'); }
function updateStreak() { $('streakValue').textContent = getState().streak; }
function showToast(message) { const el = $('toast'); el.textContent = message; el.classList.add('show'); clearTimeout(window.__toast); window.__toast = setTimeout(() => el.classList.remove('show'), 2400); }
function toggleAccountMenu() { const menu = $('accountDropdown'); const button = $('accountButton'); const open = menu.classList.toggle('open'); button.setAttribute('aria-expanded', String(open)); }
function closeAccountMenu() { $('accountDropdown').classList.remove('open'); $('accountButton').setAttribute('aria-expanded', 'false'); }

async function signOutFromMenu() {
  try { const supabase = await getSupabase(); const { error } = await supabase.auth.signOut(); if (error) throw error; updateAccountUI(null); closeAccountMenu(); showToast('Đã đăng xuất.'); navigate('dashboard'); }
  catch (error) { showToast(error.message || 'Không thể đăng xuất.'); }
}

function updateAccountUI(user) {
  const accountMenu = $('accountMenu');
  const loggedIn = Boolean(user);
  accountMenu.hidden = !loggedIn;
  $('loginButton').hidden = loggedIn;
  $('signupButton').hidden = loggedIn;
  if (!loggedIn) return;
  const nickname = user.user_metadata?.nickname?.trim() || '';
  const email = user.email || '';
  const label = nickname || email.split('@')[0] || 'Tài khoản';
  $('accountLabel').textContent = label;
  $('accountName').textContent = nickname || 'Tài khoản';
  $('accountEmail').textContent = email;
  $('accountAvatar').textContent = label.charAt(0).toUpperCase();
}

async function initAuthUI() {
  try {
    const supabase = await getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    updateAccountUI(session?.user || null);
    supabase.auth.onAuthStateChange((_event, nextSession) => updateAccountUI(nextSession?.user || null));
  } catch { updateAccountUI(null); }
}

const appView = $('appView');
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
  if (action?.startsWith('settings-')) { const r = handleSettingsAction(action, actionTarget.dataset.id, event, actionTarget); if (r === 'refresh') renderCurrentRoute(); return; }
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
  if (action?.startsWith('settings-')) { const r = handleSettingsAction(action, form.dataset.id, event, form); if (r === 'refresh') renderCurrentRoute(); return; }
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
initAuthUI();
if (new URLSearchParams(window.location.search).get('auth') === '1') navigate('auth', { replace: true });
