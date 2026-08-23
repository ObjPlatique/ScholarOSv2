import { getState, setState } from '../core/store.js';

const uid = () => `slot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const esc = (value = '') => String(value).replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
const pad = n => String(n).padStart(2, '0');
const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseDate = value => { const d = new Date(`${value}T00:00:00`); return Number.isNaN(d.getTime()) ? new Date() : d; };
const startOfWeek = value => { const d = new Date(value); const day = d.getDay() || 7; d.setDate(d.getDate() - day + 1); d.setHours(0,0,0,0); return d; };
const addDays = (value, days) => { const d = new Date(value); d.setDate(d.getDate() + days); return d; };
const minutes = time => { const [h,m] = String(time || '00:00').split(':').map(Number); return (h * 60) + m; };
const monthLabel = date => new Intl.DateTimeFormat('vi-VN', { month:'long', year:'numeric' }).format(date);

function normalizeState() {
  const state = getState();
  if (state.calendars?.length) return state;
  const legacy = Array.isArray(state.schedule) ? state.schedule : [];
  const calendar = { id:'calendar-default', name:'Lịch học', color:'var(--primary)', events:legacy.map(item => ({
    id:item.id || uid(), title:item.title || 'Phiên học', date:item.date || isoDate(addDays(startOfWeek(new Date()), Number(item.day) || 0)),
    start:item.time || '19:00', duration:Number(item.duration) || 50, type:item.type || 'study', notes:item.notes || '', focusLinked:Boolean(item.focusLinked)
  })) };
  setState({ calendars:[calendar], activeCalendarId:calendar.id, schedule:calendar.events });
  return getState();
}

function visibleCalendars(state) { return state.calendars?.length ? state.calendars : normalizeState().calendars; }
function activeCalendar(state) { const calendars=visibleCalendars(state); return calendars.find(c=>c.id===state.activeCalendarId) || calendars[0]; }
function syncCalendar(calendar, calendars) { return calendars.map(c=>c.id===calendar.id ? calendar : c); }
function calendarRange(date) { const start=startOfWeek(date); return Array.from({length:7}, (_,i)=>addDays(start,i)); }
function timeLabel(hour) { return `${pad(hour)}:00`; }

export function schedule() {
  const state = normalizeState();
  const calendar = activeCalendar(state);
  const selectedDate = state.scheduleViewDate || isoDate(new Date());
  return { title:'Thời gian biểu', description:'Quản lý nhiều lịch học trong một giao diện trực quan.', render:() => renderSchedule(getState(), calendar, parseDate(selectedDate)) };
}

function renderSchedule(state, calendar, selectedDate) {
  const days=calendarRange(selectedDate), events=calendar.events||[];
  return `<div class="schedule-module">
    <div class="schedule-tabs" role="tablist" aria-label="Các lịch">${visibleCalendars(state).map(c=>`<button class="schedule-tab ${c.id===calendar.id?'active':''}" data-action="schedule-calendar-switch" data-id="${esc(c.id)}">${esc(c.name)}</button>`).join('')}<button class="schedule-tab-add" data-action="schedule-calendar-add" aria-label="Tạo lịch mới">+</button></div>
    <div class="schedule-module-toolbar"><div><h2 class="section-title">${esc(calendar.name)}</h2><p class="muted">${events.length} phiên · Tuần ${days[0].toLocaleDateString('vi-VN',{day:'numeric',month:'numeric'})} – ${days[6].toLocaleDateString('vi-VN',{day:'numeric',month:'numeric'})}</p></div><div class="schedule-toolbar-actions"><div class="schedule-side-tools"><button class="button" data-action="schedule-calendar-rename">Đổi tên</button><button class="button" data-action="schedule-calendar-delete">Xóa lịch</button></div><button class="button primary" data-action="schedule-add">+ Thêm phiên</button></div></div>
    <div class="schedule-calendar-card"><div class="schedule-calendar-toolbar"><div class="schedule-calendar-nav"><button class="button" data-action="schedule-prev">←</button><button class="button" data-action="schedule-today">Hôm nay</button><button class="button" data-action="schedule-next">→</button></div><strong>${monthLabel(days[3])}</strong><span class="schedule-view-label">Tuần</span></div>
      <div class="schedule-week-head"><div class="schedule-time-spacer"></div>${days.map(d=>`<div class="schedule-day-head ${isoDate(d)===isoDate(new Date())?'today':''}"><span>${d.toLocaleDateString('vi-VN',{weekday:'short'})}</span><strong>${d.getDate()}</strong></div>`).join('')}</div>
      <div class="schedule-week-body"><div class="schedule-time-column">${Array.from({length:15},(_,i)=>`<div class="schedule-time">${timeLabel(i+7)}</div>`).join('')}</div><div class="schedule-day-columns">${days.map(day=>renderDay(day,events)).join('')}</div></div>
    </div><div class="schedule-hint"><span>💡</span><span>Chọn <b>+ Thêm phiên</b> để mở popup đầy đủ. Mỗi lịch có dữ liệu riêng; đổi tab sẽ chuyển sang lịch tương ứng.</span></div>
  </div>`;
}

function renderDay(day, events) {
  const date=isoDate(day);
  return `<div class="schedule-day-column">${Array.from({length:15},()=>'<div class="schedule-hour-line"></div>').join('')}${events.filter(e=>e.date===date).map(e=>{const top=Math.max(0,minutes(e.start)-420);const height=Math.max(42,Number(e.duration||50)*64/60-4);return `<button class="schedule-event schedule-event-${esc(e.type||'study')}" style="top:${top+3}px;height:${height}px" data-action="schedule-edit" data-id="${esc(e.id)}"><strong>${esc(e.title)}</strong><span>${esc(e.start)} · ${Number(e.duration||50)} phút</span>${e.focusLinked?'<span class="schedule-event-focus">◷ Focus</span>':''}</button>`;}).join('')}</div>`;
}

function modal(mode, event={}) {
  const state=getState(), calendars=visibleCalendars(state), active=activeCalendar(state);
  const value={title:event.title||'',date:event.date||isoDate(new Date()),start:event.start||'19:00',duration:event.duration||50,type:event.type||'study',calendarId:event.calendarId||active.id,focusLinked:Boolean(event.focusLinked),notes:event.notes||''};
  return `<div class="schedule-modal-backdrop" data-schedule-modal><div class="schedule-modal" role="dialog" aria-modal="true" aria-labelledby="scheduleModalTitle"><div class="schedule-modal-head"><div><p class="eyebrow">TIME SCHEDULE</p><h2 id="scheduleModalTitle">${mode==='edit'?'Chỉnh sửa phiên':'Thêm phiên học'}</h2></div><button class="icon-button" data-action="schedule-modal-close" aria-label="Đóng">×</button></div><form class="schedule-form" data-action="schedule-save" data-id="${esc(event.id||'')}"><label>Tên phiên<input name="title" required maxlength="100" value="${esc(value.title)}" placeholder="Ví dụ: Toán — Hàm số"></label><div class="schedule-form-grid"><label>Ngày<input name="date" type="date" required value="${value.date}"></label><label>Giờ bắt đầu<input name="start" type="time" required value="${value.start}"></label></div><div class="schedule-form-grid"><label>Thời lượng<select name="duration"><option value="25" ${value.duration==25?'selected':''}>25 phút</option><option value="50" ${value.duration==50?'selected':''}>50 phút</option><option value="90" ${value.duration==90?'selected':''}>90 phút</option><option value="120" ${value.duration==120?'selected':''}>120 phút</option></select></label><label>Loại phiên<select name="type"><option value="study" ${value.type==='study'?'selected':''}>Học tập</option><option value="review" ${value.type==='review'?'selected':''}>Ôn tập</option><option value="test" ${value.type==='test'?'selected':''}>Kiểm tra</option><option value="personal" ${value.type==='personal'?'selected':''}>Cá nhân</option></select></label></div><label>Lịch<select name="calendarId">${calendars.map(c=>`<option value="${esc(c.id)}" ${c.id===value.calendarId?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><label class="schedule-checkbox"><input type="checkbox" name="focusLinked" ${value.focusLinked?'checked':''}> Liên kết với Focus</label><label>Ghi chú<textarea name="notes" rows="3" maxlength="500" placeholder="Ghi chú cho phiên học...">${esc(value.notes)}</textarea></label></form><div class="schedule-modal-actions"><button class="button" data-action="schedule-modal-close">Hủy</button><button class="button primary" data-action="schedule-save-submit" data-id="${esc(event.id||'')}">${mode==='edit'?'Lưu thay đổi':'Thêm phiên'}</button>${mode==='edit'?`<button class="button danger-outline" data-action="schedule-delete" data-id="${esc(event.id)}">Xóa phiên</button>`:''}</div></div></div>`;
}

export function handleScheduleAction(action, id) {
  const state=normalizeState(); let calendars=visibleCalendars(state), active=activeCalendar(state);
  if(action==='schedule-add'){openModal(modal('add'));return 'handled';}
  if(action==='schedule-edit'){const item=active.events.find(e=>e.id===id);if(item)openModal(modal('edit',{...item,calendarId:active.id}));return 'handled';}
  if(action==='schedule-modal-close'){closeModal();return 'handled';}
  if(action==='schedule-save-submit'){const form=document.querySelector('.schedule-form');if(!form||!form.reportValidity())return 'handled';saveForm(form,id);return 'refresh';}
  if(action==='schedule-delete'){if(!confirm(id?'Xóa phiên này?':'Xóa lịch này?'))return 'handled';if(id){const owner=calendars.find(c=>c.events.some(e=>e.id===id));if(owner){owner.events=owner.events.filter(e=>e.id!==id);calendars=syncCalendar(owner,calendars);setState({calendars,activeCalendarId:owner.id,schedule:owner.events});}}else if(calendars.length>1){calendars=calendars.filter(c=>c.id!==active.id);setState({calendars,activeCalendarId:calendars[0].id,schedule:calendars[0].events});}closeModal();return 'refresh';}
  if(action==='schedule-calendar-switch'){const next=calendars.find(c=>c.id===id);if(next)setState({activeCalendarId:id,schedule:next.events});return 'refresh';}
  if(action==='schedule-calendar-add'){const name=prompt('Tên lịch mới:','Lịch mới');if(!name?.trim())return 'handled';const calendar={id:`calendar-${Date.now()}`,name:name.trim(),color:'var(--primary)',events:[]};calendars.push(calendar);setState({calendars,activeCalendarId:calendar.id,schedule:[]});return 'refresh';}
  if(action==='schedule-calendar-rename'){const name=prompt('Tên lịch:',active.name);if(!name?.trim())return 'handled';active.name=name.trim();calendars=syncCalendar(active,calendars);setState({calendars,schedule:active.events});return 'refresh';}
  if(action==='schedule-prev'||action==='schedule-next'||action==='schedule-today'){const current=parseDate(state.scheduleViewDate||isoDate(new Date()));const next=action==='schedule-prev'?addDays(current,-7):action==='schedule-next'?addDays(current,7):new Date();setState({scheduleViewDate:isoDate(next)});return 'refresh';}
  return null;
}

function saveForm(form,id){const data=new FormData(form),item={id:id||uid(),title:String(data.get('title')).trim(),date:String(data.get('date')),start:String(data.get('start')),duration:Number(data.get('duration'))||50,type:String(data.get('type')),focusLinked:data.get('focusLinked')==='on',notes:String(data.get('notes')||'')};let state=normalizeState(),calendars=visibleCalendars(state),target=calendars.find(c=>c.id===String(data.get('calendarId')))||activeCalendar(state);if(id){const old=calendars.find(c=>c.events.some(e=>e.id===id));if(old)old.events=old.events.filter(e=>e.id!==id);}target.events=[...(target.events||[]),item];setState({calendars,activeCalendarId:target.id,schedule:target.events});closeModal();}
function openModal(html){closeModal();document.body.insertAdjacentHTML('beforeend',html);}
function closeModal(){document.querySelector('[data-schedule-modal]')?.remove();}
