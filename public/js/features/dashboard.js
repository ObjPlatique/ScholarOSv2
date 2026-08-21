import { getState } from '../core/store.js';

export const dashboard = {
  title: 'Dashboard',
  description: 'Tập trung vào việc học quan trọng nhất hôm nay.',
  render() {
    const state = getState();
    return `
      <div class="stat-grid">
        <article class="card stat-card"><span>Nhiệm vụ hôm nay</span><strong>${state.tasks.length}</strong><span>đang chờ xử lý</span></article>
        <article class="card stat-card"><span>Thói quen</span><strong>${state.habits.length}</strong><span>thói quen đang theo dõi</span></article>
        <article class="card stat-card"><span>Mục tiêu</span><strong>${state.goals.length}</strong><span>mục tiêu cá nhân</span></article>
        <article class="card stat-card"><span>Streak</span><strong>${state.streak}</strong><span>ngày liên tiếp</span></article>
      </div>
      <div class="card-grid">
        <article class="card feature-card"><div><div class="feature-icon">✦</div><h3>Scholar AI</h3><p>Hỏi bài, giải thích khái niệm và hỗ trợ lập kế hoạch học tập.</p></div><button data-route="ai-chat">Mở Scholar AI →</button></article>
        <article class="card feature-card"><div><div class="feature-icon">▦</div><h3>Thời gian biểu</h3><p>Quản lý lịch học, thời gian cố định và các phiên tập trung.</p></div><button data-route="schedule">Mở thời gian biểu →</button></article>
        <article class="card feature-card"><div><div class="feature-icon">✓</div><h3>Nhiệm vụ</h3><p>Biến mục tiêu lớn thành những việc nhỏ có thể hoàn thành.</p></div><button data-route="tasks">Mở nhiệm vụ →</button></article>
      </div>
      <div class="quick-grid">
        <article class="card"><h2 class="section-title">Hôm nay</h2><div class="empty-state"><strong>Chưa có dữ liệu học tập</strong>Hãy thêm nhiệm vụ hoặc lịch học để Dashboard trở nên hữu ích hơn.</div></article>
        <article class="card"><h2 class="section-title">Nguyên tắc ScholarOS</h2><p>Ưu tiên việc quan trọng, học theo phiên tập trung, nghỉ đủ và duy trì tiến bộ ổn định.</p></article>
      </div>`;
  }
};
