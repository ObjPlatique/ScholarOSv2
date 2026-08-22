import { bodyOf, cleanJson, generate, json, systemPrompt, aiErrorMessage } from './_lib/ai.js';

const QUIZ_MODEL = process.env.GEMINI_QUIZ_MODEL || 'gemini-3.5-flash-lite';

function quizSchema(count) {
  return {
    type: 'object',
    properties: {
      title: { type: 'string' },
      questions: {
        type: 'array',
        minItems: count,
        maxItems: count,
        items: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            options: {
              type: 'array',
              minItems: 4,
              maxItems: 4,
              items: { type: 'string' }
            },
            answer: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
            explanation: { type: 'string' }
          },
          required: ['question', 'options', 'answer', 'explanation']
        }
      }
    },
    required: ['title', 'questions']
  };
}

export default async function handler(req,res){
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed.'});
  try {
    const {topic,subject,difficulty,count=5}=bodyOf(req);
    if(!String(topic||'').trim()) return json(res,400,{error:'Topic is required.'});

    const n=Math.max(1,Math.min(10,Number(count)||5));
    const prompt = `${systemPrompt()}\nCreate exactly ${n} objectively gradable multiple-choice questions in Vietnamese about ${subject||'môn học'} / ${topic}. Difficulty: ${difficulty||'vừa'}. Each question must have exactly 4 options (A, B, C, D), one correct answer, and a concise explanation. Do not use markdown. Return only the requested JSON structure.`;

    const result=await generate(prompt,{
      model: QUIZ_MODEL,
      maxOutputTokens: Math.max(1800, n * 380),
      thinkingConfig: { thinkingLevel: 'minimal' },
      responseMimeType: 'application/json',
      responseSchema: quizSchema(n)
    });

    const quiz=cleanJson(result.text);
    if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length !== n) {
      throw new Error(`AI returned ${quiz?.questions?.length || 0} questions; expected ${n}.`);
    }
    return json(res,200,{ok:true,...quiz});
  } catch(err){
    console.error('[AI quiz]',err);
    const e=aiErrorMessage(err);
    return json(res,e.status,{error:e.message});
  }
}
