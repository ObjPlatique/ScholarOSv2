import { getState } from '../core/store.js';
import { navigate } from '../core/router.js';

const esc = (value = '') => String(value).replace(/[&<>\"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

const pages = [
  ['dashboard', 'Dashboard', 'Tổng quan'], ['ai-chat', 'Scholar AI', 'AI'], ['ai-study', 'Study Assistant', 'AI'], ['ai-planner', 'AI Planner', 'AI'],
  ['schedule', 'Thời gian biểu', 'Tools'], ['tasks', 'Nhiệm vụ', 'Tools'], ['focus', 'Focus', 'Tools'], ['habits', 'Thói quen', 'Tools'], ['goals', 'Mục tiêu', 'Tools'], ['progress', 'Tiến độ', 'Tools'],
  ['notes', 'Ghi chú', 'Resources'], ['academic', 'Học tập', 'Resources'], ['college', 'Đại học', 'Resources'], ['settings', 'Cài đặt', 'Tài khoản']
];

function collectResults(query) {
  const q = query.trim().toLocaleLowerCase('vi'); const state = getState(); const results = [];
  if (!q) return pages.slice(0, 8).map(([route, title, group]) => ({ route, title, group, type: 'page' }));
  pages.forEach(([route, title, group]) => { if (`${title} ${group}`.toLocaleLowerCase('vi').includes(q)) results.push({ route, title, group, type: 'page' }); });
  (state.tasks || []).forEach(task => { if (`${task.title || ''} ${task.description || ''}`.toLocaleLowerCase('vi').includes(q)) results.push({ route: 'tasks', title: task.title || 'Nhiệm vụ', group: 'Nhiệm vụ', type: 'task', meta: task.done ? 'Hoàn thành' : 'Nhiệm vụ' }); });
  (state.notes || []).forEach(note => { if (`${note.title || ''} ${note.content || note.text || ''}`.toLocaleLowerCase('vi').includes(q)) results.push({ route: 'notes', title: note.title || 'Ghi chú', group: 'Ghi chú', type: 'note' }); });
  (state.goals || []).forEach(goal => { if (`${goal.title || ''} ${goal.description || ''}`.toLocaleLowerCase('vi').includes(q)) results.push({ route: 'goals', title: goal.title || 'Mục tiêu', group: 'Mục tiêu', type: 'goal' }); });
  (state.habits || []).forEach(habit => { if (`${habit.title || habit.name || ''} ${habit.description || ''}`.toLocaleLowerCase('vi').includes(q)) results.push({ route: 'habits', title: habit.title || habit.name || 'Thói quen', group: 'Thói quen', type: 'habit' }); });
  (state.schedule || []).forEach(event => { if (`${event.title || event.name || ''} ${event.description || ''}`.toLocaleLowerCase('vi').includes(q)) results.push({ route: 'schedule', title: event.title || event.name || 'Phiên học', group: 'Thời gian biểu', type: 'schedule' }); });
  return results.slice(0, 30);
}

function icon(type) { return ({ page: '⌁', task: '✓', note: '▤', goal: '⚑', habit: '◎', schedule: '▦' }[type] || '⌕'); }

export function openSearch(initial = '') {
  if (document.querySelector('.search-overlay')) { const input = document.querySelector('.search-input'); input?.focus(); input?.select(); return; }
  document.body.insertAdjacentHTML('beforeend', `<div class="search-overlay" role="presentation"><section class="search-dialog" role="dialog" aria-modal="true" aria-labelledby="searchTitle"><header class="search-header"><div><span class="eyebrow">SEARCH</span><h2 id="searchTitle">Tìm kiếm ScholarOS</h2><p>Tìm trang, nhiệm vụ, ghi chú, mục tiêu, thói quen và phiên học.</p></div><button class="icon-button" type="button" data-search-close aria-label="Đóng">×</button></header><div class="search-box"><span>⌕</span><input class="search-input" type="search" value="${esc(initial)}" placeholder="Tìm kiếm..." autocomplete="off"><kbd>Esc</kbd></div><div class="search-results" aria-live="polite"></div><footer class="search-footer"><span><kbd>↑</kbd><kbd>↓</kbd> chọn</span><span><kbd>Enter</kbd> mở</span><span><kbd>Esc</kbd> đóng</span></footer></section></div>`);
  const overlay = document.querySelector('.search-overlay'); const dialog = overlay.querySelector('.search-dialog'); const input = overlay.querySelector('.search-input');
  const render = () => { const results = collectResults(input.value); overlay.querySelector('.search-results').innerHTML = results.length ? results.map((item, index) => `<button class="search-result ${index === 0 ? 'selected' : ''}" type="button" data-search-route="${esc(item.route)}" data-search-index="${index}"><span class="search-result-icon">${icon(item.type)}</span><span class="search-result-copy"><strong>${esc(item.title)}</strong><small>${esc(item.meta || item.group)}</small></span><span class="search-result-arrow">↵</span></button>`).join('') : '<div class="search-empty"><strong>Không tìm thấy kết quả</strong><span>Thử một từ khóa khác.</span></div>'; };
  render();
  const move = direction => { const items = [...overlay.querySelectorAll('.search-result')]; if (!items.length) return; let index = items.findIndex(item => item.classList.contains('selected')); index = (index + direction + items.length) % items.length; items.forEach(item => item.classList.remove('selected')); items[index].classList.add('selected'); items[index].scrollIntoView({ block: 'nearest' }); };
  input.addEventListener('input', render);
  input.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); closeSearch(); return; } if (event.key === 'ArrowDown') { event.preventDefault(); move(1); return; } if (event.key === 'ArrowUp') { event.preventDefault(); move(-1); return; } if (event.key === 'Enter') { event.preventDefault(); overlay.querySelector('.search-result.selected')?.click(); } });
  // Keep all clicks inside the dialog safe. Only the backdrop and explicit close button close Search.
  overlay.addEventListener('click', event => {
    if (event.target === overlay) { closeSearch(); return; }
    const close = event.target.closest('[data-search-close]');
    if (close && dialog.contains(close)) { event.preventDefault(); event.stopPropagation(); closeSearch(); return; }
    const result = event.target.closest('[data-search-route]');
    if (result && dialog.contains(result)) { event.preventDefault(); event.stopPropagation(); const route = result.dataset.searchRoute; closeSearch(); navigate(route); }
  });
  requestAnimationFrame(() => input.focus());
}

function handleGlobalEscape(event) { if (event.key === 'Escape' && document.querySelector('.search-overlay')) closeSearch(); }
export function closeSearch() { document.querySelector('.search-overlay')?.remove(); document.removeEventListener('keydown', handleGlobalEscape); }
