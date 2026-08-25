import { getState, setState } from '../core/store.js';

const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const today = () => new Date().toISOString().slice(0, 10);
const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));

export function habits() {
  const items = getState().habits || [];
  return {
    title: 'Thói quen',
    description: 'Xây dựng nhịp học đều đặn thay vì chỉ dựa vào động lực.',
    render: () => `
      <div class="module-toolbar">
        <div>
          <h2 class="section-title">Thói quen</h2>
          <p class="muted">Đánh dấu những việc bạn đã hoàn thành hôm nay.</p>
        </div>
        <button class="button primary" data-action="habit-add">+ Thêm thói quen</button>
      </div>
      <div class="habit-grid">
        ${items.length ? items.map((habit) => `
          <article class="card habit-card">
            <button class="habit-check ${habit.completed?.includes(today()) ? 'done' : ''}" data-action="habit-toggle" data-id="${habit.id}">
              ${habit.completed?.includes(today()) ? '✓' : '○'}
            </button>
            <div>
              <strong>${esc(habit.title)}</strong>
              <span>${habit.completed?.length || 0} ngày hoàn thành</span>
            </div>
            <button class="icon-button" data-action="habit-delete" data-id="${habit.id}">×</button>
          </article>`).join('') : `
          <div class="empty-state">
            <strong>Chưa có thói quen</strong>
            <span>Thêm một thói quen học tập nhỏ để bắt đầu.</span>
          </div>`}
      </div>`
  };
}

export function goals() {
  const items = getState().goals || [];
  return {
    title: 'Mục tiêu',
    description: 'Chia mục tiêu lớn thành tiến trình có thể theo dõi.',
    render: () => `
      <div class="module-toolbar">
        <div>
          <h2 class="section-title">Mục tiêu</h2>
          <p class="muted">Theo dõi tiến độ thay vì chỉ ghi nhớ mục tiêu.</p>
        </div>
        <button class="button primary" data-action="goal-add">+ Thêm mục tiêu</button>
      </div>
      <div class="goal-grid">
        ${items.length ? items.map((goal) => `
          <article class="card goal-card">
            <div class="goal-head">
              <strong>${esc(goal.title)}</strong>
              <span>${goal.progress}%</span>
            </div>
            <div class="progress-bar"><i style="width:${Math.min(100, goal.progress)}%"></i></div>
            <div class="goal-actions">
              <button class="button" data-action="goal-minus" data-id="${goal.id}">− 10%</button>
              <button class="button" data-action="goal-plus" data-id="${goal.id}">+ 10%</button>
              <button class="text-button danger-text" data-action="goal-delete" data-id="${goal.id}">Xóa</button>
            </div>
          </article>`).join('') : `
          <div class="empty-state">
            <strong>Chưa có mục tiêu</strong>
            <span>Tạo mục tiêu đầu tiên.</span>
          </div>`}
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
    render: () => `
      <div class="stat-grid">
        <div class="card stat-card"><span>Nhiệm vụ hoàn thành</span><strong>${done}/${taskItems.length}</strong></div>
        <div class="card stat-card"><span>Thói quen đã ghi nhận</span><strong>${habitCount}</strong></div>
        <div class="card stat-card"><span>Mục tiêu</span><strong>${(state.goals || []).length}</strong></div>
        <div class="card stat-card"><span>Focus sessions</span><strong>${state.focusSessions || 0}</strong></div>
      </div>
      <div class="card">
        <h2>Tổng quan</h2>
        <p class="muted">ScholarOS sẽ dần dùng dữ liệu này để tạo phân tích và đề xuất học tập ở các phase sau.</p>
      </div>`
  };
}

export function handleToolAction(action, id, event) {
  const state = getState();

  if (action === 'habit-add') {
    const title = prompt('Tên thói quen:');
    if (!title?.trim()) return;
    setState({
      habits: [...(state.habits || []), { id: uid('habit'), title: title.trim(), completed: [] }]
    });
    return 'refresh';
  }

  if (action === 'habit-toggle') {
    setState({
      habits: (state.habits || []).map((habit) => {
        if (habit.id !== id) return habit;
        const completed = [...(habit.completed || [])];
        const index = completed.indexOf(today());
        if (index >= 0) completed.splice(index, 1);
        else completed.push(today());
        return { ...habit, completed };
      })
    });
    return 'refresh';
  }

  if (action === 'habit-delete') {
    setState({ habits: (state.habits || []).filter((habit) => habit.id !== id) });
    return 'refresh';
  }

  if (action === 'goal-add') {
    const title = prompt('Tên mục tiêu:');
    if (!title?.trim()) return;
    setState({
      goals: [...(state.goals || []), { id: uid('goal'), title: title.trim(), progress: 0 }]
    });
    return 'refresh';
  }

  if (action === 'goal-plus' || action === 'goal-minus') {
    const delta = action === 'goal-plus' ? 10 : -10;
    setState({
      goals: (state.goals || []).map((goal) => goal.id === id
        ? { ...goal, progress: Math.max(0, Math.min(100, goal.progress + delta)) }
        : goal)
    });
    return 'refresh';
  }

  if (action === 'goal-delete') {
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
    render: () => `
      <div class="card">
        <h2>Thời gian biểu</h2>
        <p class="muted">${items.length} phiên học đã lập lịch.</p>
      </div>`
  };
}
