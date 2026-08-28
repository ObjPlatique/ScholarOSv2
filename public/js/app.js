import { initRouter, navigate, registerRoute } from './core/router.js';
import { getState, resetState, exportState, importState, setState } from './core/store.js';
import { applyTheme, toggleTheme } from './core/theme.js';
import { dashboard } from './features/dashboard.js';
import { schedule as legacySchedule, habits, goals, progress, handleToolAction } from './features/tools.js';
import { tasks, handleTaskAction } from './features/tasks.js';
import { schedule, handleScheduleAction } from './features/schedule.js';
import { focus, handleFocusAction } from './features/focus.js';
import { notes, academic, college, handleResourceAction } from './features/resources.js';
import { aiChat, aiStudy, aiPlanner, handleAIAction } from './features/ai.js?v=20260822-render-v1';
import { handlePlannerAction } from './features/ai-planner.js';
import { auth, handleAuthAction } from './features/auth.js';
import { getSupabase } from './core/supabase.js';

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
function showToast(message) { const el = document.getElementById('toast'); el.textContent = message; el.classList.add('show'); clearTimeout(window.__toast); window.__toast = setTimeout(() => el.classList.remove('show'), 3000); }
function exportData() { const blob = new Blob([exportState()], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `scholaros-v2-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url); showToast('Đã xuất dữ liệu ScholarOS.'); }
function importData(event) { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { importState(JSON.parse(reader.result)); updateStreak(); navigate('dashboard'); showToast('Đã nhập dữ liệu ScholarOS.'); } catch (err) { showToast(err.message || 'Không thể nhập dữ liệu.'); } }; reader.readAsText(file); event.target.value = ''; }
function formatFileSize(bytes) { if (!Number.isFinite(bytes) || bytes < 1024) return `${bytes || 0} B`; const units=['KB','MB','GB']; let value=bytes/1024, i=0; while(value>=1024 && i<units.length-1){value/=1024;i++;} return `${value.toFixed(value>=10?0:1)} ${units[i]}`; }

// Storage object keys are deliberately opaque and ASCII-only. The original filename
// is retained separately in metadata so Vietnamese characters never become part of the key.
function storageExtension(file) {
  const byName = String(file?.name || '').match(/\.([A-Za-z0-9]+)$/)?.[1]?.toLowerCase();
  const byType = ({ 'application/pdf':'pdf','application/msword':'doc','application/vnd.openxmlformats-officedocument.wordprocessingml.document':'docx','image/png':'png','image/jpeg':'jpg','image/webp':'webp' })[file?.type];
  return (byName || byType || 'bin').replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin';
}
function makeStoragePath(userId, subjectId, file) {
  const objectId = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^a-zA-Z0-9-]/g, '');
  const safeUserId = String(userId || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64) || 'user';
  const safeSubjectId = String(subjectId || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64) || 'subject';
  return `${safeUserId}/${safeSubjectId}/${objectId}.${storageExtension(file)}`;
}

async function handleDriveFileSubmit(form) {
  const file = form.querySelector('input[name="file"]')?.files?.[0];
  const subjectId = form.dataset.id;
  if (!file || !subjectId) { showToast('Vui lòng chọn một tệp.'); return; }
  const allowed = /\.(pdf|doc|docx|png|jpe?g|webp)$/i.test(file.name);
  if (!allowed) { showToast('Định dạng chưa được hỗ trợ.'); return; }
  if (file.size > 50 * 1024 * 1024) { showToast('File quá lớn. Giới hạn Drive hiện tại là 50 MB.'); return; }
  const state = getState();
  const subject = (state.subjects || []).find(item => item.id === subjectId);
  if (!subject) { showToast('Không tìm thấy môn học.'); return; }
  window.__scholarActiveSubjectId = subject.id;
  const submit = form.querySelector('button[type="submit"]');
  if (submit) { submit.disabled = true; submit.textContent = 'Đang tải lên…'; }
  try {
    const supabase = await getSupabase();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) throw new Error('Bạn cần đăng nhập để tải tài liệu lên Drive.');
    const bucket = 'scholar-drive';
    const storagePath = makeStoragePath(userData.user.id, subject.id, file);
    const upload = await supabase.storage.from(bucket).upload(storagePath, file, { cacheControl:'3600', contentType:file.type || 'application/octet-stream', upsert:false });
    if (upload.error) throw upload.error;

    const material = {
      id:`material-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      title:file.name, subjectId:subject.id, subject:subject.name,
      type:file.name.split('.').pop()?.toUpperCase() || 'FILE', mimeType:file.type || 'application/octet-stream',
      size:formatFileSize(file.size), fileSize:file.size, fileName:file.name,
      storageFileName:storagePath.split('/').pop(), updatedAt:new Date().toISOString().slice(0,10),
      storageBucket:bucket, storagePath, storageStatus:'uploaded'
    };

    const nextMaterials = [...(getState().materials || []), material];
    setState({ materials: nextMaterials });
    const persisted = getState().materials?.some(item => item.id === material.id && item.storagePath === storagePath);
    if (!persisted) throw new Error('Không thể lưu thông tin file vào Drive trên thiết bị.');

    renderCurrentRoute();
    showToast(`Đã tải “${file.name}” lên Drive.`);
  } catch (error) {
    console.error('[Drive upload]', error);
    const message=error?.message || 'Không thể tải file lên Drive.';
    if (/bucket|not found|404/i.test(message)) showToast('Không tìm thấy Storage bucket “scholar-drive”.');
    else if (/row-level|policy|permission|not authorized|403/i.test(message)) showToast('Storage Policy không cho phép tải file lên Drive.');
    else if (/invalid key/i.test(message)) showToast('Storage từ chối object key. Phiên bản này đã chuyển sang key UUID an toàn; hãy tải lại trang rồi thử lại.');
    else showToast(message);
  } finally { if (submit) { submit.disabled=false; submit.textContent='Thêm vào Drive'; } }
}

