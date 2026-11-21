# Testing

**249 Vitest tests** across 51 files and **14 Playwright browser journeys**, with **100%
statements, branches, functions and lines** enforced in [`vitest.config.ts`](../vitest.config.ts)
(`all: true`, so untested files count). One gate runs everything:

```bash
npm run verify   # prettier --check → eslint → tsc -b → vitest --coverage (100%) → build
npm run e2e      # Playwright: production build, production headers, axe in light and dark
```

| Package         | Tests | What they prove                                                                                                                                                |
| :-------------- | ----: | :------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core`          |    89 | The engine: AQI bands, day selection, schedules, exposure, emissions, every effect, ranking, choices, explanations, routine, alerts, community, the whole plan |
| `server`        |    93 | Every route and status code over HTTP (Supertest), the Gemini adapter, retries, guard, grounding checks, prompts, caches, config, headers, rate limiting       |
| `client`        |    53 | Full journeys with axe at every step, the profile form field by field, every plan tab and edge case, state, persistence and the API client                     |
| `tests/quality` |    14 | Repository standards as tests (below)                                                                                                                          |

## The pure engine is tested without mocks

`core` has no I/O and takes the clock as a parameter, so tests pass plain data in and assert on
plain data out. Fixtures build a deterministic winter curve
([`fixtures.ts`](../packages/core/src/test-utils/fixtures.ts)).

## Invariant tests over the catalogue

[`catalog.test.ts`](../packages/core/src/catalog/catalog.test.ts) checks the knowledge base
itself, so a data mistake fails CI rather than misleading a family:

- every action has steps, a reason and effects; ids are unique; every category has actions;
  every alternatives group has at least two members;
- every field any action or alert condition reads is defined by `deriveContext`;
- every reduction factor is in (0, 1];
- NAQI bands are contiguous and increasing, for both pollutants;
- every vocabulary value has a commute, cooking, heating, indoor-source, infiltration,
  ventilation, breathing-rate, weight and label entry;
- breathing rates rise with activity; hours of use are real hours.

## Behaviour worth calling out

- **Trade-offs are never hidden:** a test asserts the explanation names anyone whose dose rises
  ([`describe-impact.test.ts`](../packages/core/src/explain/describe-impact.test.ts)).
- **Babies never get mask credit** ([`model-exposure.test.ts`](../packages/core/src/exposure/model-exposure.test.ts)).
- **Grounding:** invented numbers, Devanagari digits, links and phone numbers are caught
  ([`coach.test.ts`](../packages/server/src/coach/coach.test.ts)).
- **Forged `X-Forwarded-For` does not reset the rate limit** ([`app.test.ts`](../packages/server/src/app.test.ts)).
- **Off-schema model output becomes an empty form or the engine summary, never an error.**
- **Out-of-order responses:** a slow earlier answer never overwrites a newer one
  ([`state.test.ts`](../packages/client/src/state/state.test.ts)).

## Browser journeys (Playwright)

[`e2e/journey.spec.ts`](../e2e/journey.spec.ts) runs against `npm run start:e2e`: the
production build, the production security headers, the offline AI client and fixture air, on
desktop Chrome and a 375 px phone:

- production CSP present, no `unsafe-inline`, HSTS set;
- the whole journey and **every tab** pass axe (WCAG 2.2 AA, colour contrast included — which
  jsdom cannot check) in **light and dark**, with **zero console errors**;
- ticking an action changes the impact summary;
- the coach shows the engine's summary when the AI is offline;
- **no stage scrolls sideways** at 375 px;
- a reload restores the plan; Start over clears it.

This suite found a real defect: at 375 px the per-person impact table sat in a scrollable box
that keyboard users could not reach (axe `scrollable-region-focusable`). The table now fits the
screen instead.

## Repository standards as tests

[`tests/quality/hygiene.test.ts`](../tests/quality/hygiene.test.ts) fails the build on: a
production file over 250 lines; `any`, `@ts-ignore` or `@ts-nocheck`; `innerHTML`, `eval` or
`new Function`; `console.*` outside the logger; request bodies in logs; a key-shaped string
anywhere; a top-level function without a doc comment; generic names (`data`, `result`, `tmp`,
`(a, b) =>`); a lint suppression without a reason; TODO/FIXME; a missing required doc; a README
that does not explain how to run, verify and configure; `.env` not ignored; server-only modules
imported into the browser.
