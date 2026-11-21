# Efficiency

Everything below is measured, not estimated. Re-run with `npm run profile` (engine and server)
— CI runs it on every push.

## Design choices that keep it cheap

- **Zero network calls after the forecast.** The plan — AQI, routine, 20 what-ifs, impacts,
  community totals — is computed in the browser. Ticking an action recomputes everything
  locally.
- **One upstream call per city per half hour.** Forecasts are cached per ~1 km cell for 30 min,
  and concurrent requests for the same cell share one in-flight call
  ([`air-service.ts`](../packages/server/src/air/air-service.ts)); failures are never cached.
- **Model calls only when a family asks.** Extraction once; the coach and questions on a button
  press. Repeat requests hit a bounded TTL cache with hashed keys. The injection judge runs **in
  parallel** with the real call, so screening adds no latency; blatant injections are stopped by
  patterns **before any model call**.
- **Small payloads.** The forecast the browser downloads is 2.6 KB (before gzip); the saved session
  is 1.1 KB; the 28 KB plan object is computed on the device and never sent.
- **Code splitting.** The plan view and engine load only when a plan is shown.
- **Fingerprinted assets cached for a year (immutable); `index.html` never cached; gzip on;
  no web fonts** (system font stack).

## Engine profile (`scripts/profile-engine.mjs`)

Node 24, Apple Silicon, 5 000 runs each after a JIT warm-up.

| Household                          |      p50 |      p95 |      p99 | Plans/s |
| :--------------------------------- | -------: | -------: | -------: | ------: |
| Single commuter                    |  76.6 µs |  95.7 µs | 130.5 µs |  12 545 |
| Family of four, coal heater        | 259.9 µs | 302.2 µs | 314.2 µs |   3 799 |
| Eight people, every source         | 505.9 µs | 554.5 µs | 571.5 µs |   1 957 |
| One tick (toggle + full recompute) | 258.5 µs | 298.2 µs | 333.5 µs |   3 796 |

A tick costs about a quarter of a millisecond — under 2% of a 60 fps frame.

**Memory:** heap change after 20 000 plans: **0.09 MB** (no retention).

## A finding from profiling, fixed

A V8 CPU profile (`node --cpu-prof scripts/profile-engine.mjs`) showed one function taking
**39% of engine time**: `baseDay` in
[`build-schedule.ts`](../packages/core/src/exposure/build-schedule.ts), which rebuilt the same
96-cell sleep/commute skeleton for every person in every what-if, using a slow `Array.from` with
a mapper and eight separate sleep paints.

Fix: build each distinct day shape once (keyed by where the person goes, how long the trip
takes and when they leave), share it read-only, fill with `Array.fill`, paint sleep in one call.
The memo is bounded (256 shapes) and tested through a fill-and-clear cycle.

| Household       | Before (p50) | After (p50) |   Change |
| :-------------- | -----------: | ----------: | -------: |
| Single commuter |     100.6 µs |     76.6 µs |     −24% |
| Family of four  |     422.7 µs |    259.9 µs | **−39%** |
| Eight people    |     852.4 µs |    505.9 µs | **−41%** |

## Server profile (`scripts/profile-server.mjs`)

300 sequential requests over loopback with the offline model and fixture air, so the numbers
measure our own code (validation, screening, plan rebuild, caching, compression, headers).

| Request                                            |     p50 |     p95 | Response |
| :------------------------------------------------- | ------: | ------: | -------: |
| `GET /api/health`                                  | 0.16 ms | 0.40 ms |   0.0 KB |
| `GET /api/air`                                     | 0.34 ms | 0.59 ms |   2.6 KB |
| `POST /api/extract` (cache hit)                    | 0.16 ms | 0.28 ms |   0.9 KB |
| `POST /api/coach` (plan rebuilt + engine summary)  | 0.35 ms | 0.56 ms |   0.4 KB |
| `POST /api/extract` (validation reject)            | 0.12 ms | 0.16 ms |   0.1 KB |
| `POST /api/ask` (blocked injection, no model call) | 0.29 ms | 0.37 ms |   0.1 KB |

Live Gemini latencies are in [AI.md](AI.md): extraction 2.0 s, judge 0.9 s (hidden behind
extraction), coach 1.7–5.1 s, answers 1.0–1.2 s, each capped at 10 s per model.

## Bundle (`npm run build`)

| Asset                                                          | Minified |  Gzipped |
| :------------------------------------------------------------- | -------: | -------: |
| Start screen and form (`index-*.js`: React, Zod, profile form) | 337.6 KB | 103.2 KB |
| Plan view and engine (`PlanView-*.js`, lazy)                   |  54.6 KB |  18.1 KB |
| Styles (`index-*.css`)                                         |  23.2 KB |   5.1 KB |
| `index.html`                                                   |   0.9 KB |   0.5 KB |

## Page load (production build, built-in browser, local server, no throttling)

Measured with the Performance API on the served production build:

| Metric                   |           Value |
| :----------------------- | --------------: |
| First Contentful Paint   |          136 ms |
| Largest Contentful Paint |          136 ms |
| Cumulative Layout Shift  |               0 |
| DOMContentLoaded         |          105 ms |
| JavaScript transferred   | 100.9 KB (gzip) |
| CSS transferred          |          5.3 KB |
