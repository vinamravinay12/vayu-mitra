# Code quality

Standards are encoded in configuration and tests, so they hold on every commit rather than by
good intentions.

## Gates

| Gate          | Where                                                                                      | Rule                                                                                                                                                                                                       |
| :------------ | :----------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Formatting    | [`.prettierrc.json`](.prettierrc.json)                                                     | `prettier --check .` in `npm run verify`                                                                                                                                                                   |
| Lint          | [`eslint.config.js`](eslint.config.js)                                                     | `typescript-eslint` **strict-type-checked** + stylistic; `--max-warnings 0`                                                                                                                                |
| Size          | same                                                                                       | `max-lines` 110 per file, `max-lines-per-function` 30 (blank lines and comments not counted), applied to source, tests, browser tests and scripts alike, with no exceptions                                |
| Complexity    | same                                                                                       | `complexity` 8, `max-depth` 3, `max-params` 3; the one Express error handler may take 4, because Express recognises it by its four parameters                                                              |
| Safety        | same                                                                                       | `eqeqeq`, `no-console` (the logger module exempted in the config, not inline)                                                                                                                              |
| Type honesty  | same                                                                                       | `consistent-type-assertions: never` in production: no `as` casts, only narrowing, Zod or typed declarations (`as const` asserts nothing)                                                                   |
| Warnings      | same                                                                                       | `no-warning-comments`: no TODO, FIXME, XXX or HACK in any file                                                                                                                                             |
| Suppressions  | same                                                                                       | `noInlineConfig`: no `eslint-disable` anywhere; every exception is a scoped, commented block in the config                                                                                                 |
| Accessibility | same                                                                                       | `jsx-a11y` strict and `react-hooks` as errors                                                                                                                                                              |
| Types         | [`tsconfig.base.json`](tsconfig.base.json)                                                 | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `noUnusedLocals/Parameters`; built with `tsc -b` across project references                                     |
| Coverage      | [`vitest.config.ts`](vitest.config.ts)                                                     | 100% statements, branches, functions and lines with `all: true`                                                                                                                                            |
| Dead code     | [`knip.json`](knip.json)                                                                   | `knip --include-entry-exports` in `npm run verify`: no unused file, dependency or export, including the engine's public API                                                                                |
| Hygiene       | [`hygiene.test.ts`](tests/quality/hygiene.test.ts)                                         | doc comment on every top-level function, no generic names, no `any`, no inline lint suppressions, no TODOs, no secrets, required docs present                                                              |
| Architecture  | [`architecture.test.ts`](tests/quality/architecture.test.ts)                               | the engine imports only Zod and touches no I/O, clock or randomness; client and server meet only through `@vayu/core`; each vendor SDK behind one adapter; Express only at the HTTP edge; no import cycles |
| Conventions   | [`conventions.test.ts`](tests/quality/conventions.test.ts)                                 | every TypeScript file, tests and root configs included, opens with a comment saying what it is for; every export has a doc comment                                                                         |
| Supply chain  | [`supply-chain.test.ts`](tests/quality/supply-chain.test.ts)                               | every GitHub Action pinned to a commit SHA; installs only from the lockfile; `npm audit` and dependency review in CI                                                                                       |
| CI            | [`verify.yml`](.github/workflows/verify.yml), [`codeql.yml`](.github/workflows/codeql.yml) | verify, profile, audit, gitleaks, bundle-secret check, container build, Playwright e2e, CodeQL                                                                                                             |

## Structure

- **Three packages, one direction of dependency:** `client → core ← server`. `core` imports
  nothing but Zod, and the architecture test fails the build if that changes.
- **Vocabularies are data.** Ages, conditions, activities, home features, pollutants and NAQI
  bands are typed constants listed once in `core/src/catalog/`; schemas, prompts, labels and the
  JSON Schema Gemini decodes against all read from them.
- **One schema, many uses.** Zod schemas for the air report, memory, advice and chat validate the
  server's answers, the browser's copy and the stored record; types are `z.infer`-ed from them.
- **The model proposes, the engine disposes.** Memory changes are a discriminated union applied
  by `applyChange`; the model's flat answer is mapped onto it and anything that does not fit is
  dropped.
