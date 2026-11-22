# Contributing

## Setup

```bash
npm install
cp .env.example packages/server/.env
npm run dev
```

Node 22 or later (CI uses 24). With no keys every flow still works locally: no sign-in (one local
household), replies from the engine's own sentences, forecast-only air. Add `AIR_DATA_MODE=fixture`
to work without network.

## Before you open a pull request

```bash
npm run verify   # format → lint → typecheck → 100% coverage → build
npm run e2e      # browser journeys, CSP, axe in light and dark
npm run profile  # when you touch the engine or a hot path
```

All three must pass. CI runs the same commands, plus `npm audit`, gitleaks, CodeQL and a check
that the client bundle carries no credentials.

## Where code goes

| Change                                                                  | Place                                                                                            |
| :---------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------- |
| A vocabulary, activity, AQI band or threshold                           | `packages/core/src/catalog/` (data, one list per file), with its source in `docs/ASSUMPTIONS.md` |
| Logic that computes a number, date or decision                          | `packages/core/src/` (pure, clock passed in)                                                     |
| A schema shared by client and server                                    | `packages/core/src/schemas/` (types via `z.infer`)                                               |
| An HTTP route, Gemini call, guard, upstream adapter or Firebase binding | `packages/server/src/`                                                                           |
| A screen or component                                                   | `packages/client/src/`                                                                           |
| A repository-wide standard                                              | `tests/quality/hygiene.test.ts`                                                                  |

## Standards

- Files ≤ 150 lines (data ≤ 250), functions ≤ 60 lines, complexity ≤ 10 — lint errors.
- A one-line doc comment on every function; names that say what a value is for.
- Every feature ships with tests and the matching doc update in the same commit.
- Conventional commits: `feat(core):`, `fix(server):`, `test:`, `a11y:`, `perf:`, `docs:`, `ci:`.
