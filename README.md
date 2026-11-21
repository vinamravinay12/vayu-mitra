# 🌫️ Vayu Mitra — a GenAI clean-air coach for families in winter smog

**Tell it how your family lives. Get today's cleanest hours for your city, the indoor fixes and
low-emission switches that protect your most vulnerable person first, and the measured impact
of every choice — on each person's lungs and on your neighbourhood's air.**

🌐 **Live app:** https://vayu-mitra-982453010059.asia-south1.run.app
📦 **Repository:** https://github.com/vinamravinay12/vayu-mitra

---

## 🎯 Chosen vertical & the problem

**Problem statement:** a GenAI-powered assistant that helps families and communities navigate
severe winter smog and urban air pollution — suggesting **low-emission daily routines**,
**indoor air quality hacks** and **sustainable alternatives** tailored to their **location and
lifestyle**, while **clearly explaining the direct impact of their choices**.

Every winter, families in north India are told "AQI is severe, stay indoors". That advice cannot
be acted on. It does not say that the 6 am walk is taken in the day's worst air while 2 pm is
half as polluted; that a grandfather at home breathes most of his smog _indoors_, where an
angithi, agarbatti and a mosquito coil add more than the traffic outside; that an N95 barely
helps someone who is home all day while a purifier helps a lot; or that an electric heater
clears the room but adds CO₂ on the grid. Generic chatbots answer with confident paragraphs that
cannot be checked and change every time.

Vayu Mitra gives a family **a plan they can act on and trust**:

- **every number is computed** — from the live forecast for their place and a tested exposure and
  emissions model of their own day — never generated;
- the AI does what it is good at: **reading** a messy description (English, Hindi or Hinglish)
  and **explaining** the plan in plain English or Hindi; the server checks that every number the
  AI writes came from the engine before the family sees it;
- each recommendation shows **its direct impact**: whose dose falls and by how much, cigarettes'
  worth a day, grams of PM2.5 kept out of the neighbourhood, CO₂ saved or added, and what the
  whole housing society would achieve together.

---

## 🧭 How it works

```
 "Family of four in Lajpat Nagar. Papa (68) has asthma and walks at 6 am. I drive 14 km.
  Agarbatti morning and evening, angithi at night. Society of 120 flats burns leaves."
        │
        ▼
 ① Read   ── Gemini extracts a household profile (enum-only JSON schema, closed vocabularies)
        │     • an independent Gemini judge screens the text for prompt injection, in parallel
        │     • the engine re-checks every value; anything invalid is defaulted and flagged
        ▼
 ② Check  ── the family reviews a pre-filled form; every guessed answer says "Guessed — please check";
        │     the place is searched and pre-selected for them
        ▼
 ③ Air    ── today's and tomorrow's hourly PM2.5/PM10 for that place (Open-Meteo, CAMS model)
        ▼
 ④ Plan   ── the pure engine, in the browser, in ~0.26 ms:
        │     • NAQI AQI, WHO multiple, cleanest 2-hour window, worst hour, tomorrow's trend
        │     • each person's day on a 96-quarter-hour grid → inhaled PM2.5 dose, by place
        │     • the household's weekly PM2.5 and CO₂, by source
        │     • 20 actions tested one by one as what-ifs → impact → plain-language explanation
        │     • ranked for the most vulnerable person first; a balanced starting plan pre-ticked
        │     • hour-by-hour routine, health alerts (incl. carbon monoxide), community totals
        ▼
 ⑤ Choose ── tick or untick actions → the whole plan, routine and impact update instantly
        ▼
 ⑥ Coach  ── "Explain my plan" (English or हिन्दी) and "Ask about your plan": Gemini words the
              engine's facts; the server rejects any answer containing a number it did not compute
```

---

## ✅ What's covered

