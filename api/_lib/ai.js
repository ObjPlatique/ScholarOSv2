import { GoogleGenAI } from '@google/genai';

export const MODEL = process.env.GEMINI_MODEL || 'gemini-3.7-flash';
export const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.6-flash';
const KNOWN_MODELS = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'];

export function json(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8').end(JSON.stringify(payload));
}

export function bodyOf(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch {}
  }
  return {};
}

export function getAI() {
  if (!process.env.GEMINI_API_KEY) {
    const err = new Error('GEMINI_API_KEY is missing. Add it in Vercel Environment Variables or your local .env file.');
    err.code = 'MISSING_API_KEY';
    throw err;
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

export function systemPrompt() {
  return `You are Scholar AI, the study assistant inside ScholarOS for a Vietnamese high-school student.\n\nGoals:\n- Help plan study sessions realistically.\n- Prefer Pomodoro 50 minutes focus + 10 minutes break.\n- Respect existing fixed classes and the student's rest/recovery.\n- Prioritize urgent/high-priority tasks and upcoming deadlines.\n- Suggest small repeatable habits rather than extreme routines.\n- Explain school subjects clearly when asked.\n- When proposing schedule changes, present them as suggestions and never claim that you changed the user's data.\n- Be concise, practical, and answer in Vietnamese unless the user asks otherwise.\n- Never request or expose API keys, passwords, or other secrets.`;
}

function statusOf(err) {
  const status = Number(err?.status);
  return Number.isInteger(status) ? status : 0;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryable(status) {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

export async function generate(input, config = {}) {
  const ai = getAI();
  const models = [...new Set([MODEL, FALLBACK_MODEL, ...KNOWN_MODELS].filter(Boolean))];
  let lastError = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await ai.models.generateContent({
          model,
          contents: input,
          config: { maxOutputTokens: 2200, ...config }
        });
      } catch (err) {
        lastError = err;
        const status = statusOf(err);

        if (isRetryable(status) && attempt < 2) {
          await sleep(700 * (attempt + 1));
          continue;
        }

        // 404 can mean the configured model is unavailable. Continue to the
        // next known-good model instead of stopping the entire AI request.
        break;
      }
    }
  }

  throw lastError || new Error('Gemini request failed.');
}

export function cleanJson(text) {
  const raw = String(text || '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  const a = raw.indexOf('{');
  const b = raw.lastIndexOf('}');
  if (a >= 0 && b > a) return JSON.parse(raw.slice(a, b + 1));
  throw new Error('AI did not return valid JSON.');
}

export function aiErrorMessage(err) {
  const status = statusOf(err) || 500;
  if (err?.code === 'MISSING_API_KEY') return { status: 500, message: err.message };
  if (status === 401 || status === 403) return { status, message: 'Gemini API key không hợp lệ hoặc không có quyền truy cập.' };
  if (status === 429) return { status, message: 'Gemini API đang giới hạn tốc độ. Hãy thử lại sau.' };
  if (status === 404) return { status, message: 'Không có model Gemini khả dụng. Kiểm tra GEMINI_MODEL/GEMINI_FALLBACK_MODEL trên Vercel.' };
  if (status >= 500) return { status: 502, message: 'Gemini API đang gặp lỗi tạm thời. Hệ thống đã thử lại nhiều model.' };
  return { status: status >= 400 && status < 600 ? status : 500, message: err?.message || 'AI request failed.' };
}
