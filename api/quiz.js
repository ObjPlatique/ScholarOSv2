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

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function answerIndex(letter) {
  return ['A', 'B', 'C', 'D'].indexOf(String(letter || '').toUpperCase());
}

// Do not trust the model to distribute correct answers evenly. Generate a
// balanced, randomized set of target positions and move the correct option
// server-side. This keeps the quiz fair even when the model favors A/B.
function balanceAnswerPositions(questions) {
  const letters = ['A', 'B', 'C', 'D'];
  const targets = [];
  for (let i = 0; i < questions.length; i += 1) targets.push(letters[i % 4]);
  shuffle(targets);

  return questions.map((question, index) => {
    const options = Array.isArray(question.options) ? [...question.options] : [];
    if (options.length !== 4) throw new Error('Each quiz question must contain exactly 4 options.');

    const correct = answerIndex(question.answer);
    if (correct < 0 || correct >= options.length) throw new Error('AI returned an invalid correct answer.');

    const correctOption = options[correct];
    const distractors = options.filter((_, optionIndex) => optionIndex !== correct);
    shuffle(distractors);

    const target = letters.indexOf(targets[index]);
    const reordered = [];
    let distractorIndex = 0;
    for (let optionIndex = 0; optionIndex < 4; optionIndex += 1) {
      if (optionIndex === target) reordered.push(correctOption);
      else reordered.push(distractors[distractorIndex++]);
    }

    return {
      ...question,
      options: reordered,
      answer: targets[index]
    };
  });
}

export default async function handler(req,res){
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed.'});
  try {
    const {topic,subject,difficulty,count=5}=bodyOf(req);
    if(!String(topic||'').trim()) return json(res,400,{error:'Topic is required.'});

    const n=Math.max(1,Math.min(10,Number(count)||5));
    const prompt = `${systemPrompt()}\nCreate exactly ${n} objectively gradable multiple-choice questions in Vietnamese about ${subject||'môn học'} / ${topic}. Difficulty: ${difficulty||'vừa'}. Each question must have exactly 4 options (A, B, C, D), one correct answer, and a concise explanation. The correct answer position may be any of A/B/C/D; do not intentionally favor any position. Do not use markdown. Return only the requested JSON structure.`;

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

    quiz.questions = balanceAnswerPositions(quiz.questions);
    return json(res,200,{ok:true,...quiz});
  } catch(err){
    console.error('[AI quiz]',err);
    const e=aiErrorMessage(err);
    return json(res,e.status,{error:e.message});
  }
}
