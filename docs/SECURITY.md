# Security, in detail

| Threat                          | Control                                                                                                                                                           | Tested in                                            |
| :------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------- |
| One family reads another's data | ID token verified on every personal route; uid only from the token                                                                                                | `app.test.ts` "keeps each family's record to itself" |
| Forged or missing sign-in       | 401 for no token, a malformed header, an over-long or invalid token                                                                                               | `app.test.ts` "requires a valid token"               |
| Anyone triggers the alert run   | Google OIDC token, our audience, the scheduler's account, `email_verified`; otherwise 404; route absent when unconfigured                                         | `app.test.ts`, `firebase/bindings.test.ts`           |
| Prompt injection                | Patterns, then an independent judge; fencing; schema-constrained output; engine applies changes; chips visible                                                    | `chat/chat.test.ts`, `guard/*.test.ts`               |
| Model invents numbers or links  | Grounding check; engine sentence used instead                                                                                                                     | `chat/check-grounding.test.ts`, `chat/chat.test.ts`  |
| Key leaks                       | Server-only keys; no key-shaped strings in the repo (hygiene test, gitleaks); CI greps the client bundle                                                          | `tests/quality/hygiene.test.ts`, CI                  |
| Malformed or huge input         | Zod on every body and query; 32 KB cap; sanitised 400/413/500                                                                                                     | `app.test.ts`                                        |
| Quota abuse                     | Per-client rate limits (chat 10/min, data 60/min) keyed on the proxy-resolved address                                                                             | `security/rate-limit.test.ts`, `app.test.ts`         |
| Corrupt stored data             | Every stored record re-validated on read; invalid writes refused                                                                                                  | `store/store.test.ts`                                |
| XSS, framing                    | CSP: `script-src 'self'` (+ `apis.google.com` only with sign-in), no inline script, `frame-ancestors 'none'`; React escaping; no HTML from strings (hygiene test) | `app.test.ts`, e2e                                   |
| Sign-in popup vs isolation      | COOP `same-origin-allow-popups` only when sign-in is on; `same-origin` otherwise                                                                                  | `app.test.ts`                                        |
| Location privacy                | Coordinates rounded to ~1 km before any upstream call or storage; device location only on tap                                                                     | `air/adapters.test.ts`, `PlacePicker.test.tsx`       |

## Data kept

Per family, in Firestore `users/{uid}`: memory chips, place, alert settings, alert state, up to
five Firebase Installation IDs, `updatedAt`. No names beyond how the family refers to someone, no
e-mail, no conversation. `DELETE /api/me` removes the document.

## Firestore rules

The browser never talks to Firestore; only the server does, with its service account. Deny all
client access:

```
rules_version = '2';
service cloud.firestore { match /databases/{database}/documents { match /{document=**} { allow read, write: if false; } } }
```
