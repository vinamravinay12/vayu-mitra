# Security policy

## Reporting a vulnerability

Please open a private security advisory on this repository (GitHub → Security → Report a
vulnerability) rather than a public issue. Expect an acknowledgement within 72 hours.

## Supported versions

Only the deployed `main` branch is supported.

## How this project protects users

- The Gemini key lives only on the server, in Google Secret Manager; production refuses to
  start without it, and CI fails if a key-shaped string reaches the client bundle.
- Every request body is validated with Zod and capped at 16 KB; errors are sanitised.
- Untrusted text is screened by a pattern pre-check and an independent LLM judge, then fenced
  before it reaches a prompt. Model output is validated against closed vocabularies, and every
  number in an AI explanation must come from the engine's own plan, or the answer is not shown.
- The server rebuilds every plan it explains from its own forecast; numbers from the browser
  are never trusted. Location is rounded to ~1 km before it leaves the server.
- No account and no server-side storage of household or health details: the plan lives in the
  family's own browser and is re-validated when restored.
- Rate limiting keys on the client address resolved through a fixed number of trusted proxy
  hops, so a forged `X-Forwarded-For` cannot bypass it.
- Strict Content-Security-Policy with no inline script, HSTS, COOP/CORP, `nosniff`.
- Logs are structured and never contain user text.

Details and tests: [docs/SECURITY.md](docs/SECURITY.md).
