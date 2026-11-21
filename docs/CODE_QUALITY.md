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
| Hygiene       | [`hygiene.test.ts`](../tests/quality/hygiene.test.ts)                                            | doc comment on every top-level function, no generic names, no `any`, no unexplained lint suppressions, no TODOs, no secrets, required docs present                     |
| CI            | [`verify.yml`](../.github/workflows/verify.yml), [`codeql.yml`](../.github/workflows/codeql.yml) | verify, profile, audit, gitleaks, bundle-secret check, container build, Playwright e2e, CodeQL                                                                         |

## Structure

- **Three packages, one direction of dependency:** `client → core ← server`. `core` imports
  nothing but Zod.
- **Knowledge is data.** Every factor, band, action, alert and community drive is a typed
  constant in `core/src/catalog/`, one list per file, evaluated by one condition evaluator.
- **One schema, many uses.** The Zod profile schema validates the form, the server boundary and
  the saved session; TypeScript types are `z.infer`-ed from it, so they cannot drift.
- **Shared limits defined once** (`PROFILE_LIMITS`, `TEXT_LIMITS`, `RANKING`) and read by schema,
  prompt and UI.
- **Effects are a discriminated union** handled exhaustively by `applyEffect`, so adding an
  effect kind without handling it is a compile error.
- **Dependencies are injected:** the model client, the air source, `fetch`, the clock and the
  rate-limit clock are parameters, which is what makes 100% coverage possible without network.

## Conventions

- Every function — exported or internal — has a one-line `/** purpose */` comment.
- Names say what a value is for: `cleanestFreeHour`, `weightedReductionPercent`,
  `pm25GramsSeasonSaved`, `outputViolations`.
- Exports only what another module imports; components stay small by splitting into named parts
  (`Identity`, `Daytime`, `Exercise` in `MemberFields`).
- Conventional commits (`feat(core):`, `test:`, `a11y:`, `perf:`, `docs:`).

## Documentation

`docs/` holds the [architecture](ARCHITECTURE.md), [decision records with costs](decisions.md),
[model assumptions and sources](ASSUMPTIONS.md), and one document per evaluation area with
measured evidence. Root [CONTRIBUTING.md](../CONTRIBUTING.md) says where each kind of code goes.
