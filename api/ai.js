import { bodyOf, generate, json, systemPrompt, aiErrorMessage } from './_lib/ai.js';

export default async function handler(req,res){
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed.'});
  try {
    const body=bodyOf(req);
    const prompt=typeof body.prompt==='string'?body.prompt.trim():'';
    if(!prompt) return json(res,400,{error:'Prompt is required.'});
    if(prompt.length>6000) return json(res,413,{error:'Prompt is too long.'});

    const context=JSON.stringify(body.context||{},null,2);
    const result=await generate(
      `${systemPrompt()}\n\nCURRENT SCHOLAR OS CONTEXT:\n${context}\n\nUSER REQUEST:\n${prompt}\n\nResponse requirements:\n- Complete the requested answer from beginning to end; do not stop mid-section.\n- Keep the answer focused and suitable for a Vietnamese high-school student.\n- For explanations, include the requested examples and self-check questions, but avoid unnecessary repetition.`,
      {
        maxOutputTokens: 2400,
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
