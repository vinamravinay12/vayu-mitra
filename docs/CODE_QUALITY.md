# Code quality

Standards are encoded in configuration and tests, so they hold on every commit rather than by
good intentions.

## Gates

| Gate          | Where                                                                                            | Rule                                                                                                                                                                   |
| :------------ | :----------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Formatting    | [`.prettierrc.json`](../.prettierrc.json)                                                        | `prettier --check .` in `npm run verify`                                                                                                                               |
| Lint          | [`eslint.config.js`](../eslint.config.js)                                                        | `typescript-eslint` **strict-type-checked** + stylistic; `--max-warnings 0`                                                                                            |
| Size          | same                                                                                             | `max-lines` 150 per file (catalogue data 250, never off), `max-lines-per-function` 60                                                                                  |
| Complexity    | same                                                                                             | `complexity` 10, `max-depth` 3, `max-params` 4                                                                                                                         |
| Safety        | same                                                                                             | `eqeqeq`, `no-console` (one logger module exempt, with a reason)                                                                                                       |
| Accessibility | same                                                                                             | `jsx-a11y` strict and `react-hooks` as errors                                                                                                                          |
| Types         | [`tsconfig.base.json`](../tsconfig.base.json)                                                    | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `noUnusedLocals/Parameters`; built with `tsc -b` across project references |
| Coverage      | [`vitest.config.ts`](../vitest.config.ts)                                                        | 100% statements, branches, functions and lines with `all: true`                                                                                                        |
| Dead code     | [`knip.json`](../knip.json)                                                                      | `knip --include-entry-exports` in `npm run verify`: no unused file, dependency or export, including the engine's public API                                            |
| Hygiene       | [`hygiene.test.ts`](../tests/quality/hygiene.test.ts)                                            | doc comment on every top-level function, no generic names, no `any`, no unexplained lint suppressions, no TODOs, no secrets, required docs present                     |
| CI            | [`verify.yml`](../.github/workflows/verify.yml), [`codeql.yml`](../.github/workflows/codeql.yml) | verify, profile, audit, gitleaks, bundle-secret check, container build, Playwright e2e, CodeQL                                                                         |

## Structure

- **Three packages, one direction of dependency:** `client → core ← server`. `core` imports
  nothing but Zod.
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

## Conventions

- Every top-level function has a one-line `/** purpose */` comment.
- Names say what a value is for: `nearestStation`, `correctionRatio`, `cleanestWindow`,
  `staleIds`, `outputViolations`.
- Components stay small by splitting into named parts (`MessageLog`, `Composer`, `Chip`,
  `AlertOptions`, `PlaceColumn`).
- Conventional commits (`feat(core):`, `test(server):`, `docs:`).

## Documentation

`docs/` holds the [architecture](ARCHITECTURE.md), [decision records with costs](decisions.md),
[assumptions and sources](ASSUMPTIONS.md), and one document per evaluation area with measured
evidence. Root [CONTRIBUTING.md](../CONTRIBUTING.md) says where each kind of code goes.
