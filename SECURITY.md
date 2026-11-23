# Security policy

## Reporting a vulnerability

Please open a private security advisory on this repository (GitHub → Security → Report a
vulnerability) rather than a public issue. Expect an acknowledgement within 72 hours.

## Supported versions

Only the deployed `main` branch is supported.

## How this project protects users

- **Accounts and isolation.** Email and password; passwords hashed with scrypt (N = 2¹⁵) and a
  per-account salt; one error for a wrong email or a wrong password, with a decoy hash so the two
  take the same time. Sessions are HMAC-signed tokens in a `__Host-` cookie that is HttpOnly,
  Secure and SameSite=Strict. Every personal route (`/api/me*`, `/api/chat`) needs one; the user id
  comes only from it, so one family can never read or change another's record. Deleting the
  account ends its sessions at once. Sign-in attempts are rate limited per client.
- **The scheduler route is invisible.** `/api/internal/check-alerts` answers 404 unless the
  request carries a Google-signed OIDC token for this service's audience, issued to the
  scheduler's own service account; it does not exist at all when the scheduler is not configured.
- **Keys stay on the server.** Gemini, data.gov.in, WAQI, the session-signing key and the Web
  Push private key live only in Secret Manager and the server's environment. The client bundle
  carries none (CI checks), and the repository carries no key-shaped strings (a hygiene test).
- **Model input and output are constrained.** User text is screened by patterns and an
  independent Gemini judge, then fenced. Answers are schema-constrained to the engine's closed
  vocabularies and re-validated; the engine, not the model, applies memory changes. A reply with a
  number the facts do not contain, a link or instruction-like text is never shown.
- **Minimal data.** Stored per family: the memory chips, the chosen place (rounded to ~1 km),
  alert settings and the devices' push subscriptions. Never the conversation. One request deletes it all.
- **Push cannot be aimed elsewhere.** A push subscription is accepted only if its endpoint is
  https on a known browser push service (FCM, Mozilla, Apple, Windows), so the server can never be
  made to send requests to an internal address.
- **Hardening.** Bodies capped at 32 KB and validated with Zod; sanitised errors; rate limits on
  a proxy-resolved client address; a strict CSP with no inline script and no third-party hosts;
  HSTS, COOP, CORP, `nosniff`; logs never contain user text or credentials.

Details and tests: [docs/SECURITY.md](docs/SECURITY.md).
