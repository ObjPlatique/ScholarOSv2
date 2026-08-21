import { MODEL, json } from './_lib/ai.js';
export default function handler(req,res){ if(req.method!=='GET') return json(res,405,{error:'Method not allowed.'}); return json(res,200,{ok:true,provider:'Gemini API',model:MODEL,configured:Boolean(process.env.GEMINI_API_KEY)}); }
