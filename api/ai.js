import { bodyOf, generate, json, systemPrompt, aiErrorMessage } from './_lib/ai.js';

function isPlannerRequest(body, prompt) {
  return body.mode === 'planner' || body.type === 'planner' || /ai\s*planner|đề xuất lịch|tối ưu lịch|lập lịch học|phân tích.*lịch/i.test(prompt);
}

function plannerContext(source) {
  const context = source && typeof source === 'object' ? source : {};
  return {
    tasks: Array.isArray(context.tasks) ? context.tasks.slice(0, 20) : [],
    schedule: Array.isArray(context.schedule) ? context.schedule.slice(0, 30) : [],
    goals: Array.isArray(context.goals) ? context.goals.slice(0, 10) : [],
    habits: Array.isArray(context.habits) ? context.habits.slice(0, 10) : [],
    focusSessions: Number(context.focusSessions || 0)
  };
}

export default async function handler(req,res){
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed.'});
  try {
    const body=bodyOf(req);
    const prompt=typeof body.prompt==='string'?body.prompt.trim():'';
    if(!prompt) return json(res,400,{error:'Prompt is required.'});
    if(prompt.length>6000) return json(res,413,{error:'Prompt is too long.'});

    const planner=isPlannerRequest(body,prompt);
    const contextData=planner?plannerContext(body.context):body.context||{};
    const context=JSON.stringify(contextData);
    const result=await generate(
      `${systemPrompt()}\n\nCURRENT SCHOLAR OS CONTEXT:\n${context}\n\nUSER REQUEST:\n${prompt}\n\nResponse requirements:\n- Complete the requested answer from beginning to end; do not stop mid-section.\n- Keep the answer focused and suitable for a Vietnamese high-school student.\n- For explanations, include the requested examples and self-check questions, but avoid unnecessary repetition.${planner?'\n- You are in AI Planner mode: return a concise, actionable schedule proposal. Do not repeat the full context. Prefer compact bullets or a small table.':''}`,
      {
        maxOutputTokens: planner ? 1200 : 2400,
        thinkingConfig: { thinkingLevel: 'minimal' }
      }
    );

    return json(res,200,{ok:true,text:result.text||''});
  } catch(err){
    console.error('[Scholar AI]',err);
    const e=aiErrorMessage(err);
    return json(res,e.status,{error:e.message});
  }
}
