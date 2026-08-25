import { getState, setState } from '../core/store.js';

const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const today = () => new Date().toISOString().slice(0, 10);
const esc = (value = '') => String(value).replace(/[&<>\"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '\"': '&quot;',
  "'": '&#39;'
}[char]));

function dateLabel(value) {
  if (!value) return 'Chưa ghi nhận';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function habitStreak(completed = []) {
  const days = new Set(completed);
  const cursor = new Date(`${today()}T00:00:00`);
  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function openToolModal(html) {
  closeToolModal();
  document.getElementById('appView')?.insertAdjacentHTML('beforeend', html);
}

function closeToolModal() {
  document.querySelector('.tool-modal-backdrop')?.remove();
}

function habitModal(habit = {}) {
  return `<div class="tool-modal-backdrop" data-action="tool-close-modal">
    <section class="tool-modal" role="dialog" aria-modal="true" aria-labelledby="habitModalTitle">
      <header class="tool-modal-header">
        <div><span class="eyebrow">HABIT TRACKER</span><h2 id="habitModalTitle">${habit.id ? 'Chỉnh sửa thói quen' : 'Thêm thói quen'}</h2><p>Thiết lập một hành động nhỏ để duy trì nhịp học đều đặn.</p></div>
        <button type="button" class="icon-button" data-action="tool-close-modal" aria-label="Đóng">×</button>
      </header>
      <form class="tool-form" data-action="habit-create" data-id="${esc(habit.id || '')}">
        <div class="tool-form-grid">
          <label class="tool-field tool-field-full"><span>Tên thói quen</span><input name="title" required maxlength="100" value="${esc(habit.title || '')}" placeholder="Ví dụ: Đọc 20 phút mỗi tối" autofocus></label>
          <label class="tool-field tool-field-full"><span>Mô tả <small>(không bắt buộc)</small></span><textarea name="description" rows="3" maxlength="240" placeholder="Mô tả ngắn về thói quen...">${esc(habit.description || '')}</textarea></label>
        </div>
        <footer class="tool-modal-footer"><button type="button" class="button" data-action="tool-close-modal">Hủy</button><button type="submit" class="button primary">${habit.id ? 'Lưu thay đổi' : 'Thêm thói quen'}</button></footer>
      </form>
    </section>
  </div>`;
}

function goalModal(goal = {}) {
  return `<div class="tool-modal-backdrop" data-action="tool-close-modal">
    <section class="tool-modal" role="dialog" aria-modal="true" aria-labelledby="goalModalTitle">
      <header class="tool-modal-header">
        <div><span class="eyebrow">GOAL TRACKER</span><h2 id="goalModalTitle">${goal.id ? 'Chỉnh sửa mục tiêu' : 'Thêm mục tiêu'}</h2><p>Đặt mục tiêu rõ ràng và cập nhật tiến độ theo từng bước.</p></div>
        <button type="button" class="icon-button" data-action="tool-close-modal" aria-label="Đóng">×</button>
      </header>
      <form class="tool-form" data-action="goal-create" data-id="${esc(goal.id || '')}">
        <div class="tool-form-grid">
          <label class="tool-field tool-field-full"><span>Tên mục tiêu</span><input name="title" required maxlength="120" value="${esc(goal.title || '')}" placeholder="Ví dụ: Hoàn thành 100 bài Toán HSA" autofocus></label>
          <label class="tool-field"><span>Mốc cần đạt <small>(không bắt buộc)</small></span><input name="target" maxlength="80" value="${esc(goal.target || '')}" placeholder="Ví dụ: 100 bài"></label>
          <label class="tool-field"><span>Tiến độ hiện tại</span><input name="progress" type="number" min="0" max="100" step="1" value="${Math.max(0, Math.min(100, Number(goal.progress) || 0))}"></label>
        </div>
        <footer class="tool-modal-footer"><button type="button" class="button" data-action="tool-close-modal">Hủy</button><button type="submit" class="button primary">${goal.id ? 'Lưu thay đổi' : 'Thêm mục tiêu'}</button></footer>
      </form>
    </section>
  </div>`;
}

export function habits() {
  const items = getState().habits || [];
  return {
    title: 'Thói quen',
    description: 'Xây dựng nhịp học đều đặn thay vì chỉ dựa vào động lực.',
    render: () => `<div class="tool-module">
      <div class="module-toolbar tool-toolbar"><div><span class="eyebrow">HABIT TRACKER</span><h2 class="section-title">Thói quen</h2><p class="muted">Đánh dấu những việc bạn đã hoàn thành hôm nay và duy trì chuỗi ngày.</p></div><button class="button primary" data-action="habit-add">+ Thêm thói quen</button></div>
      <div class="tool-summary"><span>${items.length} thói quen</span><span>${items.filter((habit) => habit.completed?.includes(today())).length} đã hoàn thành hôm nay</span></div>
      <div class="habit-list">${items.length ? items.map((habit) => {
        const done = habit.completed?.includes(today());
        const streak = habitStreak(habit.completed || []);
        return `<article class="tool-card habit-card ${done ? 'is-done' : ''}">
          <button type="button" class="habit-check ${done ? 'done' : ''}" data-action="habit-toggle" data-id="${esc(habit.id)}" aria-label="${done ? 'Bỏ đánh dấu' : 'Đánh dấu hoàn thành'}">${done ? '✓' : ''}</button>
          <div class="tool-card-main"><div class="tool-card-title"><strong>${esc(habit.title)}</strong>${done ? '<span class="status-chip success">Hôm nay ✓</span>' : '<span class="status-chip">Chưa hoàn thành</span>'}</div>${habit.description ? `<p>${esc(habit.description)}</p>` : ''}<div class="tool-card-meta"><span>🔥 ${streak} ngày liên tiếp</span><span>✓ ${habit.completed?.length || 0} ngày hoàn thành</span>${habit.completed?.length ? `<span>Gần nhất: ${dateLabel(habit.completed[habit.completed.length - 1])}</span>` : ''}</div></div>
          <div class="tool-card-actions"><button type="button" class="icon-button" data-action="habit-edit" data-id="${esc(habit.id)}" aria-label="Sửa">✎</button><button type="button" class="icon-button danger-icon" data-action="habit-delete" data-id="${esc(habit.id)}" aria-label="Xóa">×</button></div>
        </article>`;
      }).join('') : `<div class="empty-state"><strong>Chưa có thói quen</strong><span>Thêm thói quen đầu tiên để bắt đầu xây dựng nhịp học ổn định.</span><button class="button primary" data-action="habit-add">+ Tạo thói quen</button></div>`}</div>
    </div>`
  };
}

export function goals() {
  const items = getState().goals || [];
  return {
    title: 'Mục tiêu',
    description: 'Chia mục tiêu lớn thành tiến trình có thể theo dõi.',
    render: () => `<div class="tool-module">
      <div class="module-toolbar tool-toolbar"><div><span class="eyebrow">GOAL TRACKER</span><h2 class="section-title">Mục tiêu</h2><p class="muted">Theo dõi tiến độ bằng những mốc rõ ràng thay vì chỉ ghi nhớ mục tiêu.</p></div><button class="button primary" data-action="goal-add">+ Thêm mục tiêu</button></div>
      <div class="tool-summary"><span>${items.length} mục tiêu</span><span>${items.filter((goal) => Number(goal.progress) >= 100).length} đã hoàn thành</span></div>
      <div class="goal-list">${items.length ? items.map((goal) => {
        const progress = Math.max(0, Math.min(100, Number(goal.progress) || 0));
        return `<article class="tool-card goal-card ${progress >= 100 ? 'is-complete' : ''}">
          <div class="tool-card-main"><div class="tool-card-title"><strong>${esc(goal.title)}</strong><span class="goal-percent">${progress}%</span></div>${goal.target ? `<p>Mục tiêu: ${esc(goal.target)}</p>` : ''}<div class="goal-progress-track"><i style="width:${progress}%"></i></div><div class="tool-card-meta"><span>${progress >= 100 ? '✓ Đã hoàn thành' : `Còn ${100 - progress}%`}</span>${goal.target ? `<span>🎯 ${esc(goal.target)}</span>` : ''}</div></div>
          <div class="tool-card-actions goal-actions"><button type="button" class="button" data-action="goal-minus" data-id="${esc(goal.id)}">− 10%</button><button type="button" class="button" data-action="goal-plus" data-id="${esc(goal.id)}">+ 10%</button><button type="button" class="icon-button" data-action="goal-edit" data-id="${esc(goal.id)}" aria-label="Sửa">✎</button><button type="button" class="icon-button danger-icon" data-action="goal-delete" data-id="${esc(goal.id)}" aria-label="Xóa">×</button></div>
        </article>`;
      }).join('') : `<div class="empty-state"><strong>Chưa có mục tiêu</strong><span>Tạo mục tiêu đầu tiên và bắt đầu cập nhật tiến độ.</span><button class="button primary" data-action="goal-add">+ Tạo mục tiêu</button></div>`}</div>
    </div>`
  };
}

export function progress() {
  const state = getState();
  const taskItems = state.tasks || [];
  const done = taskItems.filter((task) => task.done).length;
  const habitCount = (state.habits || []).reduce((sum, habit) => sum + (habit.completed?.length || 0), 0);
  return {
    title: 'Tiến độ',
    description: 'Một bảng tổng hợp ngắn gọn về hệ thống học tập của bạn.',
    render: () => `<div class="stat-grid"><div class="card stat-card"><span>Nhiệm vụ hoàn thành</span><strong>${done}/${taskItems.length}</strong></div><div class="card stat-card"><span>Thói quen đã ghi nhận</span><strong>${habitCount}</strong></div><div class="card stat-card"><span>Mục tiêu</span><strong>${(state.goals || []).length}</strong></div><div class="card stat-card"><span>Focus sessions</span><strong>${state.focusSessions || 0}</strong></div></div><div class="card"><h2>Tổng quan</h2><p class="muted">ScholarOS sẽ dần dùng dữ liệu này để tạo phân tích và đề xuất học tập ở các phase sau.</p></div>`
  };
}

export function handleToolAction(action, id, event, target) {
  const state = getState();

  if (action === 'tool-close-modal') {
    const insideModal = event.target.closest('.tool-modal');
    if (!insideModal || event.target.closest('button[data-action="tool-close-modal"]')) closeToolModal();
    return 'handled';
  }

  if (action === 'habit-add') {
    openToolModal(habitModal());
    document.querySelector('.tool-modal input[name="title"]')?.focus();
    return 'handled';
  }
  if (action === 'habit-edit') {
    const habit = (state.habits || []).find((item) => item.id === id);
    if (habit) openToolModal(habitModal(habit));
    return 'handled';
  }
  if (action === 'habit-create') {
    const form = target?.matches?.('form[data-action="habit-create"]') ? target : event.target.closest('form[data-action="habit-create"]');
    if (!form) return 'handled';
    const data = new FormData(form);
    const title = String(data.get('title') || '').trim();
    if (!title) return 'handled';
    const description = String(data.get('description') || '').trim();
    const habitsState = [...(state.habits || [])];
    const habitId = String(form.dataset.id || '');
    if (habitId) {
      const index = habitsState.findIndex((habit) => habit.id === habitId);
      if (index >= 0) habitsState[index] = { ...habitsState[index], title, description };
    } else habitsState.push({ id: uid('habit'), title, description, completed: [] });
    setState({ habits: habitsState });
    closeToolModal();
    return 'refresh';
  }
  if (action === 'habit-toggle') {
    setState({ habits: (state.habits || []).map((habit) => {
      if (habit.id !== id) return habit;
      const completed = [...(habit.completed || [])];
      const index = completed.indexOf(today());
      if (index >= 0) completed.splice(index, 1); else completed.push(today());
      return { ...habit, completed };
    }) });
    return 'refresh';
  }
  if (action === 'habit-delete') {
    if (!confirm('Xóa thói quen này?')) return 'handled';
    setState({ habits: (state.habits || []).filter((habit) => habit.id !== id) });
    return 'refresh';
  }

  if (action === 'goal-add') {
    openToolModal(goalModal());
    document.querySelector('.tool-modal input[name="title"]')?.focus();
    return 'handled';
  }
  if (action === 'goal-edit') {
    const goal = (state.goals || []).find((item) => item.id === id);
    if (goal) openToolModal(goalModal(goal));
    return 'handled';
  }
  if (action === 'goal-create') {
    const form = target?.matches?.('form[data-action="goal-create"]') ? target : event.target.closest('form[data-action="goal-create"]');
    if (!form) return 'handled';
    const data = new FormData(form);
    const title = String(data.get('title') || '').trim();
    if (!title) return 'handled';
    const progressValue = Math.max(0, Math.min(100, Number(data.get('progress')) || 0));
    const goalId = String(form.dataset.id || '');
    const goalsState = [...(state.goals || [])];
    const nextGoal = { id: goalId || uid('goal'), title, target: String(data.get('target') || '').trim(), progress: progressValue };
    if (goalId) {
      const index = goalsState.findIndex((goal) => goal.id === goalId);
      if (index >= 0) goalsState[index] = { ...goalsState[index], ...nextGoal };
    } else goalsState.push(nextGoal);
    setState({ goals: goalsState });
    closeToolModal();
    return 'refresh';
  }
  if (action === 'goal-plus' || action === 'goal-minus') {
    const delta = action === 'goal-plus' ? 10 : -10;
    setState({ goals: (state.goals || []).map((goal) => goal.id === id ? { ...goal, progress: Math.max(0, Math.min(100, (Number(goal.progress) || 0) + delta)) } : goal) });
    return 'refresh';
  }
  if (action === 'goal-delete') {
    if (!confirm('Xóa mục tiêu này?')) return 'handled';
    setState({ goals: (state.goals || []).filter((goal) => goal.id !== id) });
    return 'refresh';
  }

  return null;
}

// Kept as a compatibility export for older imports. Schedule is now handled by schedule.js.
export function schedule() {
  const items = getState().schedule || [];
  return {
    title: 'Thời gian biểu',
    description: 'Xây dựng lịch học có cấu trúc nhưng vẫn linh hoạt.',
    render: () => `<div class="card"><h2>Thời gian biểu</h2><p class="muted">${items.length} phiên học đã lập lịch.</p></div>`
  };
}
