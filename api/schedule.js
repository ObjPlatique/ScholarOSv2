import { bodyOf, cleanJson, generate, json, systemPrompt, aiErrorMessage } from './_lib/ai.js';

function scheduleMode(context) {
  const schedule = Array.isArray(context.schedule) ? context.schedule : [];
  const tasks = Array.isArray(context.tasks) ? context.tasks.filter(t => !t.done) : [];
  const goals = Array.isArray(context.goals) ? context.goals : [];

  if (!schedule.length) {
    if (!tasks.length && !goals.length) return 'CREATE_STARTER';
    return 'CREATE_FROM_TASKS';
  }
  return 'OPTIMIZE_EXISTING';
}

function starterSchedule() {
  return {
    ok: true,
    mode: 'CREATE_STARTER',
    summary: 'Lịch học khởi đầu nhẹ nhàng cho tuần mới',
    blocks: [
      { day: 'Thứ 2', start: '19:00', end: '19:50', title: 'Ôn tập môn ưu tiên', type: 'study', reason: 'Bắt đầu tuần bằng một block học ngắn để tạo nhịp.' },
      { day: 'Thứ 3', start: '19:00', end: '19:50', title: 'Luyện bài tập', type: 'study', reason: 'Dành một block cho bài tập và củng cố kiến thức.' },
      { day: 'Thứ 4', start: '19:30', end: '20:20', title: 'Học chủ đề mới', type: 'study', reason: 'Một block vừa phải để tiếp thu nội dung mới.' },
      { day: 'Thứ 5', start: '19:00', end: '19:50', title: 'Ôn và tự kiểm tra', type: 'study', reason: 'Kiểm tra lại kiến thức đã học trong tuần.' },
      { day: 'Thứ 7', start: '09:00', end: '09:50', title: 'Tổng ôn tuần', type: 'study', reason: 'Một block cuối tuần để tổng hợp và chuẩn bị tuần tiếp theo.' }
    ],
    tasks: [],
    warnings: ['Đây là lịch khởi đầu mẫu vì ScholarOS chưa có nhiệm vụ, mục tiêu hoặc phiên học.', 'Bạn có thể thêm nhiệm vụ và lịch cố định để AI Planner cá nhân hóa đề xuất.']
  };
}

function plannerInstructions(mode) {
  if (mode === 'CREATE_STARTER') {
    return `There is no existing schedule, no pending tasks, and no goals. Create a small starter study schedule from scratch instead of refusing to plan. Use realistic default study windows, for example weekday evenings and one or two weekend blocks. Do not fill the entire day. Use 50-minute study blocks with 10-minute breaks, leave recovery time, and create at most 2-3 study blocks per day. Mark these as suggested blocks, not fixed commitments.`;
  }

  if (mode === 'CREATE_FROM_TASKS') {
    return `There is no existing schedule, so create a new schedule from scratch around the pending tasks and goals. Prioritize deadlines and high-priority work. Use 50-minute study blocks with 10-minute breaks, leave recovery time, and do not fill the entire day.`;
  }

  return `An existing schedule is present. Keep fixed classes and existing sessions unchanged. Suggest only additional study blocks around them.`;
}

function compactContext(context) {
  const pick = (item, fields) => Object.fromEntries(fields.filter(key => item?.[key] !== undefined && item?.[key] !== null && item?.[key] !== '').map(key => [key, item[key]]));
  const tasks = Array.isArray(context.tasks) ? context.tasks.filter(t => !t.done).slice(0, 15).map(t => pick(t, ['title','name','deadline','dueDate','priority','subject','estimatedMinutes'])) : [];
  const schedule = Array.isArray(context.schedule) ? context.schedule.slice(0, 30).map(e => pick(e, ['title','date','start','time','duration','type','recurrence'])) : [];
  const goals = Array.isArray(context.goals) ? context.goals.slice(0, 8).map(g => pick(g, ['title','name','deadline','dueDate','priority','progress','target'])) : [];
  const habits = Array.isArray(context.habits) ? context.habits.slice(0, 7).map(h => pick(h, ['title','name','frequency','streak'])) : [];
  return { tasks, schedule, goals, habits, focusSessions: Number(context.focusSessions) || 0, streak: Number(context.streak) || 0 };
}

export default async function handler(req,res){
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed.'});
  try {
    const rawContext=bodyOf(req).context||{};
    const context=compactContext(rawContext);
    const mode=scheduleMode(context);
    if (mode === 'CREATE_STARTER') return json(res,200,starterSchedule());

    const contextText=JSON.stringify(context);
    const prompt=`${systemPrompt()}
You are the AI Planner inside ScholarOS.
Mode: ${mode}
${plannerInstructions(mode)}
Return ONLY JSON with this exact shape: {summary:string,blocks:[{day,start,end,title,type,reason}],tasks:[{title,day,start,end}],warnings:[string]}.
Use Vietnamese for summaries, titles, reasons and warnings.
Use day names such as Thứ 2, Thứ 3, ..., Chủ nhật.
Prefer 50/10 Pomodoro blocks. Never claim that you changed the user's data.
CONTEXT:
${contextText}`;
    const result=await generate(prompt);
    return json(res,200,{ok:true,mode,...cleanJson(result.text)});
  } catch(err){
    console.error('[AI schedule]',err);
    const e=aiErrorMessage(err);
    return json(res,e.status,{error:e.message});
  }
}
