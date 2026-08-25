import { getState, setState } from '../core/store.js';

const esc = (value = '') => String(value).replace(/[&<>'\"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
const pad = n => String(n).padStart(2, '0');
const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const dayNames = ['Chủ nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'];
const dayIndex = { 'Chủ nhật':0,'CN':0,'Thứ 2':1,'Thứ 3':2,'Thứ 4':3,'Thứ 5':4,'Thứ 6':5,'Thứ 7':6 };
const colors = ['#2563eb','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899'];

function isoDate(date) { return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`; }
function mondayOfWeek(date = new Date()) { const d = new Date(date); const day = d.getDay() || 7; d.setDate(d.getDate() - day + 1); d.setHours(0,0,0,0); return d; }
function dateForDay(day) { const monday = mondayOfWeek(); const index = dayIndex[String(day || '').trim()] ?? 1; const d = new Date(monday); d.setDate(monday.getDate() + (index === 0 ? 6 : index - 1)); return isoDate(d); }
function duration(start, end) { const [sh,sm] = String(start || '19:00').split(':').map(Number); const [eh,em] = String(end || '19:50').split(':').map(Number); let value = (eh*60+em) - (sh*60+sm); if (value <= 0) value = 50; return Math.min(240, Math.max(25, value)); }
function normalizeCalendars(state) {
  if (Array.isArray(state.calendars) && state.calendars.length) return state.calendars.map(c => ({ ...c, events: Array.isArray(c.events) ? c.events : [] }));
  const events = Array.isArray(state.schedule) ? state.schedule : [];
  return [{ id:'calendar-default', name:'Lịch học', color:'var(--primary)', events }];
}
function plannerEvents(blocks) {
  return blocks.map((block, index) => ({
    id: uid(`ai-plan-${index}`),
    title: String(block.title || 'Block học AI'),
    date: dateForDay(block.day),
    start: String(block.start || '19:00'),
    duration: duration(block.start, block.end),
    type: block.type || 'study',
    recurrence: 'once',
    color: block.color || colors[index % colors.length],
    notes: block.reason || 'Được tạo bởi AI Planner.',
    focusLinked: false
  }));
}
function savePlan(blocks) {
  const state = getState();
  const calendars = normalizeCalendars(state);
  const calendar = { id: uid('calendar-ai'), name:`AI Planner · ${new Date().toLocaleDateString('vi-VN')}`, color:'var(--primary)', events:plannerEvents(blocks) };
  calendars.push(calendar);
  setState({ calendars, activeCalendarId:calendar.id, schedule:calendar.events });
  return calendar;
}
function grid(blocks) {
  const grouped = new Map(dayNames.map(day => [day, []]));
  blocks.forEach(block => { const day = String(block.day || 'Thứ 2'); const key = dayNames.includes(day) ? day : 'Thứ 2'; grouped.get(key).push(block); });
  return `<div class="planner-timetable" aria-label="Thời gian biểu do AI lập">${dayNames.slice(1).map(day => `<section class="planner-day"><header><span>${esc(day)}</span><strong>${grouped.get(day).length}</strong></header><div class="planner-day-body">${grouped.get(day).length ? grouped.get(day).map(block => `<article class="planner-slot"><div class="planner-slot-time">${esc(block.start || '')}–${esc(block.end || '')}</div><div class="planner-slot-main"><strong>${esc(block.title || 'Block học')}</strong><span>${esc(block.reason || '')}</span></div></article>`).join('') : '<div class="planner-day-empty">Trống</div>'}</div></section>`).join('')}</div>`;
}
function resultHTML(data, calendar) {
  const blocks = Array.isArray(data.blocks) ? data.blocks : [];
  return `<div class="planner-result planner-result-enhanced">
    <div class="planner-result-head"><div><span class="tag">AI Planner</span><h3>${esc(data.summary || 'Kế hoạch học tập')}</h3><p class="muted">Đã tạo <strong>${blocks.length}</strong> block học và lưu vào một lịch mới trong Thời gian biểu.</p></div><div class="planner-saved-badge">✓ Đã thêm vào lịch</div></div>
    ${data.warnings?.length ? `<div class="warning-box"><strong>Lưu ý</strong>${data.warnings.map(x=>`<div>• ${esc(x)}</div>`).join('')}</div>` : ''}
    ${blocks.length ? grid(blocks) : '<div class="empty-state"><strong>Không có block học</strong>Hãy bổ sung deadline hoặc mục tiêu để Planner có thêm dữ liệu.</div>'}
    ${blocks.length ? `<div class="planner-result-footer"><span>📅 Lịch mới: <strong>${esc(calendar.name)}</strong></span><a href="#schedule" data-route="schedule" class="button primary">Mở Thời gian biểu →</a></div>` : ''}
  </div>`;
}

export async function handlePlannerAction(button) {
  if (!button) return true;
  button.disabled = true;
  const original = button.textContent;
  button.textContent = 'Đang lập thời gian biểu…';
  const target = document.getElementById('aiPlannerResult');
  try {
    const state = getState();
    const context = {
      tasks:(state.tasks || []).slice(0,30), schedule:(state.schedule || []).slice(0,50), habits:(state.habits || []).slice(0,30), goals:(state.goals || []).slice(0,20), notes:(state.notes || []).slice(0,30), subjects:(state.subjects || []).slice(0,30), materials:(state.materials || []).slice(0,30), colleges:(state.colleges || []).slice(0,20), focusSessions:state.focusSessions || 0, streak:state.streak || 0
    };
    const response = await fetch('/api/schedule', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ context }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `AI request failed (${response.status})`);
    const blocks = Array.isArray(data.blocks) ? data.blocks : [];
    if (!blocks.length) throw new Error('AI không trả về block học hợp lệ.');
    const calendar = savePlan(blocks);
    if (target) target.innerHTML = resultHTML(data, calendar);
  } catch (error) {
    if (target) target.innerHTML = `<div class="empty-state"><strong>Không thể lập thời gian biểu</strong>${esc(error.message)}</div>`;
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
  return true;
}
