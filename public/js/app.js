import { initRouter, navigate, registerRoute } from './core/router.js';
import { getState, resetState } from './core/store.js';
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
import { settings, handleSettingsAction } from './features/settings.js';
import { getSupabase } from './core/supabase.js';
import { registerUploadedFile, loadDriveFiles } from './features/drive-data.js';
import { initCloudPersistence } from './core/cloud-persistence.js';

const routes = { dashboard, 'ai-chat': aiChat, 'ai-study': aiStudy, 'ai-planner': aiPlanner, schedule, tasks, focus, habits, goals, progress, notes, academic, college, auth, settings };
Object.entries(routes).forEach(([name, route]) => registerRoute(name, route));

document.getElementById('openSidebar').addEventListener('click', () => document.getElementById('sidebar').classList.add('open'));
document.getElementById('closeSidebar').addEventListener('click', closeSidebar);
document.getElementById('sidebarBackdrop').addEventListener('click', closeSidebar);
document.getElementById('themeButton').addEventListener('click', toggleTheme);
document.getElementById('quickFocus').addEventListener('click', () => { navigate('focus'); showToast('Đã mở khu vực Focus.'); });
document.getElementById('searchButton').addEventListener('click', () => showToast('Search sẽ được thêm ở Core phase.'));
document.getElementById('loginButton').addEventListener('click', () => auth.open('login'));
document.getElementById('signupButton').addEventListener('click', () => auth.open('signup'));
document.getElementById('accountButton').addEventListener('click', toggleAccountDropdown);
document.getElementById('accountSettings').addEventListener('click', () => { closeAccountDropdown(); navigate('settings'); });
document.getElementById('accountSignout').addEventListener('click', signOutFromMenu);
document.addEventListener('click', event => { if (!event.target.closest('#accountMenu')) closeAccountDropdown(); });

function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); }
function updateStreak() { document.getElementById('streakValue').textContent = getState().streak; }
function showToast(message) { const el = document.getElementById('toast'); el.textContent = message; el.classList.add('show'); clearTimeout(window.__toast); window.__toast = setTimeout(() => el.classList.remove('show'), 3000); }
function toggleAccountDropdown() { const dropdown = document.getElementById('accountDropdown'); const button = document.getElementById('accountButton'); const open = dropdown.hidden; dropdown.hidden = !open; button.setAttribute('aria-expanded', String(open)); }
function closeAccountDropdown() { const dropdown = document.getElementById('accountDropdown'); const button = document.getElementById('accountButton'); if (!dropdown) return; dropdown.hidden = true; button?.setAttribute('aria-expanded', 'false'); }
async function signOutFromMenu() { try { const supabase = await getSupabase(); const { error } = await supabase.auth.signOut(); if (error) throw error; closeAccountDropdown(); navigate('dashboard'); showToast('Đã đăng xuất.'); } catch (error) { showToast(error.message || 'Không thể đăng xuất.'); } }
async function syncAccountHeader() { try { const supabase = await getSupabase(); const { data } = await supabase.auth.getUser(); updateAccountHeader(data?.user || null); supabase.auth.onAuthStateChange((_event, session) => updateAccountHeader(session?.user || null)); } catch { updateAccountHeader(null); } }
function updateAccountHeader(user) { const menu = document.getElementById('accountMenu'); const login = document.getElementById('loginButton'); const signup = document.getElementById('signupButton'); if (!menu) return; const signedIn = Boolean(user); menu.hidden = !signedIn; if (login) login.hidden = signedIn; if (signup) signup.hidden = signedIn; if (!signedIn) return; const username = user.user_metadata?.username || user.email?.split('@')[0] || 'Tài khoản'; document.getElementById('accountName').textContent = username; document.getElementById('accountLabel').textContent = username; document.getElementById('accountEmail').textContent = user.email || ''; document.getElementById('accountAvatar').textContent = username.trim().charAt(0).toUpperCase() || 'U'; }

