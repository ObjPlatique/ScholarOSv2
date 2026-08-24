import { getState, setState } from '../core/store.js';

const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
const esc = (s='') => String(s).replace(/[&<>'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const today = () => new Date().toISOString().slice(0,10);
const formatDate = (value) => {
  if (!value) return 'Không có hạn';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' });
};
const daysBetween = (a,b) => {
  if (!a || !b) return null;
  const x = new Date(`${a}T00:00:00`), y = new Date(`${b}T00:00:00`);
  return Math.round((y-x)/86400000);
};

export function tasks() {
  const state = getState();
  const items = state.tasks || [];
  const now = today();
  const filter = window.__scholarTaskFilter || 'all';
  const filtered = items.filter(t => {
    const due = t.dueDate || t.due || '';
    if (filter === 'today') return due === now || (t.startDate && t.startDate <= now && due >= now);
    if (filter === 'upcoming') return !t.done && due >= now;
    if (filter === 'overdue') return !t.done && due && due < now;
    if (filter === 'completed') return t.done;
    return true;
  }).sort((a,b) => String(a.dueDate || a.due || '9999').localeCompare(String(b.dueDate || b.due || '9999')));

  return {
    title:'Nhiệm vụ',
    description:'Biến việc cần làm thành danh sách rõ ràng và có deadline rõ ràng.',
    render:()=>`
      <div class="module-toolbar task-toolbar">
        <div><h2 class="section-title">Danh sách nhiệm vụ</h2><p class="muted">Một nhiệm vụ có thể kéo dài nhiều ngày cho tới deadline.</p></div>
        <button class="button primary" data-action="task-add">+ Thêm nhiệm vụ</button>
      </div>
      <div class="task-filters" role="toolbar" aria-label="Lọc nhiệm vụ">
        ${[['all','Tất cả'],['today','Hôm nay'],['upcoming','Sắp tới'],['overdue','Quá hạn'],['completed','Hoàn thành']].map(([key,label])=>`<button class="task-filter ${filter===key?'active':''}" data-action="task-filter" data-filter="${key}">${label}</button>`).join('')}
      </div>
      <div class="task-list">
        ${filtered.length ? filtered.map(t=>{
          const start=t.startDate || '';
          const due=t.dueDate || t.due || '';
          const span=daysBetween(start,due);
          const overdue=!t.done && due && due<now;
          const remaining=due ? daysBetween(now,due) : null;
          const deadlineText=span!==null && span>0 ? `${formatDate(start)} → ${formatDate(due)}` : `Deadline: ${formatDate(due)}`;
          const status=t.done?'✓ Hoàn thành':overdue?`⚠ Quá hạn ${Math.abs(remaining)} ngày`:remaining===0?'⚠ Deadline hôm nay':remaining!==null?`Còn ${remaining} ngày`:'';
          return `<article class="task-card ${t.done?'is-done':''} ${overdue?'is-overdue':''}">
            <button class="check-button" data-action="task-toggle" data-id="${t.id}" aria-label="Hoàn thành">${t.done?'✓':''}</button>
            <div class="task-main"><div class="task-title-row"><strong>${esc(t.title)}</strong><span class="priority priority-${esc(t.priority||'medium')}">${esc(t.priority||'medium')}</span></div>
              ${t.description?`<p>${esc(t.description)}</p>`:''}
              <div class="task-meta"><span>📅 ${deadlineText}</span>${status?`<span class="task-status">${status}</span>`:''}</div>
            </div>
            <button class="icon-button" data-action="task-delete" data-id="${t.id}" aria-label="Xóa">×</button>
          </article>`;
        }).join('') : `<div class="empty-state"><strong>${filter==='overdue'?'Không có nhiệm vụ quá hạn':filter==='completed'?'Chưa có nhiệm vụ hoàn thành':'Chưa có nhiệm vụ'}</strong><span>${filter==='all'?'Thêm nhiệm vụ đầu tiên của bạn.':'Không có nhiệm vụ phù hợp với bộ lọc này.'}</span></div>`}
      </div>`
  };
}

export function schedule() {
  const state=getState(); const items=state.schedule||[]; const days=['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','Chủ nhật'];
  return {title:'Thời gian biểu',description:'Xây dựng lịch học có cấu trúc nhưng vẫn linh hoạt.',render:()=>`<div class="module-toolbar"><div><h2 class="section-title">Lịch tuần</h2><p class="muted">${items.length} phiên học đã lập lịch.</p></div><button class="button primary" data-action="schedule-add">+ Thêm phiên</button></div><div class="schedule-grid">${days.map((d,i)=>`<div class="day-column"><div class="day-head">${d}</div>${items.filter(x=>x.day===i).map(x=>`<div class="schedule-item"><strong>${esc(x.title)}</strong><span>${esc(x.time)} · ${esc(x.duration)} phút</span><button class="text-button" data-action="schedule-delete" data-id="${x.id}">Xóa</button></div>`).join('')||'<div class="day-empty">Trống</div>'}</div>`).join('')}</div>`};
}

export function focus() {
  const state=getState(); const f=state.focus||{minutes:25,running:false,startedAt:null,secondsLeft:1500};
  return {title:'Focus',description:'Tập trung vào một việc trong một khoảng thời gian rõ ràng.',render:()=>`<div class="focus-layout"><section class="card focus-card"><span class="eyebrow">FOCUS SESSION</span><div class="timer" id="focusTimer">${fmt(f.secondsLeft)}</div><div class="timer-status">${f.running?'Đang tập trung':'Sẵn sàng'}</div><div class="focus-controls"><button class="button primary" data-action="focus-toggle">${f.running?'Tạm dừng':'Bắt đầu'}</button><button class="button" data-action="focus-reset">Đặt lại</button></div></section><section class="card"><h2>Phiên hôm nay</h2><p class="muted">${state.focusSessions||0} phiên hoàn thành.</p><hr><div class="focus-presets"><button class="button" data-action="focus-preset" data-min="25">25 phút</button><button class="button" data-action="focus-preset" data-min="50">50 phút</button><button class="button" data-action="focus-preset" data-min="90">90 phút</button></div></section></div>`};
}
function fmt(s){s=Math.max(0,s|0); return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}

export function habits(){const items=getState().habits||[];return {title:'Thói quen',description:'Xây dựng nhịp học đều đặn thay vì chỉ dựa vào động lực.',render:()=>`<div class="module-toolbar"><div><h2 class="section-title">Thói quen</h2><p class="muted">Đánh dấu những việc bạn đã hoàn thành hôm nay.</p></div><button class="button primary" data-action="habit-add">+ Thêm thói quen</button></div><div class="habit-grid">${items.length?items.map(h=>`<article class="card habit-card"><button class="habit-check ${h.completed?.includes(today())?'done':''}" data-action="habit-toggle" data-id="${h.id}">${h.completed?.includes(today())?'✓':'○'}</button><div><strong>${esc(h.title)}</strong><span>${h.completed?.length||0} ngày hoàn thành</span></div><button class="icon-button" data-action="habit-delete" data-id="${h.id}">×</button></article>`).join(''):'<div class="empty-state"><strong>Chưa có thói quen</strong>Thêm một thói quen học tập nhỏ để bắt đầu.</div>`}</div>`};}

export function goals(){const items=getState().goals||[];return {title:'Mục tiêu',description:'Chia mục tiêu lớn thành tiến trình có thể theo dõi.',render:()=>`<div class="module-toolbar"><div><h2 class="section-title">Mục tiêu</h2><p class="muted">Theo dõi tiến độ thay vì chỉ ghi nhớ mục tiêu.</p></div><button class="button primary" data-action="goal-add">+ Thêm mục tiêu</button></div><div class="goal-grid">${items.length?items.map(g=>`<article class="card goal-card"><div class="goal-head"><strong>${esc(g.title)}</strong><span>${g.progress}%</span></div><div class="progress-bar"><i style="width:${Math.min(100,g.progress)}%"></i></div><div class="goal-actions"><button class="button" data-action="goal-minus" data-id="${g.id}">− 10%</button><button class="button" data-action="goal-plus" data-id="${g.id}">+ 10%</button><button class="text-button danger-text" data-action="goal-delete" data-id="${g.id}">Xóa</button></div></article>`).join(''):'<div class="empty-state"><strong>Chưa có mục tiêu</strong>Tạo mục tiêu đầu tiên.</div>`}</div>`};}

export function progress(){const s=getState();const tasks=(s.tasks||[]);const done=tasks.filter(x=>x.done).length;const habits=(s.habits||[]).reduce((a,h)=>a+(h.completed?.length||0),0);return {title:'Tiến độ',description:'Một bảng tổng hợp ngắn gọn về hệ thống học tập của bạn.',render:()=>`<div class="stat-grid"><div class="card stat-card"><span>Nhiệm vụ hoàn thành</span><strong>${done}/${tasks.length}</strong></div><div class="card stat-card"><span>Thói quen đã ghi nhận</span><strong>${habits}</strong></div><div class="card stat-card"><span>Mục tiêu</span><strong>${(s.goals||[]).length}</strong></div><div class="card stat-card"><span>Focus sessions</span><strong>${s.focusSessions||0}</strong></div></div><div class="card"><h2>Tổng quan</h2><p class="muted">ScholarOS sẽ dần dùng dữ liệu này để tạo phân tích và đề xuất học tập ở các phase sau.</p></div>`};}

function openTaskModal() {
  const root=document.getElementById('appView');
  if(!root || root.querySelector('.task-modal-backdrop')) return;
  root.insertAdjacentHTML('beforeend', `<div class="task-modal-backdrop" data-action="task-close-modal"><section class="task-modal" role="dialog" aria-modal="true" aria-labelledby="taskModalTitle" data-stop-click="true">
    <form data-action="task-create" class="task-form">
      <header class="task-modal-header"><div><span class="eyebrow">NEW TASK</span><h2 id="taskModalTitle">Thêm nhiệm vụ</h2><p>Đặt khoảng thời gian và deadline cho một nhiệm vụ.</p></div><button type="button" class="icon-button" data-action="task-close-modal" aria-label="Đóng">×</button></header>
      <div class="task-form-grid">
        <label class="task-field task-field-full"><span>Tên nhiệm vụ</span><input name="title" required maxlength="120" placeholder="Ví dụ: Hoàn thành bài tập Toán chương 3" autofocus></label>
        <label class="task-field task-field-full"><span>Mô tả <small>(không bắt buộc)</small></span><textarea name="description" rows="3" maxlength="500" placeholder="Ghi chú ngắn về việc cần hoàn thành..."></textarea></label>
        <label class="task-field"><span>Ngày bắt đầu</span><input type="date" name="startDate" value="${today()}"></label>
        <label class="task-field"><span>Deadline</span><input type="date" name="dueDate" value="${today()}" required></label>
        <label class="task-field task-field-full"><span>Độ ưu tiên</span><select name="priority"><option value="low">Thấp</option><option value="medium" selected>Trung bình</option><option value="high">Cao</option></select></label>
      </div>
      <div class="task-modal-footer"><button type="button" class="button" data-action="task-close-modal">Hủy</button><button type="submit" class="button primary">Thêm nhiệm vụ</button></div>
    </form>
  </section></div>`);
}
function closeTaskModal(){document.querySelector('.task-modal-backdrop')?.remove();}

export function handleToolAction(action, id, event) {
  const s=getState();
  if(action==='task-add'){openTaskModal();return;}
  if(action==='task-close-modal'){if(event.target.closest('.task-modal-backdrop')===event.target || event.target.closest('button[data-action="task-close-modal"]')) closeTaskModal();return;}
  if(action==='task-filter'){window.__scholarTaskFilter=event.currentTarget.dataset.filter||'all';return 'refresh';}
  if(action==='task-create'){
    const form=event.currentTarget; const data=new FormData(form); const title=String(data.get('title')||'').trim(); const startDate=String(data.get('startDate')||''); const dueDate=String(data.get('dueDate')||'');
    if(!title){form.querySelector('[name="title"]')?.focus();return;}
    if(startDate && dueDate && dueDate<startDate){alert('Deadline không thể sớm hơn ngày bắt đầu.');return;}
    setState({tasks:[...(s.tasks||[]),{id:uid('task'),title,description:String(data.get('description')||'').trim(),priority:String(data.get('priority')||'medium'),startDate:startDate||dueDate,dueDate:dueDate||startDate||today(),done:false}]});
    closeTaskModal(); return 'refresh';
  }
  if(action==='task-toggle'){setState({tasks:(s.tasks||[]).map(x=>x.id===id?{...x,done:!x.done}:x)});return 'refresh';}
  if(action==='task-delete'){setState({tasks:(s.tasks||[]).filter(x=>x.id!==id)});return 'refresh';}
  if(action==='schedule-add'){const title=prompt('Tên phiên học:');if(!title?.trim())return;const day=Math.max(0,Math.min(6,Number(prompt('Ngày (0=Thứ 2 ... 6=Chủ nhật):','0'))||0));const time=prompt('Giờ bắt đầu:','19:00')||'19:00';const duration=Number(prompt('Số phút:','50'))||50;setState({schedule:[...(s.schedule||[]),{id:uid('slot'),title:title.trim(),day,time,duration}]});return 'refresh';}
  if(action==='schedule-delete'){setState({schedule:(s.schedule||[]).filter(x=>x.id!==id)});return 'refresh';}
  if(action==='habit-add'){const title=prompt('Tên thói quen:');if(!title?.trim())return;setState({habits:[...(s.habits||[]),{id:uid('habit'),title:title.trim(),completed:[]}]});return 'refresh';}
  if(action==='habit-toggle'){setState({habits:(s.habits||[]).map(h=>{if(h.id!==id)return h;const c=[...(h.completed||[])];const i=c.indexOf(today());i>=0?c.splice(i,1):c.push(today());return {...h,completed:c}})});return 'refresh';}
  if(action==='habit-delete'){setState({habits:(s.habits||[]).filter(x=>x.id!==id)});return 'refresh';}
  if(action==='goal-add'){const title=prompt('Tên mục tiêu:');if(!title?.trim())return;setState({goals:[...(s.goals||[]),{id:uid('goal'),title:title.trim(),progress:0}]});return 'refresh';}
  if(action==='goal-plus'||action==='goal-minus'){const delta=action==='goal-plus'?10:-10;setState({goals:(s.goals||[]).map(g=>g.id===id?{...g,progress:Math.max(0,Math.min(100,g.progress+delta))}:g)});return 'refresh';}
  if(action==='goal-delete'){setState({goals:(s.goals||[]).filter(x=>x.id!==id)});return 'refresh';}
  if(action==='focus-preset'){const min=Number(event.currentTarget.dataset.min)||25;setState({focus:{minutes:min,running:false,startedAt:null,secondsLeft:min*60}});return 'refresh';}
  if(action==='focus-toggle'){const f=s.focus||{minutes:25,running:false,secondsLeft:1500};if(f.running){setState({focus:{...f,running:false}})}else{setState({focus:{...f,running:true,startedAt:Date.now()}})}return 'refresh';}
  if(action==='focus-reset'){const f=s.focus||{minutes:25};setState({focus:{minutes:f.minutes,running:false,startedAt:null,secondsLeft:f.minutes*60}});return 'refresh';}
  return null;
}