| Problem statement asks for               | What Vayu Mitra does                                                                                                                                                                                                                                                                                                                                                                                                |
| :--------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Tailored to location**                 | Live hourly forecast for the family's own place (any city worldwide); AQI on India's NAQI scale; the cleanest window and the worst hour are found in _their_ forecast, today                                                                                                                                                                                                                                        |
| **Tailored to lifestyle**                | Up to 8 people with age group, health conditions (asthma, COPD, heart disease, pregnancy, diabetes, allergies), school/office/home/outdoor work, commute mode and distance, outdoor exercise and its hour; home draughtiness, window habits, purifier, cooking fuel, kitchen exhaust, heating, incense, coils, smoking; waste burning, generator, transit access, society size                                      |
| **Low-emission daily routines**          | Move exercise to the cleanest free hour; exercise indoors on very poor days; N95 outdoors (never for babies); car recirculation; air the home only in the cleanest window — plus an hour-by-hour routine for today                                                                                                                                                                                                  |
| **Indoor air quality hacks**             | HEPA purifier, a ₹3,000 DIY box-fan filter, sealing gaps, exhaust and lids, swapping incense, replacing coils, a smoke-free home, wet-mopping                                                                                                                                                                                                                                                                       |
| **Sustainable alternatives**             | Metro or bus, carpooling, walking short trips, clean cooking fuel (incl. PM Ujjwala), replacing coal/wood heaters, composting not burning, an inverter instead of a diesel generator                                                                                                                                                                                                                                |
| **Families and communities**             | Per-person impact weighted to protect the most vulnerable; health alerts by condition; "if every home in your society did this" totals; four community drives (no-burning rule, carpool board, clean-air room, reporting) scaled to the society's size                                                                                                                                                              |
| **Clearly explaining the direct impact** | Every action: "Cuts Asha's daily PM2.5 dose by 46% (1,963 → 1,067 µg)", "keeps 175 g of PM2.5 a week out of your neighbourhood's air", trade-offs stated ("adds 18 kg of CO₂ a week through the power grid"; "Asha's dose rises 1.4%"); per-person before/after table in µg and cigarettes a day; where each dose is breathed; a live total as choices change; and a Gemini explanation checked against the numbers |
| **Persistence**                          | The confirmed plan, choices and language survive refresh (validated local storage); **Start over** clears everything                                                                                                                                                                                                                                                                                                |

---

## 🤖 How AI is used (Google Gemini)

`gemini-3.5-flash-lite` (falling back to `gemini-flash-lite-latest` and `gemini-3.1-flash-lite`),
via the official `@google/genai` SDK, **server-side only**. Chosen by probing every available
model with the real schema (details in [docs/AI.md](docs/AI.md)).

| Call                     | Where                                                                                           | What Gemini does                                                                                                                                        | How it is constrained and checked                                                                                                                                                                                                                              |
| :----------------------- | :---------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Household extraction** | `POST /api/extract` → [`extract-profile.ts`](packages/server/src/extract/extract-profile.ts)    | Reads a free-text description into the household profile                                                                                                | Enum-only `responseJsonSchema` from the core Zod schema; temperature 0; Zod re-parse; every field re-checked by the engine; guesses flagged on the review form                                                                                                 |
| **Injection judge**      | Same requests, **in parallel** → [`screen-input.ts`](packages/server/src/guard/screen-input.ts) | Labels text `safe` or `manipulation`                                                                                                                    | Separate instruction and schema; a pattern pre-screen blocks blatant attempts with **no model call**                                                                                                                                                           |
| **Plan coach**           | `POST /api/coach` → [`coach-plan.ts`](packages/server/src/coach/coach-plan.ts)                  | Explains the plan in English or Hindi: what today's air means, what the chosen actions change for the most vulnerable person, why each priority matters | Server **rebuilds the plan** itself; Gemini sees only the plan's facts; action ids are an enum of this plan; **every number in the answer must appear in the facts**; no links/contacts/instructions; otherwise the engine's own summary is shown and labelled |
| **Ask about your plan**  | `POST /api/ask` → [`answer-question.ts`](packages/server/src/coach/answer-question.ts)          | Answers questions like "Can Papa walk at 4 pm?" from the plan                                                                                           | Question fenced, pattern-screened and judged in parallel; same grounding checks; an unverifiable answer is withheld and the family told so                                                                                                                     |

**What the AI never does:** compute a dose, an AQI, an hour, a ranking, a saving or a health
alert. Those come from the engine and its documented assumptions, so the same household on the
same forecast always gets the same plan.

---

## 🏗️ Architecture & stack

