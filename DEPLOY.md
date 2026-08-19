# Deploying AI Medical Interpreter

Architecture: **frontend on Vercel** (static Vite build) + **backend on Render**
(FastAPI web service). The two are wired together by two environment variables:
the frontend's `VITE_API_BASE_URL` points at the backend, and the backend's
`ALLOWED_ORIGINS` allows the frontend origin (CORS).

Do it in this order — each step needs a URL produced by the previous one.

## 0. Push to GitHub (once)

```bash
git add -A
git commit -m "Add deploy config for Vercel + Render"
gh repo create ai-medical-interpreter --public --source=. --push   # or push to an existing remote
```

The repo URL is your "GitHub link" deliverable.

## 1. Backend on Render

1. Render Dashboard → **New → Blueprint** → pick this repo. It reads `render.yaml`.
2. When prompted for the `sync: false` secrets:
   - `GEMINI_API_KEY` → your Google AI Studio key.
   - `ALLOWED_ORIGINS` → leave a placeholder for now (e.g. `http://localhost:5173`);
     you'll set the real Vercel URL in step 3.
3. Deploy. When it's live, copy the service URL, e.g.
   `https://ai-medical-interpreter-api.onrender.com`.
4. Smoke test: open `<backend-url>/api/health` — expect
   `"provider":"gemini","provider_ready":true`.

## 2. Frontend on Vercel

1. Vercel → **Add New → Project** → import this repo.
2. **Root Directory: `frontend`** (important — the repo has two apps).
   Framework preset auto-detects **Vite**; build `npm run build`, output `dist`.
3. Add an environment variable:
   - `VITE_API_BASE_URL` = the Render backend URL from step 1 (no trailing slash).
   - Vite bakes `VITE_*` vars in at build time, so this must be set before the build.
4. Deploy. Copy the production URL, e.g. `https://ai-medical-interpreter.vercel.app`.
   That is your **live demo link** deliverable.

## 3. Wire CORS back to the frontend

1. Render → your service → Environment → set `ALLOWED_ORIGINS` to the Vercel
   production URL (no trailing slash). Add preview URLs comma-separated if needed.
2. Save → Render redeploys automatically.
3. Open the Vercel URL, type a sentence, press Translate. If you see a CORS error
   in the browser console, `ALLOWED_ORIGINS` doesn't match the origin exactly.

## Notes

- **Use Chrome or Edge** for voice (Web Speech API). Firefox auto-falls back to typing.
- **Render free tier sleeps** after ~15 min idle; first request then takes ~50s.
  Hit `/api/health` right before demoing to warm it up.
- **Provider = `gemini` in production.** The keyless `google_free` endpoint and the
  free TTS endpoint are undocumented and often blocked from datacenter IPs.
- Gemini free-tier keys can return transient `403`/timeout on burst calls; spaced-out
  real usage is fine. If it becomes a demo problem, add a one-shot retry in
  `backend/app/services/gemini.py`.
