# Security policy

## Reporting a vulnerability

Please open a private security advisory on this repository (GitHub → Security → Report a
vulnerability) rather than a public issue. Expect an acknowledgement within 72 hours.

## Supported versions

Only the deployed `main` branch is supported.

## How this project protects users

- **Sign-in and isolation.** Every personal route (`/api/me*`, `/api/chat`) needs a Firebase ID
  token that the server verifies; the user id comes only from that token, never from the request,
  so one family can never read or change another's record.
- **The scheduler route is invisible.** `/api/internal/check-alerts` answers 404 unless the
  request carries a Google-signed OIDC token for this service's audience, issued to the
  scheduler's own service account; it does not exist at all when the scheduler is not configured.
- **Keys stay on the server.** Gemini, data.gov.in and WAQI keys are server-side only (Secret
  Manager in production). The Firebase web config is public by design and served at runtime, so
  no key-shaped string is committed; CI fails if one reaches the client bundle.
- **Model input and output are constrained.** User text is screened by patterns and an
  independent Gemini judge, then fenced. Answers are schema-constrained to the engine's closed
  vocabularies and re-validated; the engine, not the model, applies memory changes. A reply with a
  number the facts do not contain, a link or instruction-like text is never shown.
- **Minimal data.** Stored per family: the memory chips, the chosen place (rounded to ~1 km),
  alert settings and device installation ids. Never the conversation. One request deletes it all.
- **Hardening.** Bodies capped at 32 KB and validated with Zod; sanitised errors; rate limits on
  a proxy-resolved client address; strict CSP with no inline script, opened only for the Google
  sign-in hosts when sign-in is on; HSTS, COOP, CORP, `nosniff`; logs never contain user text.

Details and tests: [docs/SECURITY.md](docs/SECURITY.md).
