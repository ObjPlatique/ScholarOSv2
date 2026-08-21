import { getState, setState } from '../core/store.js';

const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
const esc = (s='') => String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const today = () => new Date().toISOString().slice(0,10);

function resourceState() {
  const s = getState();
  return {
    notes: s.notes || [],
    subjects: s.subjects || [],
    materials: s.materials || [],
    colleges: s.colleges || []
  };
}

export function notes() {
  const { notes } = resourceState();
  return {
    title: 'Ghi chú',
    description: 'Lưu kiến thức, ý tưởng và những điều cần nhớ.',
    render: () => `
      <div class="module-toolbar">
        <div><h2 class="section-title">Kho ghi chú</h2><p class="muted">${notes.length} ghi chú được lưu trên thiết bị.</p></div>
        <button class="button primary" data-action="note-add">+ Ghi chú mới</button>
      </div>
      <div class="resource-grid">
        ${notes.length ? notes.map(n => `
          <article class="card resource-card">
            <div class="resource-meta"><span class="tag">${esc(n.subject || 'Chung')}</span><span>${esc(n.updatedAt || today())}</span></div>
            <h3>${esc(n.title)}</h3>
            <p>${esc(n.content)}</p>
            <div class="resource-actions"><button class="text-button" data-action="note-edit" data-id="${n.id}">Sửa</button><button class="text-button danger-text" data-action="note-delete" data-id="${n.id}">Xóa</button></div>
          </article>`).join('') : `<div class="empty-state"><strong>Kho ghi chú đang trống</strong>Tạo ghi chú đầu tiên để lưu kiến thức quan trọng.</div>`}
      </div>`
  };
}

export function academic() {
  const { subjects, materials } = resourceState();
  return {
    title: 'Học tập',
    description: 'Quản lý môn học và tài liệu theo một cấu trúc thống nhất.',
    render: () => `
      <div class="module-toolbar">
        <div><h2 class="section-title">Academic Hub</h2><p class="muted">${subjects.length} môn học · ${materials.length} tài liệu.</p></div>
        <div class="toolbar-actions"><button class="button" data-action="subject-add">+ Môn học</button><button class="button primary" data-action="material-add">+ Tài liệu</button></div>
      </div>
      <div class="resource-columns">
        <section class="card"><div class="card-heading"><div><h2>Môn học</h2><p class="muted">Những môn đang theo dõi.</p></div></div>
          <div class="compact-list">${subjects.length ? subjects.map(s => `<div class="compact-row"><span class="subject-dot"></span><div><strong>${esc(s.name)}</strong><span>${esc(s.code || 'Không có mã')}</span></div><button class="icon-button" data-action="subject-delete" data-id="${s.id}" aria-label="Xóa">×</button></div>`).join('') : '<div class="empty-state"><strong>Chưa có môn học</strong>Thêm môn học để bắt đầu tổ chức tài liệu.</div>'}</div>
        </section>
        <section class="card"><div class="card-heading"><div><h2>Tài liệu</h2><p class="muted">Tài liệu được phân loại theo môn.</p></div></div>
          <div class="compact-list">${materials.length ? materials.map(m => `<div class="compact-row"><span class="resource-icon">▤</span><div><strong>${esc(m.title)}</strong><span>${esc(m.subject || 'Chung')} · ${esc(m.type || 'Khác')}</span></div><button class="icon-button" data-action="material-delete" data-id="${m.id}" aria-label="Xóa">×</button></div>`).join('') : '<div class="empty-state"><strong>Chưa có tài liệu</strong>Thêm link, sách hoặc tài liệu học tập.</div>'}</div>
        </section>
      </div>`
  };
}

export function college() {
  const { colleges } = resourceState();
  return {
    title: 'Đại học',
    description: 'Theo dõi trường mục tiêu, ngành học và các mốc quan trọng.',
    render: () => `
      <div class="module-toolbar">
        <div><h2 class="section-title">College Tracker</h2><p class="muted">${colleges.length} trường đang được theo dõi.</p></div>
        <button class="button primary" data-action="college-add">+ Thêm trường</button>
      </div>
      <div class="college-grid">
        ${colleges.length ? colleges.map(c => `<article class="card college-card"><div class="resource-meta"><span class="tag">${esc(c.status || 'Đang tìm hiểu')}</span></div><h3>${esc(c.name)}</h3><p>${esc(c.major || 'Chưa chọn ngành')}</p><div class="college-meta"><span>Hạn: ${esc(c.deadline || 'Chưa đặt')}</span><button class="text-button danger-text" data-action="college-delete" data-id="${c.id}">Xóa</button></div></article>`).join('') : `<div class="empty-state"><strong>Chưa có trường mục tiêu</strong>Thêm trường và ngành bạn đang cân nhắc.</div>`}
      </div>`
  };
}

export function handleResourceAction(action, id) {
  const s = getState();
  if (action === 'note-add') {
    const title = prompt('Tiêu đề ghi chú:'); if (!title?.trim()) return;
    const content = prompt('Nội dung ngắn:') || '';
    const subject = prompt('Môn/chủ đề:','Chung') || 'Chung';
    setState({ notes: [...(s.notes || []), { id: uid('note'), title: title.trim(), content: content.trim(), subject: subject.trim(), updatedAt: today() }] }); return 'refresh';
  }
  if (action === 'note-edit') {
    const n = (s.notes || []).find(x => x.id === id); if (!n) return;
    const title = prompt('Tiêu đề:', n.title); if (!title?.trim()) return;
    const content = prompt('Nội dung:', n.content) ?? n.content;
    setState({ notes: (s.notes || []).map(x => x.id === id ? { ...x, title: title.trim(), content: content.trim(), updatedAt: today() } : x) }); return 'refresh';
  }
  if (action === 'note-delete') { setState({ notes: (s.notes || []).filter(x => x.id !== id) }); return 'refresh'; }
  if (action === 'subject-add') {
    const name = prompt('Tên môn học:'); if (!name?.trim()) return;
    const code = prompt('Mã môn (tuỳ chọn):','') || '';
    setState({ subjects: [...(s.subjects || []), { id: uid('subject'), name: name.trim(), code: code.trim() }] }); return 'refresh';
  }
  if (action === 'subject-delete') { setState({ subjects: (s.subjects || []).filter(x => x.id !== id) }); return 'refresh'; }
  if (action === 'material-add') {
    const title = prompt('Tên tài liệu:'); if (!title?.trim()) return;
    const subject = prompt('Môn/chủ đề:','Chung') || 'Chung';
    const type = prompt('Loại tài liệu (PDF, Link, Book...):','Link') || 'Khác';
    const url = prompt('URL (tuỳ chọn):','') || '';
    setState({ materials: [...(s.materials || []), { id: uid('material'), title: title.trim(), subject: subject.trim(), type: type.trim(), url: url.trim() }] }); return 'refresh';
  }
  if (action === 'material-delete') { setState({ materials: (s.materials || []).filter(x => x.id !== id) }); return 'refresh'; }
  if (action === 'college-add') {
    const name = prompt('Tên trường:'); if (!name?.trim()) return;
    const major = prompt('Ngành học:','Khoa học Máy tính') || '';
    const deadline = prompt('Hạn quan trọng (YYYY-MM-DD):','') || '';
    setState({ colleges: [...(s.colleges || []), { id: uid('college'), name: name.trim(), major: major.trim(), deadline: deadline.trim(), status: 'Đang tìm hiểu' }] }); return 'refresh';
  }
  if (action === 'college-delete') { setState({ colleges: (s.colleges || []).filter(x => x.id !== id) }); return 'refresh'; }
}
