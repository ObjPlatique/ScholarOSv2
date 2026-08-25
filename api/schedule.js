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

function plannerInstructions(mode) {
  if (mode === 'CREATE_STARTER') {
    return `There is no existing schedule, no pending tasks, and no goals. Create a small starter study schedule from scratch instead of refusing to plan. Use realistic default study windows, for example weekday evenings and one or two weekend blocks. Do not fill the entire day. Use 50-minute study blocks with 10-minute breaks, leave recovery time, and create at most 2-3 study blocks per day. Mark these as suggested blocks, not fixed commitments.`;
  }

  if (mode === 'CREATE_FROM_TASKS') {
    return `There is no existing schedule, so create a new schedule from scratch around the pending tasks and goals. Prioritize deadlines and high-priority work. Use 50-minute study blocks with 10-minute breaks, leave recovery time, and do not fill the entire day.`;
  }

  return `An existing schedule is present. Keep fixed classes and existing sessions unchanged. Suggest only additional study blocks around them.`;
}

export default async function handler(req,res){
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed.'});
  try {
    const context=bodyOf(req).context||{};
    const mode=scheduleMode(context);
    const contextText=JSON.stringify(context,null,2);
    const prompt=`${systemPrompt()}
You are the AI Planner inside ScholarOS.
Mode: ${mode}
${plannerInstructions(mode)}
Return ONLY JSON with this exact shape: {summary:string,blocks:[{day,start,end,title,type,reason}],tasks:[{title,day,start,end}],warnings:[string]}.
Use Vietnamese for summaries, titles, reasons and warnings.
Use day names such as Thứ 2, Thứ 3, ..., Chủ nhật.
Prefer 50/10 Pomodoro blocks. Never claim that you changed the user's data.
If the context is empty, still return a useful starter plan rather than an empty blocks array.
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