```
packages/
├── core/     Pure TypeScript engine. No I/O, no clock of its own, no network.
│   ├── catalog/      knowledge as data: NAQI bands, commute & household-source factors,
│   │                 breathing rates, 20 actions, 8 health alerts, 4 community drives
│   ├── schemas/      Zod schemas; TypeScript types inferred from them
│   ├── air/ aqi/ exposure/ emissions/ scenario/ actions/ routine/ alerts/ community/ explain/ plan/
├── server/   Express 5: the trust boundary. Holds the Gemini key, fetches & caches Open-Meteo,
│             screens and validates every model call, serves the built client.
└── client/   React 19 + Vite + Tailwind 4. Runs the same engine in the browser.
```

Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · decisions and what they cost:
[docs/decisions.md](docs/decisions.md) · every assumption and its source:
[docs/ASSUMPTIONS.md](docs/ASSUMPTIONS.md).

**Stack:** TypeScript 6 (strict) · React 19 · Vite 8 · Tailwind CSS 4 · Express 5 · Zod 4 ·
`@google/genai` · Open-Meteo · Vitest 5 · Testing Library · axe-core · Playwright · Google Cloud Run.

---

## 🚀 Run locally

Requires Node 22+.

```bash
npm install
cp .env.example packages/server/.env    # add GEMINI_API_KEY (optional locally)
npm run dev                             # API on :8099 and the app on :5173
```

Without `GEMINI_API_KEY` the server uses an offline keyword reader, and the coach shows the
engine's own summary; add `AIR_DATA_MODE=fixture` to work without network.

```bash
npm run verify     # format, lint, typecheck, 249 tests at 100% coverage, build
npm run e2e        # 14 Playwright journeys: production headers, axe in light and dark, 375 px
npm run profile    # engine and server latency, memory and payload measurements
```

Deploy to Cloud Run: see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## 📏 Evaluation criteria → evidence

| Criterion             | Where to look                                                                                                                                                                                                                                        | Measured                                                                                                      |
| :-------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------ |
| **Problem alignment** | [What's covered](#-whats-covered), [`catalog/actions/`](packages/core/src/catalog/actions/), [`describe-impact.ts`](packages/core/src/explain/describe-impact.ts), [`build-routine.ts`](packages/core/src/routine/build-routine.ts)                  | Routines, indoor hacks and sustainable alternatives, each with a computed per-person and neighbourhood impact |
| **Code quality**      | [docs/CODE_QUALITY.md](docs/CODE_QUALITY.md), [`eslint.config.js`](eslint.config.js), [`tsconfig.base.json`](tsconfig.base.json), [`hygiene.test.ts`](tests/quality/hygiene.test.ts)                                                                 | Strict type-checked lint, 0 warnings; files ≤ 150 lines, functions ≤ 60, complexity ≤ 10 — as errors          |
| **Security**          | [docs/SECURITY.md](docs/SECURITY.md), [`check-grounding.ts`](packages/server/src/coach/check-grounding.ts), [`rate-limit.ts`](packages/server/src/security/rate-limit.ts), [`security-headers.ts`](packages/server/src/security/security-headers.ts) | Pattern + LLM judge, fencing, number grounding, forged-XFF test, strict CSP, CodeQL, gitleaks, audit          |
| **Efficiency**        | [docs/EFFICIENCY.md](docs/EFFICIENCY.md), [`scripts/profile-engine.mjs`](scripts/profile-engine.mjs)                                                                                                                                                 | Plan 0.26 ms p50; profiling fix −39%; heap +0.09 MB over 20 000 plans; 2.6 KB forecast; FCP 136 ms            |
| **Testing**           | [docs/TESTING.md](docs/TESTING.md), [`vitest.config.ts`](vitest.config.ts), [`e2e/`](e2e/journey.spec.ts)                                                                                                                                            | 249 tests, 100% statements/branches/functions/lines; 14 browser journeys                                      |
| **Accessibility**     | [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md)                                                                                                                                                                                                       | Zero axe violations at every stage and tab, light and dark, desktop and 375 px                                |

---

## 📚 Documentation

| Document                                                        | What it covers                                                                |
| :-------------------------------------------------------------- | :---------------------------------------------------------------------------- |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md)                         | Packages, data flow, the exposure model, actions as data, request lifecycle   |
| [decisions.md](docs/decisions.md)                               | 11 architecture decision records, each with what it cost                      |
| [ASSUMPTIONS.md](docs/ASSUMPTIONS.md)                           | Every factor in the models, where it lives in code, and its source            |
| [AI.md](docs/AI.md)                                             | Model probing, every Gemini call, injection defence, grounding, reliability   |
| [SECURITY.md](docs/SECURITY.md)                                 | Threat model with defences and the tests that prove them                      |
| [EFFICIENCY.md](docs/EFFICIENCY.md)                             | Profiles, the profiling fix, bundle, payloads and page-load timings           |
| [TESTING.md](docs/TESTING.md)                                   | Strategy, invariant tests over the catalogue, browser journeys, hygiene tests |
| [ACCESSIBILITY.md](docs/ACCESSIBILITY.md)                       | WCAG approach, keyboard, live regions, charts with text equivalents           |
| [CODE_QUALITY.md](docs/CODE_QUALITY.md)                         | Enforced gates and conventions                                                |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md)                             | Cloud Run, Secret Manager, configuration                                      |
| [CONTRIBUTING.md](CONTRIBUTING.md) · [SECURITY.md](SECURITY.md) | Where code goes, checks before a PR, reporting vulnerabilities                |

