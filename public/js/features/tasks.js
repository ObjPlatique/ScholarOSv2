import { getState, setState } from '../core/store.js';

const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const today = () => new Date().toISOString().slice(0, 10);
const esc = (value = '') => String(value).replace(/[&<>\"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));

function dateLabel(value) {
  if (!value) return 'Không có deadline';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function dayDiff(from, to) {
  if (!from || !to) return null;
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.round((b - a) / 86400000);
}

function normalizeTask(task) {
  const dueDate = task.dueDate || task.due || '';
  return {
    ...task,
    startDate: task.startDate || dueDate || '',
    dueDate,
    priority: task.priority || 'medium',
    done: Boolean(task.done)
  };
}

export function tasks() {
  const items = (getState().tasks || []).map(normalizeTask);
  const now = today();
  const filter = window.__scholarTaskFilter || 'all';

  const filtered = items.filter((task) => {
    const due = task.dueDate;
    if (filter === 'today') {
      return due === now || (task.startDate && task.startDate <= now && due >= now);
    }
    if (filter === 'upcoming') return !task.done && due >= now;
    if (filter === 'overdue') return !task.done && due && due < now;
    if (filter === 'completed') return task.done;
    return true;
  });

  filtered.sort((a, b) => String(a.dueDate || '9999').localeCompare(String(b.dueDate || '9999')));

  return {
    title: 'Nhiệm vụ',
    description: 'Theo dõi việc cần làm bằng khoảng thời gian và deadline rõ ràng.',
    render: () => `
      <div class="module-toolbar task-toolbar">
        <div>
          <h2 class="section-title">Danh sách nhiệm vụ</h2>
          <p class="muted">Một nhiệm vụ có thể kéo dài nhiều ngày cho tới deadline.</p>
        </div>
        <button class="button primary" data-action="task-add">+ Thêm nhiệm vụ</button>
      </div>
      <div class="task-filters" role="toolbar" aria-label="Lọc nhiệm vụ">
        ${[
          ['all', 'Tất cả'],
          ['today', 'Hôm nay'],
          ['upcoming', 'Sắp tới'],
          ['overdue', 'Quá hạn'],
          ['completed', 'Hoàn thành']
        ].map(([key, label]) => `<button type="button" class="task-filter ${filter === key ? 'active' : ''}" data-action="task-filter" data-filter="${key}">${label}</button>`).join('')}
      </div>
      <div class="task-list">
        ${filtered.length ? filtered.map((task) => {
          const span = dayDiff(task.startDate, task.dueDate);
          const remaining = dayDiff(now, task.dueDate);
          const overdue = !task.done && Boolean(task.dueDate) && task.dueDate < now;
          let deadlineText = `Deadline: ${dateLabel(task.dueDate)}`;
          if (span !== null && span > 0) {
            deadlineText = `${dateLabel(task.startDate)} → ${dateLabel(task.dueDate)}`;
          }
          let status = '';
          if (task.done) status = '✓ Hoàn thành';
          else if (overdue) status = `⚠ Quá hạn ${Math.abs(remaining)} ngày`;
          else if (remaining === 0) status = '⚠ Deadline hôm nay';
          else if (remaining !== null) status = `Còn ${remaining} ngày`;

          return `
            <article class="task-card ${task.done ? 'is-done' : ''} ${overdue ? 'is-overdue' : ''}">
              <button type="button" class="check-button" data-action="task-toggle" data-id="${task.id}" aria-label="Hoàn thành">${task.done ? '✓' : ''}</button>
              <div class="task-main">
                <div class="task-title-row">
                  <strong>${esc(task.title)}</strong>
                  <span class="priority priority-${esc(task.priority)}">${esc(task.priority)}</span>
                </div>
                ${task.description ? `<p>${esc(task.description)}</p>` : ''}
                <div class="task-meta"><span>📅 ${deadlineText}</span>${status ? `<span class="task-status">${status}</span>` : ''}</div>
              </div>
              <button type="button" class="icon-button" data-action="task-delete" data-id="${task.id}" aria-label="Xóa">×</button>
            </article>`;
        }).join('') : `<div class="empty-state"><strong>${filter === 'overdue' ? 'Không có nhiệm vụ quá hạn' : filter === 'completed' ? 'Chưa có nhiệm vụ hoàn thành' : 'Chưa có nhiệm vụ'}</strong><span>${filter === 'all' ? 'Thêm nhiệm vụ đầu tiên của bạn.' : 'Không có nhiệm vụ phù hợp với bộ lọc này.'}</span></div>`}
      </div>`
  };
}

function openTaskModal() {
  const root = document.getElementById('appView');
  if (!root || root.querySelector('.task-modal-backdrop')) return;

  const date = today();
  root.insertAdjacentHTML('beforeend', `
    <div class="task-modal-backdrop" data-action="task-close-modal">
      <section class="task-modal" role="dialog" aria-modal="true" aria-labelledby="taskModalTitle" data-stop-click="true">
        <form data-action="task-create" class="task-form">
          <header class="task-modal-header">
            <div>
              <span class="eyebrow">NEW TASK</span>
              <h2 id="taskModalTitle">Thêm nhiệm vụ</h2>
              <p>Đặt khoảng thời gian và deadline cho một nhiệm vụ.</p>
            </div>
            <button type="button" class="icon-button" data-action="task-close-modal" aria-label="Đóng">×</button>
          </header>
          <div class="task-form-grid">
            <label class="task-field task-field-full">
              <span>Tên nhiệm vụ</span>
              <input name="title" required maxlength="120" placeholder="Ví dụ: Hoàn thành bài tập Toán chương 3" autofocus>
            </label>
            <label class="task-field task-field-full">
              <span>Mô tả <small>(không bắt buộc)</small></span>
              <textarea name="description" rows="3" maxlength="500" placeholder="Ghi chú ngắn về việc cần hoàn thành..."></textarea>
            </label>
            <label class="task-field">
              <span>Ngày bắt đầu</span>
              <input type="date" name="startDate" value="${date}">
            </label>
            <label class="task-field">
              <span>Deadline</span>
              <input type="date" name="dueDate" value="${date}" required>
            </label>
            <label class="task-field task-field-full">
              <span>Độ ưu tiên</span>
              <select name="priority">
                <option value="low">Thấp</option>
                <option value="medium" selected>Trung bình</option>
                <option value="high">Cao</option>
              </select>
            </label>
          </div>
          <div class="task-modal-footer">
            <button type="button" class="button" data-action="task-close-modal">Hủy</button>
            <button type="submit" class="button primary">Thêm nhiệm vụ</button>
          </div>
        </form>
      </section>
    </div>`);

  root.querySelector('.task-modal input[name="title"]')?.focus();
}

function closeTaskModal() {
  document.querySelector('.task-modal-backdrop')?.remove();
}

export function handleTaskAction(action, id, event, target) {
  const state = getState();

  if (action === 'task-add') {
    openTaskModal();
    return;
  }

  if (action === 'task-close-modal') {
    const backdrop = event.target.closest('.task-modal-backdrop');
    const insideModal = event.target.closest('.task-modal');
    if (!insideModal || event.target.closest('button[data-action="task-close-modal"]')) {
      closeTaskModal();
    }
    return;
  }

  if (action === 'task-filter') {
    window.__scholarTaskFilter = target?.dataset.filter || 'all';
    return 'refresh';
  }

  if (action === 'task-create') {
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get('title') || '').trim();
    const startDate = String(data.get('startDate') || '');
    const dueDate = String(data.get('dueDate') || '');

    if (!title) {
      form.querySelector('[name="title"]')?.focus();
      return;
    }
    if (startDate && dueDate && dueDate < startDate) {
      alert('Deadline không thể sớm hơn ngày bắt đầu.');
      return;
    }

    setState({
      tasks: [
        ...(state.tasks || []),
        {
          id: uid('task'),
          title,
          description: String(data.get('description') || '').trim(),
          priority: String(data.get('priority') || 'medium'),
          startDate: startDate || dueDate || today(),
          dueDate: dueDate || startDate || today(),
          done: false
        }
      ]
    });
    closeTaskModal();
    return 'refresh';
  }

  if (action === 'task-toggle') {
    setState({ tasks: (state.tasks || []).map((task) => task.id === id ? { ...task, done: !task.done } : task) });
    return 'refresh';
  }

  if (action === 'task-delete') {
    setState({ tasks: (state.tasks || []).filter((task) => task.id !== id) });
    return 'refresh';
  }

  return null;
}
