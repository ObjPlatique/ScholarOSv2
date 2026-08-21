# ScholarOS v2 — Vercel Edition

ScholarOS is structured as a Vercel-native static frontend plus serverless API functions.

## Structure
- `public/` — frontend
- `api/` — serverless API endpoints
- `api/_lib/ai.js` — shared Gemini helper
- `vercel.json` — function configuration

## Local development
1. `npm install`
2. Copy `.env.example` to `.env` and add your Gemini API key.
3. `npm run dev`
4. Open the URL printed by Vercel CLI.

## API
- `GET /api/health`
- `POST /api/ai`
- `POST /api/quiz`
- `POST /api/grade`
- `POST /api/schedule`
- `POST /api/habits`

## Deployment
Connect the repository to Vercel or run `npm run deploy`. Add `GEMINI_API_KEY` in Vercel Project Settings → Environment Variables. Keep secrets server-side and never use a public/client prefix.