- **Dependencies are injected:** the model, the air sources, the store, the messenger, both
  token verifiers, `fetch` and the clock are parameters, which is what makes 100% coverage
  possible without network. Google Cloud and Web Push bindings are one call each, tested against fakes.
- **One source for shared wording.** Hour labels (`labelHour`), AQI levels (`describeLevel`)
  and `capitalise` live once in the engine and are imported by the server's sentences and the
  client's cards alike, so the chat and the advice card can never phrase the same hour differently.
- **Cannot-happen branches are removed, not tested around.** Where coverage found a branch that
  could never run, the types were tightened instead (a non-empty station group, an editor that
  only accepts editable facts, a household that is always loaded where the chat lives).

## SOLID, where it shows

| Principle             | In this code                                                                                                                                                                                                                                                                                                                                                                                                                |
| :-------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single responsibility | One concern per module, held by the 110-line and 30-line limits: `nearest-station.ts` picks a station, `anchor-forecast.ts` blends, `advise-activity.ts` decides                                                                                                                                                                                                                                                            |
| Open/closed           | Activities, conditions, home features and tips are catalogue data; adding one is a new entry, and schemas, prompts and labels follow without code changes                                                                                                                                                                                                                                                                   |
| Liskov substitution   | One contract suite runs over every implementation: each `DocumentCollection` (in memory, and the Firestore adapter over a Firestore-faithful fake) and the user and account stores built on it, and each `Messenger` (the logging stand-in and Web Push) — [`store/substitutable.test.ts`](packages/server/src/store/substitutable.test.ts), [`push/substitutable.test.ts`](packages/server/src/push/substitutable.test.ts) |
| Interface segregation | Each router takes only what it uses (`airRouter(air)`, `authRouter({ mode, resolve, signIn })`, `chatRouter({ llm, air, store, now })`); `AirService` exposes `report` and `places`, nothing of its caches                                                                                                                                                                                                                  |
| Dependency inversion  | The domain depends on interfaces it owns (`LlmClient`, `UserStore`, `Messenger`, `SchedulerVerifier`); the SDK adapters in `gcp/bindings.ts` and `llm/gemini-client.ts` implement them, wired once in `index.ts`                                                                                                                                                                                                            |

## Layers

| Layer       | Where                                                     | May import                                  |
| :---------- | :-------------------------------------------------------- | :------------------------------------------ |
| Engine      | `packages/core`                                           | Zod only; no I/O, clock or randomness       |
| HTTP edge   | `server/src/app.ts`, `routes/`, `security/`, `static/`    | Express, the domain                         |
| Domain      | `server/src/chat/`, `air/`, `alerts/`, `guard/`, `store/` | the engine and interfaces it owns           |
| Adapters    | `server/src/gcp/bindings.ts`, `llm/gemini-client.ts`      | one vendor SDK each                         |
| Composition | `server/src/index.ts`                                     | everything, to wire it once                 |
| Browser     | `packages/client`                                         | React, Zod and the engine; never the server |

All of it is checked by [`architecture.test.ts`](tests/quality/architecture.test.ts).

## Conventions

- Every top-level function has a one-line `/** purpose */` comment.
- Names say what a value is for: `nearestStation`, `correctionRatio`, `cleanestWindow`,
  `staleIds`, `outputViolations`.
- Components stay small by splitting into named parts (`MessageLog`, `Composer`, `Chip`,
  `AlertOptions`, `PlaceColumn`).
- Conventional commits (`feat(core):`, `test(server):`, `docs:`).

## Documentation

The root holds one document per evaluation area with measured evidence:
[PROBLEM_ALIGNMENT.md](PROBLEM_ALIGNMENT.md), [SECURITY.md](SECURITY.md),
[ACCESSIBILITY.md](ACCESSIBILITY.md), [EFFICIENCY.md](EFFICIENCY.md), [TESTING.md](TESTING.md) and
this file. `docs/` holds the [architecture](docs/ARCHITECTURE.md), [decision records with costs](docs/decisions.md),
[assumptions and sources](docs/ASSUMPTIONS.md), the [AI design](docs/AI.md) and
[deployment](docs/DEPLOYMENT.md). Root [CONTRIBUTING.md](CONTRIBUTING.md) says where each kind of code goes.