function handleDriveFilter(filterButton) {
  const panel = filterButton.closest('.learning-panel'); if (!panel) return;
  const label = filterButton.dataset.filter || filterButton.textContent.trim().toLowerCase();
  const filter = label === 'tất cả' ? 'all' : label === 'pdf' ? 'pdf' : label === 'doc/docx' ? 'doc' : label === 'hình ảnh' ? 'image' : 'all';
  panel.querySelectorAll('.drive-filter').forEach(button => button.classList.toggle('active', button === filterButton));
  panel.querySelectorAll('.drive-card').forEach(card => { const type=(card.dataset.fileType || card.querySelector('.drive-card-main p')?.textContent?.split('·')[0] || '').trim().toLowerCase(); const normalized=type.replace('docx','doc').replace('jpeg','jpg'); let visible=true; if(filter==='pdf')visible=normalized==='pdf'; if(filter==='doc')visible=normalized==='doc'; if(filter==='image')visible=['png','jpg','webp','jpeg','image'].includes(normalized); card.hidden=!visible; });
  const grid=panel.querySelector('.drive-grid'), cards=[...panel.querySelectorAll('.drive-card')]; let empty=panel.querySelector('.drive-filter-empty'); const hasVisible=cards.some(card=>!card.hidden);
  if(!hasVisible&&cards.length){if(!empty){grid?.insertAdjacentHTML('beforeend','<div class="drive-filter-empty drive-empty"><strong>Không có tài liệu</strong><p>Không có file thuộc nhóm này trong Drive.</p></div>');empty=panel.querySelector('.drive-filter-empty');}if(empty)empty.hidden=false;}else if(empty)empty.hidden=true;
}

const appView=document.getElementById('appView');
appView.addEventListener('click',event=>{
  const routeTarget=event.target.closest('[data-route]'); if(routeTarget&&appView.contains(routeTarget)){navigate(routeTarget.dataset.route);return;}
  const driveFilterTarget=event.target.closest('.drive-filter'); if(driveFilterTarget&&appView.contains(driveFilterTarget)){handleDriveFilter(driveFilterTarget);return;}
  const actionTarget=event.target.closest('button[data-action], [role="button"][data-action], [data-action="schedule-close-modal"], [data-action="resource-close-modal"]'); if(!actionTarget||!appView.contains(actionTarget))return;
  const action=actionTarget.dataset.action; event.stopPropagation();
  if(action==='schedule-close-modal'&&event.target.closest('.schedule-modal')&&!event.target.closest('button[data-action="schedule-close-modal"]'))return;
  if(action==='resource-close-modal'&&event.target.closest('.resource-modal')&&!event.target.closest('button[data-action="resource-close-modal"]'))return;
  if(action==='quiz-answer'){window.__scholarQuizAnswer?.(actionTarget);return;} if(action==='ai-optimize-schedule'){handlePlannerAction(actionTarget);return;} if(action==='drive-filter'){handleDriveFilter(actionTarget);return;}
  if(action?.startsWith('auth-')){handleAuthAction(action,actionTarget.dataset.id,event,actionTarget);return;} if(action?.startsWith('schedule-')){const r=handleScheduleAction(action,actionTarget.dataset.id,event,actionTarget);if(r==='refresh')renderCurrentRoute();return;} if(action?.startsWith('task-')){const r=handleTaskAction(action,actionTarget.dataset.id,event,actionTarget);if(r==='refresh')renderCurrentRoute();return;}
  if(action?.startsWith('resource-')||/^(note|subject|material|college)-/.test(action)){const r=handleResourceAction(action,actionTarget.dataset.id,event,actionTarget);if(r==='refresh')renderCurrentRoute();return;}
  const focusResult=handleFocusAction(action,actionTarget);if(focusResult==='refresh')renderCurrentRoute();const result=handleAIAction(action,actionTarget.dataset.id,event,actionTarget)||handleToolAction(action,actionTarget.dataset.id,event);if(result==='refresh')renderCurrentRoute();
});

appView.addEventListener('submit',event=>{
  const form=event.target.closest('form[data-action]');if(!form||!appView.contains(form))return;event.preventDefault();const action=form.dataset.action;
  if(action==='material-drive-create'){handleDriveFileSubmit(form);return;}
  if(action?.startsWith('auth-')){handleAuthAction(action,form.dataset.id,event,form);return;} if(action?.startsWith('schedule-')){const r=handleScheduleAction(action,form.dataset.id,event,form);if(r==='refresh')renderCurrentRoute();return;} if(action?.startsWith('task-')){const r=handleTaskAction(action,form.dataset.id,event,form);if(r==='refresh')renderCurrentRoute();return;} if(action?.startsWith('resource-')||/^(note|subject|material|college)-(create|update)$/.test(action)){const r=handleResourceAction(action,form.dataset.id,event,form);if(r==='refresh')renderCurrentRoute();return;}
  const focusResult=handleFocusAction(action,form);if(focusResult==='refresh')renderCurrentRoute();const result=handleAIAction(action,form.dataset.id,event,form)||handleToolAction(action,form.dataset.id,event);if(result==='refresh')renderCurrentRoute();
});

function renderCurrentRoute() { const hash=location.hash.replace(/^#/,'') || 'dashboard'; navigate(hash); }

applyTheme();
updateStreak();
initRouter();