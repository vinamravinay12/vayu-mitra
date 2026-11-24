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
- **Writes only from our own page.** Every write must carry our own `Sec-Fetch-Site`/`Origin`
  and a JSON body, so no other site's form or script can act for a signed-in family (on top of
  SameSite=Strict). Every body and stored record is a strict schema: an unknown field is refused.
- **Hidden text is removed.** Zero-width, bidirectional-override and Unicode tag characters are
  stripped from the message and history before any check or the model reads them.
- **Hardening.** Bodies capped at 32 KB; sanitised errors; rate limits on a proxy-resolved client
  address; a strict CSP with no inline script, no third-party hosts and Trusted Types required;
  COOP and COEP isolation, CORP, HSTS with preload, `nosniff`, a Permissions-Policy that turns off
  every browser feature but geolocation; logs never contain user text or credentials.
- **Supply chain.** `npm ci` from the lockfile, `npm audit` and gitleaks in CI, dependency review
  on every pull request, Dependabot weekly, and every GitHub Action pinned to a commit SHA (a test
  fails on a tag).

## Threats, controls and the tests that prove them

| Threat                                  | Control                                                                                                                                         | Tested in                                                              |
| :-------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------- |
| One family reads another's data         | Signed session cookie on every personal route; the user id comes only from it                                                                   | `app.test.ts` "keeps each family's record to itself"                   |
| Forged, edited or stale sessions        | HMAC-SHA256 over the claims, constant-time comparison, expiry, account generation checked on every request; 401 otherwise                       | `auth/auth.test.ts`, `app.test.ts`                                     |
| Password theft from the database        | scrypt (N = 2¹⁵, r = 8, p = 1), 16-byte salt per account, parameters stored with each hash; a corrupt hash fails closed                         | `auth/auth.test.ts`                                                    |
| Password guessing                       | 10 sign-in attempts per minute per client; passwords of at least 10 characters                                                                  | `app.test.ts`, `security/rate-limit.test.ts`                           |
| Account enumeration                     | One message for a wrong email or password; a decoy hash so both take the same time                                                              | `auth/auth.test.ts`, `app.test.ts`                                     |
| Session theft by script or another site | `__Host-` cookie, HttpOnly, Secure, SameSite=Strict; no token in page JavaScript                                                                | `app.test.ts`, e2e                                                     |
| Anyone triggers the alert run           | Google OIDC token, our audience, the scheduler's account, `email_verified`; otherwise 404; route absent when unconfigured                       | `app.test.ts`, `gcp/bindings.test.ts`                                  |
| Server-side request forgery via push    | Subscriptions only for https endpoints on known browser push services                                                                           | `app.test.ts` "refuses push endpoints outside the known push services" |
| Prompt injection                        | Patterns, then an independent judge; fencing; schema-constrained output; the engine applies changes; chips visible                              | `chat/chat.test.ts`, `guard/*.test.ts`                                 |
| Model invents numbers or links          | Grounding check; engine sentence used instead                                                                                                   | `chat/check-grounding.test.ts`, `chat/chat.test.ts`                    |
| Key leaks                               | Keys only in Secret Manager and the server; no key-shaped strings in the repo (hygiene test, gitleaks); CI greps the client bundle              | `tests/quality/hygiene.test.ts`, CI                                    |
| Malformed or huge input                 | Zod on every body and query; 32 KB cap; sanitised 400/413/500                                                                                   | `app.test.ts`                                                          |
| Quota abuse                             | Per-client rate limits (chat 10/min, sign-in 10/min, data 60/min) keyed on the proxy-resolved address                                           | `security/rate-limit.test.ts`, `app.test.ts`                           |
| Corrupt stored data                     | Every stored record re-validated on read; invalid writes refused                                                                                | `store/store.test.ts`                                                  |
| XSS, framing                            | CSP: `script-src 'self'`, no inline script, no third-party hosts, `frame-ancestors 'none'`; React escaping; no HTML from strings (hygiene test) | `app.test.ts`, e2e                                                     |
| Cross-site request forgery              | Every write must come from our own page (`Sec-Fetch-Site`, `Origin`) and be JSON, so no HTML form can send one; 403/415 otherwise               | `security/hardening.test.ts`, e2e                                      |
| Mass assignment, smuggled fields        | Strict Zod objects on every body and stored record: an unknown key is a 400, never stored                                                       | `security/hardening.test.ts`                                           |
| Hidden instructions in text             | Zero-width, bidirectional and tag characters removed from the message and history before any check or the model reads them                      | `security/hardening.test.ts`                                           |
| DOM XSS through script sinks            | Trusted Types required with no policy allowed, so `eval`, `innerHTML` and the like are blocked in the browser; Zod runs without `eval`          | `security/hardening.test.ts`, `jitless.test.ts`, e2e                   |
| Cross-origin leaks, unused features     | COOP and COEP isolate the page; Permissions-Policy turns off 18 features and keeps geolocation for our own page; HSTS two years, preload        | `security/hardening.test.ts`, e2e                                      |
| Compromised dependency or Action        | Lockfile `npm ci`, `npm audit`, dependency review on every PR, Dependabot weekly, every Action pinned to a commit SHA                           | `tests/quality/supply-chain.test.ts`, CI                               |
| Location privacy                        | Coordinates rounded to ~1 km before any upstream call or storage; device location only on tap                                                   | `air/adapters.test.ts`, `PlacePicker.test.tsx`                         |

### Data kept

Per family, in Firestore `users/{uid}`: memory chips, place, alert settings, alert state, up to
five push subscriptions, `updatedAt`. Per account, in `accounts/{uid}`: the email, the scrypt hash,
the session generation and when it was created; `account-emails/{sha256(email)}` maps an email to
its account. No names beyond how the family refers to someone, no conversation. `DELETE /api/me`
removes all three.

### Access to Firestore

The browser never talks to Firestore. Only the app's own `vayu-mitra-run` service account can, with
`roles/datastore.user` and nothing else; it can read only the secrets the app uses.