function storageExtension(file) { const byName = String(file?.name || '').match(/\.([A-Za-z0-9]+)$/)?.[1]?.toLowerCase(); const byType = ({ 'application/pdf':'pdf','application/msword':'doc','application/vnd.openxmlformats-officedocument.wordprocessingml.document':'docx','image/png':'png','image/jpeg':'jpg','image/webp':'webp' })[file?.type]; return (byName || byType || 'bin').replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin'; }
function makeStoragePath(userId, subjectId, file) { const objectId = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^a-zA-Z0-9-]/g, ''); const safeUserId = String(userId || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64) || 'user'; const safeSubjectId = String(subjectId || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64) || 'subject'; return `${safeUserId}/${safeSubjectId}/${objectId}.${storageExtension(file)}`; }
function restoreActiveSubject(subjectId) { if (!subjectId) return; requestAnimationFrame(() => { const selectorId = CSS.escape(String(subjectId)); const tab = document.querySelector(`.subject-tab[data-id="${selectorId}"]`); const panel = document.querySelector(`.learning-panel[data-subject-panel="${selectorId}"]`); if (!tab || !panel) return; document.querySelectorAll('.subject-tab[data-id]').forEach(el => { const active = el === tab; el.classList.toggle('active', active); el.setAttribute('aria-selected', String(active)); }); document.querySelectorAll('.learning-panel[data-subject-panel]').forEach(el => { const active = el === panel; el.classList.toggle('active', active); el.hidden = !active; }); }); }

async function handleDriveFileSubmit(form) {
  const file = form.querySelector('input[name="file"]')?.files?.[0]; const subjectId = form.dataset.id;
  if (!file || !subjectId) { showToast('Vui lòng chọn một tệp.'); return; }
  if (!/\.(pdf|doc|docx|png|jpe?g|webp)$/i.test(file.name)) { showToast('Định dạng chưa được hỗ trợ.'); return; }
  if (file.size > 50 * 1024 * 1024) { showToast('File quá lớn. Giới hạn Drive hiện tại là 50 MB.'); return; }
  const subject = (getState().subjects || []).find(item => String(item.id) === String(subjectId));
  if (!subject) { showToast('Không tìm thấy môn học.'); return; }
  window.__scholarActiveSubjectId = String(subject.id); const submit = form.querySelector('button[type="submit"]'); if (submit) { submit.disabled = true; submit.textContent = 'Đang tải lên…'; }
  try {
    const supabase = await getSupabase(); const { data: userData, error: userError } = await supabase.auth.getUser(); if (userError || !userData?.user) throw new Error('Bạn cần đăng nhập để tải tài liệu lên Drive.');
    const bucket = 'scholar-drive'; const storagePath = makeStoragePath(userData.user.id, subject.id, file); const upload = await supabase.storage.from(bucket).upload(storagePath, file, { cacheControl:'3600', contentType:file.type || 'application/octet-stream', upsert:false }); if (upload.error) throw upload.error;
    try { await registerUploadedFile({ userId: userData.user.id, subjectId: subject.id, file, storagePath }); } catch (dbError) { await supabase.storage.from(bucket).remove([storagePath]).catch(() => {}); throw new Error(`File đã tải lên Storage nhưng chưa thể đăng ký vào Drive${dbError?.message ? `: ${dbError.message}` : '.'}`); }
    const materials = await loadDriveFiles(); if (!materials.some(item => item.storagePath === storagePath)) throw new Error('Đã tải file nhưng Drive chưa đọc được metadata vừa tạo.');
    renderCurrentRoute(); restoreActiveSubject(subject.id); showToast(`Đã tải “${file.name}” lên Drive.`);
  } catch (error) { console.error('[Drive upload]', error); const message=error?.message || 'Không thể tải file lên Drive.'; if (/bucket|not found|404/i.test(message)) showToast('Không tìm thấy Storage bucket “scholar-drive”.'); else if (/row-level|policy|permission|not authorized|403/i.test(message)) showToast('Storage/Database Policy không cho phép thao tác Drive.'); else if (/invalid key/i.test(message)) showToast('Storage từ chối object key. Hãy tải lại trang rồi thử lại.'); else showToast(message); }
  finally { if (submit) { submit.disabled=false; submit.textContent='Thêm vào Drive'; } }
}
function handleDriveFilter(filterButton) { const panel = filterButton.closest('.learning-panel'); if (!panel) return; const label = filterButton.dataset.filter || filterButton.textContent.trim().toLowerCase(); const filter = label === 'tất cả' ? 'all' : label === 'pdf' ? 'pdf' : label === 'doc/docx' ? 'doc' : label === 'hình ảnh' ? 'image' : 'all'; panel.querySelectorAll('.drive-filter').forEach(button => button.classList.toggle('active', button === filterButton)); panel.querySelectorAll('.drive-card').forEach(card => { const type=(card.dataset.fileType || card.querySelector('.drive-card-main p')?.textContent?.split('·')[0] || '').trim().toLowerCase(); const normalized=type.replace('docx','doc').replace('jpeg','jpg'); let visible=true; if(filter==='pdf')visible=normalized==='pdf'; if(filter==='doc')visible=normalized==='doc'; if(filter==='image')visible=['png','jpg','webp','jpeg','image'].includes(normalized); card.hidden=!visible; }); const grid=panel.querySelector('.drive-grid'), cards=[...panel.querySelectorAll('.drive-card')]; let empty=panel.querySelector('.drive-filter-empty'); const hasVisible=cards.some(card=>!card.hidden); if(!hasVisible&&cards.length){if(!empty){grid?.insertAdjacentHTML('beforeend','<div class="drive-filter-empty drive-empty"><strong>Không có tài liệu</strong><p>Không có file thuộc nhóm này trong Drive.</p></div>');empty=panel.querySelector('.drive-filter-empty');}if(empty)empty.hidden=false;}else if(empty)empty.hidden=true; }

