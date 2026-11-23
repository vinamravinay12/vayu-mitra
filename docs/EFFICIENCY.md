# Efficiency

Measured, not estimated. Engine and server numbers come from `npm run profile` (Node 22,
linux/x64, in CI and in development); bundle sizes from `vite build`.

## What the browser downloads

| Chunk                                                    | When                                 |                        gzip |
| :------------------------------------------------------- | :----------------------------------- | --------------------------: |
| App shell (React, sign-in screen, header)                | first paint                          |                 **72.0 KB** |
| CSS                                                      | first paint                          |                      4.7 KB |
| Signed-in app (`Home`: engine, Zod schemas, chat, chips) | after the first paint                |                     35.3 KB |
| Firebase Auth                                            | only when sign-in is configured      | ≈ 54 KB across three chunks |
| Firebase Messaging and the push helper                   | only when the family turns alerts on |            loaded on demand |

The start-up config is validated by hand so that Zod stays out of the first paint, which cut
first-load JavaScript from 106 KB to 72 KB. Fingerprinted assets are cached for a year
(`immutable`); `index.html` is never cached, so a deploy is picked up on the next load.

## Engine (5 000 runs each)

| Operation                                                                |    p50 |     p95 |
| :----------------------------------------------------------------------- | -----: | ------: |
| Nearest of 551 stations (all of India)                                   | 328 µs |  450 µs |
| Anchor a 72-hour forecast                                                | 9.7 µs | 15.3 µs |
| Advise one activity                                                      | 3.7 µs |  7.5 µs |
| Engine share of a chat turn (memory, intent, advice, words, suggestions) |  27 µs |   50 µs |
| Alert decision                                                           | 1.7 µs |  2.5 µs |

Heap change after 20 000 chat turns: 0.09 MB (no retention).

## Server over loopback (300 sequential requests, no model, fixture air)

| Request                                             |    p50 |    p95 |   Size |
| :-------------------------------------------------- | -----: | -----: | -----: |
| `GET /api/air` (cached report)                      | 1.5 ms | 2.3 ms | 3.3 KB |
| `GET /api/me`                                       | 0.8 ms | 1.1 ms | 0.3 KB |
| `POST /api/chat` (engine reply, memory saved)       | 1.2 ms | 2.0 ms | 0.8 KB |
| `POST /api/chat` (blocked injection, no model call) | 1.0 ms | 1.4 ms | 0.4 KB |

So the time a family waits is almost entirely Gemini and the upstream feeds, which is where the
design spends its effort:

- **Parallel, not serial.** The injection judge, the air report and the understand call run
  together; only the reply call follows them.
- **Shared upstream work.** One national CPCB fetch per 15 minutes serves every family in India;
  air reports are cached per ~1 km cell for 10 minutes, and concurrent requests for the same cell
  share one in-flight call. Failures are never cached.
- **Small, fast models.** Flash-Lite with minimal thinking and token ceilings sized to each schema;
  a slow model hands over to the next after 10 s rather than holding a Cloud Run slot.
- **Small payloads.** A 36-hour report is 3.3 KB before gzip; a chat reply with advice, memory and
  suggestions about 1.3 KB; a family's stored record under 1 KB.
- **Batched alerts.** The background run checks families 20 at a time; families in the same cell
  reuse one report.

Latency on the live deployment (Gemini included) is to be measured after this version is deployed;
see [DEPLOYMENT.md](DEPLOYMENT.md).
