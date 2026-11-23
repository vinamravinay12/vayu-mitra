# Testing

```bash
npm run verify   # format → lint → typecheck → tests with 100% coverage → build
npm run e2e      # Playwright journeys against the production build
```

**293 tests in 42 files, 100% statements, branches, functions and lines**, enforced by the
coverage threshold in [`vitest.config.ts`](../vitest.config.ts). Only `server/src/index.ts` and
`client/src/main.tsx`, which bind to a port and a DOM node, are excluded.

| Area            | Tests | What they pin down                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| :-------------- | ----: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core`          |    86 | NAQI for every pollutant and CPCB's three-pollutant rule; sub-index ↔ concentration round trips; EPA inversion (and that a WAQI number is not NAQI); nearest station, freshness, distance and the CPCB preference; anchoring that fades to the model; memory changes, linking and forgetting (including Devanagari labels); every verdict and precaution; quiet hours across midnight and the cooldown; intent from keywords, plurals, times and AI hints; engine sentences; suggestions                                                                                                                                                                          |
| `server`        |   133 | CPCB rows → stations (bad rows dropped); WAQI parsing; caching and shared in-flight calls; a failed station feed degrading to forecast-only; the understand and reply calls with every fallback; grounding; injection refused by pattern and by judge; sign-up, sign-in, sign-out and account deletion; password hashing, session signing, tampering and expiry; one error for wrong email or password; sign-in and isolation between two families; push endpoints restricted to real push services; the scheduler-only route; the alert job (stale devices dropped, cooldown, failures isolated, batching); headers and CSP in both modes; every route and error |
| `client`        |    60 | A journey through place, conversation, advice and memory with axe at each step; editing and forgetting chips; deleting data; creating an account, a taken email, a wrong password, signing out and back in, and deleting the account; alert settings and push outcomes; every failure shown to the family; hooks' races (late answers, unmount)                                                                                                                                                                                                                                                                                                                   |
| `tests/quality` |    14 | Repository rules as tests: file sizes, no `any`, no console outside the logger, no key-shaped strings, documented functions, required docs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

The client tests use a fake API server that answers with the **real engine**, so the advice the
tests check is the advice the app gives.

## Browser journeys

12 Playwright tests against the production build with production headers and real accounts, on
**desktop and at 375 px**, in **light and dark**: security headers, the session cookie's flags and
the hidden scheduler route; signing out, a wrong password and signing back in; place → question
→ advice with axe (WCAG 2.2 AA, colour contrast included) at every step, no console errors or CSP
violations, no sideways scroll; editing and forgetting chips and their effect on suggestions; and
deleting the account. Each test creates its own account; they run serially against one server.

## What is not automated

Real Gemini, CPCB, WAQI, Firestore and push-service calls are not made in CI (no secrets there). Each binding is
one call, tested against a fake of the SDK object; after deploying, the checks in
[DEPLOYMENT.md](DEPLOYMENT.md) exercise them for real.
