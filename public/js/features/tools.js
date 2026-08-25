import { getState, setState } from '../core/store.js';

const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
const esc = (s='') => String(s).replace(/[&<>'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const today = () => new Date().toISOString().slice(0,10);

export function tasks() {
  const state = getState();
  const items = state.tasks || [];
  return { title:'Nhiệm vụ', description:'Biến việc cần làm thành danh sách rõ ràng và có ưu tiên.', render:()=>`
    <div class="module-toolbar"><div><h2 class="section-title">Danh sách nhiệm vụ</h2><p class="muted">Ưu tiên việc quan trọng trước.</p></div><button class="button primary" data-action="task-add">+ Thêm nhiệm vụ</button></div>
    <div class="task-list">${items.length ? items.map(t=>`<article class="list-row ${t.done?'is-done':''}"><button class="check-button" data-action="task-toggle" data-id="${t.id}" aria-label="Hoàn thành">${t.done?'✓':''}</button><div class="list-main"><strong>${esc(t.title)}</strong><span>${esc(t.due || 'Không có hạn')} · <span class="priority priority-${t.priority}">${t.priority}</span></span></div><button class="icon-button" data-action="task-delete" data-id="${t.id}" aria-label="Xóa">×</button></article>`).join('') : `<div class="empty-state"><strong>Chưa có nhiệm vụ</strong>Thêm nhiệm vụ đầu tiên của bạn.</div>`}</div>` };
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

export function habits(){const items=getState().habits||[];return {title:'Thói quen',description:'Xây dựng nhịp học đều đặn thay vì chỉ dựa vào động lực.',render:()=>`<div class="module-toolbar"><div><h2 class="section-title">Thói quen</h2><p class="muted">Đánh dấu những việc bạn đã hoàn thành hôm nay.</p></div><button class="button primary" data-action="habit-add">+ Thêm thói quen</button></div><div class="habit-grid">${items.length?items.map(h=>`<article class="card habit-card"><button class="habit-check ${h.completed?.includes(today())?'done':''}" data-action="habit-toggle" data-id="${h.id}">${h.completed?.includes(today())?'✓':'○'}</button><div><strong>${esc(h.title)}</strong><span>${h.completed?.length||0} ngày hoàn thành</span></div><button class="icon-button" data-action="habit-delete" data-id="${h.id}">×</button></article>`).join(''):'<div class="empty-state"><strong>Chưa có thói quen</strong>Thêm một thói quen học tập nhỏ để bắt đầu.</div>'}</div>`};}

export function goals(){const items=getState().goals||[];return {title:'Mục tiêu',description:'Chia mục tiêu lớn thành tiến trình có thể theo dõi.',render:()=>`<div class="module-toolbar"><div><h2 class="section-title">Mục tiêu</h2><p class="muted">Theo dõi tiến độ thay vì chỉ ghi nhớ mục tiêu.</p></div><button class="button primary" data-action="goal-add">+ Thêm mục tiêu</button></div><div class="goal-grid">${items.length?items.map(g=>`<article class="card goal-card"><div class="goal-head"><strong>${esc(g.title)}</strong><span>${g.progress}%</span></div><div class="progress-bar"><i style="width:${Math.min(100,g.progress)}%"></i></div><div class="goal-actions"><button class="button" data-action="goal-minus" data-id="${g.id}">− 10%</button><button class="button" data-action="goal-plus" data-id="${g.id}">+ 10%</button><button class="text-button danger-text" data-action="goal-delete" data-id="${g.id}">Xóa</button></div></article>`).join(''):'<div class="empty-state"><strong>Chưa có mục tiêu</strong>Tạo mục tiêu đầu tiên.</div>`}</div>`};}

export function progress(){const s=getState();const tasks=(s.tasks||[]);const done=tasks.filter(x=>x.done).length;const habits=(s.habits||[]).reduce((a,h)=>a+(h.completed?.length||0),0);return {title:'Tiến độ',description:'Một bảng tổng hợp ngắn gọn về hệ thống học tập của bạn.',render:()=>`<div class="stat-grid"><div class="card stat-card"><span>Nhiệm vụ hoàn thành</span><strong>${done}/${tasks.length}</strong></div><div class="card stat-card"><span>Thói quen đã ghi nhận</span><strong>${habits}</strong></div><div class="card stat-card"><span>Mục tiêu</span><strong>${(s.goals||[]).length}</strong></div><div class="card stat-card"><span>Focus sessions</span><strong>${s.focusSessions||0}</strong></div></div><div class="card"><h2>Tổng quan</h2><p class="muted">ScholarOS sẽ dần dùng dữ liệu này để tạo phân tích và đề xuất học tập ở các phase sau.</p></div>`};}

export function handleToolAction(action, id, event) {
  const s=getState();
  if(action==='task-add'){const title=prompt('Tên nhiệm vụ:');if(!title?.trim())return;const priority=prompt('Độ ưu tiên (low / medium / high):','medium')||'medium';setState({tasks:[...(s.tasks||[]),{id:uid('task'),title:title.trim(),priority,due:today(),done:false}]});return 'refresh';}
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