---

## 🔒 Security

Full details in [docs/SECURITY.md](docs/SECURITY.md). Highlights:

- The Gemini key lives only in the server (Secret Manager in production); production refuses to
  start without it; CI fails if a key-shaped string reaches the client bundle.
- **Layered prompt-injection defence:** pattern pre-screen (no model call), an independent LLM
  judge in parallel, fenced untrusted text, enum-only schemas — verified live against blatant and
  paraphrased attacks.
- **Grounded output:** an AI answer is shown only if every number in it came from the engine.
- The server rebuilds every plan it explains; browser numbers are never trusted.
- Rate limits keyed on the proxy-resolved client IP (`trust proxy` = 1), tested with forged headers.
- Zod at every boundary, 16 KB body cap, sanitised errors, strict CSP with no inline script,
  HSTS, COOP/CORP; no household or health data stored on a server; location rounded to ~1 km.

## ♿ Accessibility

Full details in [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md). Highlights:

- **Zero axe violations** asserted at every step and tab, in jsdom and in a real browser, in light
  and dark themes, on desktop and a 375 px phone (contrast included).
- Native controls, labelled fieldsets, real tables, skip link, focus moved on each stage, WAI-ARIA
  tabs, live regions for the running impact and AI answers, `lang="hi"` for Hindi text.
- The hourly chart has a text summary and a full data table; colour is never the only signal.

## ⚡ Efficiency

Full details in [docs/EFFICIENCY.md](docs/EFFICIENCY.md). Highlights:

- Plan computed in the browser: **259.9 µs p50** for a family of four; a tick is a full recompute
  in 0.26 ms with **no network call**.
- A CPU profile found one function taking 39% of engine time; memoising it cut plans by **39–41%**.
- Forecasts cached per ~1 km cell for 30 min with shared in-flight requests; AI answers cached;
  the injection judge runs in parallel; blatant injections cost no model call.
- Plan view lazy-loaded (18 KB gz); first screen 101 KB gz JS; FCP/LCP 136 ms, CLS 0 on the
  production build.

## 🧪 Verification & testing

Full details in [docs/TESTING.md](docs/TESTING.md). Highlights:

- **249 tests**, **100% statements, branches, functions and lines**, enforced with `all: true`.
- The pure engine is tested without mocks; invariant tests check the whole catalogue.
- Supertest covers every route and status; Playwright covers the journey in a real browser under
  the production CSP.
- CI: verify gate, profiling, `npm audit`, gitleaks, bundle-secret check, CodeQL, container
  build, e2e.

---

## 📝 Assumptions

- Exposure and emission figures are **modelled estimates** from published factors (sources in
  [docs/ASSUMPTIONS.md](docs/ASSUMPTIONS.md)), for a typical weekday; they are for comparing
  choices, not medical or regulatory use.
- The forecast is the Copernicus CAMS model via Open-Meteo (~11 km), which can differ from a
  nearby monitoring station. AQI uses India's NAQI scale for every place.
- Factors (commute exposure, indoor sources, emission factors, grid CO₂) reflect urban India;
  the app works anywhere but is calibrated for Indian winter smog.
- Health alerts are general precautions from WHO and Ministry of Health advisories, not advice
  for an individual; the app says so beside them.
- One plan per browser, kept on the device; no account, so no health details are stored on a server.

## 🧩 Known gaps

- Plans live in one browser; there is no account or cross-device sync.
- The model works with a typical weekday; weekends and irregular shifts are not modelled separately.
- Community impacts use typical participation rates rather than the society's own sign-ups.
- The rate limiter is per instance: it protects the model quota, not a global counter.
