# Architecture

Vayu Mitra is a three-package TypeScript monorepo deployed as **one container** on Cloud Run.
The rule that shapes everything: **the AI reads and writes words; a deterministic engine owns
every number, hour, ranking and decision.**

```
packages/
├── core/     Pure clean-air engine. No I/O, no clock of its own, no network.
│   ├── catalog/      knowledge as data: NAQI bands, commute and household-source factors,
│   │                 breathing rates, 20 actions, 8 health-alert rules, 4 community drives
│   ├── schemas/      Zod schemas for profile, air snapshot and AI draft; types via z.infer
│   ├── air/ aqi/     local day selection, cleanest window, peak, NAQI sub-indices
│   ├── exposure/     96-quarter-hour schedule per person → inhaled PM2.5 dose
│   ├── emissions/    weekly PM2.5 and CO₂ the household releases, by source
│   ├── scenario/     profile → scenario; each action effect is a pure scenario transform
│   ├── actions/      what-if per action, ranking, alternatives, the chosen plan
│   ├── routine/ alerts/ community/ explain/ plan/
├── server/   Express 5 API, the trust boundary. Holds the Gemini key, fetches and caches
│             Open-Meteo, screens and validates every model call, serves the built client.
└── client/   React 19 + Vite + Tailwind 4. Runs the same engine in the browser, so
              ticking an action recomputes the whole plan in ~0.26 ms with no network call.
```

## Data flow

```
 "We are four in Lajpat Nagar. Papa has asthma and walks at 6. I drive 14 km. Angithi at night."
   │
   ▼  POST /api/extract
 ① pattern pre-screen ──(blatant injection: 422, no model call)
   ├─ Gemini injection judge ─┐   run in parallel
   └─ Gemini extraction ──────┘   enum-only JSON schema → Zod → completeProfile()
   │                              out-of-range values become defaults, listed as "assumed"
   ▼
 ② Review form: every guessed answer flagged; place searched (GET /api/places) and pre-chosen
   ▼
 ③ GET /api/air?lat&lon → Open-Meteo (8 s timeout, Zod-validated, cached 30 min per ~1 km cell)
   ▼
 ④ buildPlan(profile, forecast, now, chosenIds) — in the browser
   │   today's AQI, cleanest window, peak hour, tomorrow's trend
   │   baseline exposure per person + household emissions
   │   every applicable action applied alone → impact → explanation sentences → ranking
   │   chosen actions applied together → combined impact, routine, alerts, community totals
   ▼
 ⑤ Tick an action → toggleChoice() → buildPlan() again → every number updates at once
   ▼
 ⑥ POST /api/coach | /api/ask — the server REBUILDS the plan from the profile and its own
     forecast, gives Gemini only the plan's facts, and shows the answer only if every number
     in it appears in those facts (else the engine's own summary / "could not verify").
```

## The engine

### Exposure

[`build-schedule.ts`](../packages/core/src/exposure/build-schedule.ts) paints a person's typical
weekday onto 96 quarter-hours: asleep 22:00–06:00, the commute legs (distance ÷ mode speed,
rounded to the quarter), six hours at school, nine at the office or eight outdoors, and an
exercise hour that may only replace time at home.
[`indoor-air.ts`](../packages/core/src/exposure/indoor-air.ts) computes each hour's indoor
PM2.5 as a single-zone balance: outdoor × infiltration (or ~all of it with windows open) + the
sources burning that hour, minus what a running purifier removes.
[`model-exposure.ts`](../packages/core/src/exposure/model-exposure.ts) then sums concentration ×
breathing rate × time, split into home, commute, away and exercise — which is why the app can say
"62% of Dadaji's dose is breathed at home".

### Actions as data

Each of the 20 actions in [`catalog/actions/`](../packages/core/src/catalog/actions/) has a
declarative `when` condition (evaluated by one tested function,
[`evaluate-condition.ts`](../packages/core/src/conditions/evaluate-condition.ts)) and a list of
typed `effects` such as `{ kind: 'add-purifier', reduction: 0.6 }` or
`{ kind: 'switch-commute', from: [...cars], to: 'metro', maxKm: 40 }`.
[`apply-effect.ts`](../packages/core/src/scenario/apply-effect.ts) turns each effect into a new
scenario; the same models then run on it. **No impact number is written into the catalogue** —
every one is the difference between two model runs, so changing an assumption changes every
explanation consistently.

### Ranking and the starting plan

[`assess-actions.ts`](../packages/core/src/actions/assess-actions.ts) measures each applicable
action on its own, drops changes too small to matter (or that leave the family breathing more
without cutting smog), scores health first (vulnerability-weighted), then smog, then CO₂, discounted
for effort and cost, and pre-selects the best routine, indoor and sustainable action.
[`choose-actions.ts`](../packages/core/src/actions/choose-actions.ts) keeps alternatives exclusive
(a HEPA purifier _or_ a DIY filter; metro _or_ carpool).

### Explanations

[`describe-impact.ts`](../packages/core/src/explain/describe-impact.ts) turns an impact into
sentences — the most-protected person, the family-wide cut, grams of PM2.5 kept out of the
neighbourhood, CO₂ saved — and states trade-offs openly: _"Watch out: Asha's dose rises 1.4%"_,
_"it adds about 18 kg of CO₂ a week through the power grid"_.

## The server

Middleware order in [`app.ts`](../packages/server/src/app.ts): security headers → compression →
16 KB JSON body cap → rate limits (AI routes 10/min, data routes 60/min, per proxy-resolved IP) →
routes → static client → sanitised error handler.

| Route                    | Purpose                                                                  |
| :----------------------- | :----------------------------------------------------------------------- |
| `GET /api/health`        | Liveness, model mode, air-data mode                                      |
| `GET /api/places?q=`     | Open-Meteo geocoding, cached 24 h                                        |
| `GET /api/air?lat=&lon=` | Hourly forecast, cached 30 min per rounded cell, shared in-flight        |
| `POST /api/extract`      | Pattern screen → judge ∥ extraction → reviewed profile                   |
| `POST /api/coach`        | Plan rebuilt on the server → grounded explanation, or the engine summary |
| `POST /api/ask`          | Pattern screen → judge ∥ answer → grounded answer, or "could not verify" |

## The client

Three stages in one reducer ([`session.ts`](../packages/client/src/state/session.ts)): describe →
review → plan. The confirmed profile, choices and language are saved to `localStorage`, validated
with the same Zod schema on read, so a refresh never loses the plan and a tampered save can
never reach the engine. The plan view and the engine are a lazily loaded chunk.

## Why these shapes

See [decisions.md](decisions.md) for each decision and what it cost.