const appView=document.getElementById('appView');
appView.addEventListener('click',event=>{
  const routeTarget=event.target.closest('[data-route]'); if(routeTarget&&appView.contains(routeTarget)){navigate(routeTarget.dataset.route);return;}
  const driveFilterTarget=event.target.closest('.drive-filter'); if(driveFilterTarget&&appView.contains(driveFilterTarget)){handleDriveFilter(driveFilterTarget);return;}
  const actionTarget=event.target.closest('button[data-action], [role="button"][data-action], [data-action="schedule-close-modal"], [data-action="resource-close-modal"]'); if(!actionTarget||!appView.contains(actionTarget))return; const action=actionTarget.dataset.action; event.stopPropagation();
  if(action==='schedule-close-modal'&&event.target.closest('.schedule-modal')&&!event.target.closest('button[data-action="schedule-close-modal"]'))return; if(action==='resource-close-modal'&&event.target.closest('.resource-modal')&&!event.target.closest('button[data-action="resource-close-modal"]'))return;
  if(action==='quiz-answer'){window.__scholarQuizAnswer?.(actionTarget);return;} if(action==='ai-optimize-schedule'){handlePlannerAction(actionTarget);return;} if(action==='drive-filter'){handleDriveFilter(actionTarget);return;}
  if(action?.startsWith('auth-')){handleAuthAction(action,actionTarget.dataset.id,event,actionTarget);return;} if(action?.startsWith('settings-')){handleSettingsAction(action,event,actionTarget);return;} if(action?.startsWith('schedule-')){const r=handleScheduleAction(action,actionTarget.dataset.id,event,actionTarget);if(r==='refresh')renderCurrentRoute();return;} if(action?.startsWith('task-')){const r=handleTaskAction(action,actionTarget.dataset.id,event,actionTarget);if(r==='refresh')renderCurrentRoute();return;}
  if(action?.startsWith('resource-')||/^(note|subject|material|college)-/.test(action)){const r=handleResourceAction(action,actionTarget.dataset.id,event,actionTarget);if(r==='refresh')renderCurrentRoute();return;}
  const focusResult=handleFocusAction(action,actionTarget);if(focusResult==='refresh')renderCurrentRoute(); const result=handleAIAction(action,actionTarget.dataset.id,event,actionTarget)||handleToolAction(action,actionTarget.dataset.id,event);if(result==='refresh')renderCurrentRoute();
});
appView.addEventListener('submit',event=>{
  const form=event.target.closest('form[data-action]');if(!form||!appView.contains(form))return;event.preventDefault();const action=form.dataset.action;
  if(action==='material-drive-create'){handleDriveFileSubmit(form);return;}
  if(action?.startsWith('auth-')){handleAuthAction(action,form.dataset.id,event,form);return;} if(action?.startsWith('settings-')){handleSettingsAction(action,event,form);return;} if(action?.startsWith('schedule-')){const r=handleScheduleAction(action,form.dataset.id,event,form);if(r==='refresh')renderCurrentRoute();return;} if(action?.startsWith('task-')){const r=handleTaskAction(action,form.dataset.id,event,form);if(r==='refresh')renderCurrentRoute();return;} if(action?.startsWith('resource-')||/^(note|subject|material|college)-(create|update)$/.test(action)){const r=handleResourceAction(action,form.dataset.id,event,form);if(r==='refresh')renderCurrentRoute();return;}
  const focusResult=handleFocusAction(action,form);if(focusResult==='refresh')renderCurrentRoute(); const result=handleAIAction(action,form.dataset.id,event,form)||handleToolAction(action,form.dataset.id,event);if(result==='refresh')renderCurrentRoute();
});
function renderCurrentRoute() { const hash=location.hash.replace(/^#/,'') || 'dashboard'; navigate(hash); }
applyTheme(); updateStreak(); initRouter(); initCloudPersistence(); syncAccountHeader();
