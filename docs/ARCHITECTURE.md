# Architecture

Three packages in one npm workspace, one container in production.

```
browser (React)                        server (Express on Cloud Run)                 Google Cloud / outside
───────────────                        ─────────────────────────────                 ──────────────────────
GET /api/config, /api/auth/session ─►  which auth, Web Push public key, who is in
POST /api/auth/register|login ──────►  scrypt check → signed __Host- cookie ───────►  Firestore accounts
GET /api/air?lat&lon ───────────────►  air service ── cache per ~1 km cell ────────►  Open-Meteo (CAMS)
                                         │  nearest fresh station ──────────────────►  CPCB (data.gov.in)
                                         │  anchored outlook                       ►  WAQI
POST /api/chat (cookie) ────────────►  session → chat pipeline ────────────────────►  Gemini
GET/PUT/DELETE /api/me* (cookie) ───►  session → users/{uid} ──────────────────────►  Firestore
pushManager.subscribe(VAPID) ───────►  POST /api/me/push-subscription
                                       POST /api/internal/check-alerts ◄── OIDC ────  Cloud Scheduler
push-sw.js ◄────────────── encrypted Web Push ◄── alert job ───────────────────────  browser push service
```

## `packages/core` — the engine

Pure functions over plain data: no network, no storage, no clock of its own. The server runs it
for every answer and alert; the browser runs parts of it for labels and suggestions, so both agree.

| Module                  | Does                                                                                                                                                                                                 |
| :---------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aqi/`                  | NAQI sub-indices for PM2.5, PM10, NO₂, O₃, SO₂, CO, NH₃ (CPCB 2014 bands); full NAQI with CPCB's three-pollutant rule; the inverse, sub-index → concentration; US EPA index → concentration for WAQI |
| `stations/`             | Station reading schema; great-circle distance; nearest fresh station (≤ 25 km, ≤ 3 h old, CPCB preferred within 2 km); anchoring the forecast to it                                                  |
| `schemas/air-report.ts` | The report the browser shows: now, its source, 36 hours ahead                                                                                                                                        |
| `memory/`               | What is remembered (people, routines, home features), changes the AI may propose, chip labels                                                                                                        |
| `advice/`               | Verdict, cleanest window, precautions, from intensity and who is involved                                                                                                                            |
| `alerts/`               | Settings, state, and the decision: threshold, quiet hours, six-hour cooldown unless worse                                                                                                            |
| `chat/`                 | Request and response contracts, intent reading (keywords, times, people, AI hints), engine sentences, suggested questions                                                                            |

## `packages/server`

- `air/` — Open-Meteo forecast and geocoder, CPCB and WAQI adapters, fixtures, and the service
  that combines them with per-cell caching and shared in-flight requests. A failing station feed
  degrades to a forecast-only report; a missing forecast is a 502.
- `chat/` — `understand` (Gemini → memory changes and hints), `write-reply` (Gemini → words,
  grounded), `run-chat` (the turn), `check-grounding`.
- `guard/`, `prompts/`, `llm/`, `validation/` — injection screening, prompt builders with fencing,
  the Gemini adapter with retries and model fallback, and every schema at the boundaries.
- `auth/` — scrypt passwords, signed sessions, the account store with unique emails, and the
  middleware that turns a cookie into a user.
- `gcp/`, `store/`, `push/` — thin Firestore, Web Push and OIDC bindings, the validated user store
  (Firestore, or memory for development), and the messenger.
- `alerts/check-alerts.ts` — the background run, batched, one family's failure never stops others.
- `routes/`, `app.ts`, `security/` — HTTP, middleware order, headers, rate limits.

## `packages/client`

- `App.tsx` starts with `/api/config` (validated by hand, so no schema library delays the first
  paint), and who is signed in. Sign-in is a plain form; the session cookie is never visible to scripts.
- `components/Home.tsx` (lazy) holds the signed-in app: air card, chat, chips, alerts, privacy.
- `push/push.ts` subscribes with the browser's Push API and the server's VAPID key.
- `state/` hooks own the household record, the air report (refreshed every 10 minutes), the chat
  (kept only in the tab) and push registration.
- `public/push-sw.js` shows Web Push messages as notifications.

## Why the shape

- **The engine decides, the model words it.** Every number, verdict and threshold is in tested
  code; the model reads and writes language. See [AI.md](AI.md).
- **One container, one origin.** No CORS, a strict CSP, one thing to deploy.
- **Interfaces at every edge.** The LLM, the data sources, the store, the messenger and both
  token verifiers are injected, so the whole server is tested with fakes; the remaining bindings
  are one call each and tested against fakes of the SDK objects.
