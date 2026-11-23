# Deployment

Everything runs on **Google Cloud**: one container on **Cloud Run** serves the API and the client
from one origin; **Firestore** holds accounts and families' records; **Secret Manager** holds every
key; **Cloud Scheduler** runs the alert check. Push alerts use the browsers' standard **Web Push**.
No Firebase, no other providers.

## Deploy with one script

In [Cloud Shell](https://shell.cloud.google.com) (already signed in as you):

```bash
git clone https://github.com/vinamravinay12/vayu-mitra && cd vayu-mitra
bash scripts/deploy-gcp.sh gen-lang-client-0308156900
```

It asks for the **Gemini API key** once (from [AI Studio](https://aistudio.google.com/apikey)),
and optionally a data.gov.in key and a WAQI token; input is hidden and goes straight into Secret
Manager. Everything else it creates itself:

| Step      | What it does                                                                                                                                                                          |
| :-------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| APIs      | Enables Cloud Run, Cloud Build, Artifact Registry, Secret Manager, Firestore, Cloud Scheduler, IAM                                                                                    |
| Firestore | Creates the `(default)` database in native mode in `asia-south1`, if absent                                                                                                           |
| Secrets   | `gemini-api-key` (asked), `session-secret` (48 random bytes), `vapid-private-key` and `vapid-public-key` (a fresh Web Push key pair), optional `data-gov-in-api-key` and `waqi-token` |
| Identity  | A `vayu-mitra-run` service account with only `datastore.user` and read access to those secrets                                                                                        |
| Deploy    | `gcloud run deploy --source .` with the secrets, `STORE=firestore` and the VAPID contact (your account's email)                                                                       |
| Alerts    | A `vayu-scheduler` service account and a `vayu-alerts` job every 30 minutes with an OIDC token for the service's URL                                                                  |
| Check     | Prints `/api/health` and the URL                                                                                                                                                      |

Running it again redeploys the current code and keeps every secret and key. To change a key, add
a new version (`printf '%s' "$KEY" | gcloud secrets versions add gemini-api-key --data-file=-`)
and run the script again.

Production refuses to start without `GEMINI_API_KEY`, `SESSION_SECRET` and `STORE=firestore`,
or with fixture air.

## After deploying

1. `/api/health` shows `mode: gemini`, `airData: live`, `auth: password`, `store: firestore`,
   `push: true`, `alerts: true`, and `stations` for whichever station keys you gave.
2. Create an account, pick a place: the air card names a station and its reading time.
3. Ask “Dadi has asthma and walks at 6:30. Is it OK today?”: chips appear and the advice card
   names Dadi.
4. Turn alerts on (allow notifications), then
   `gcloud scheduler jobs run vayu-alerts --location asia-south1`; the logs show
   `alert run finished`.
5. Sign out, try a wrong password, sign in again; delete the data and confirm the email can
   no longer sign in.

## Configuration reference

| Variable                                                 | Default                                | Meaning                                                                                             |
| :------------------------------------------------------- | :------------------------------------- | :-------------------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY`                                         | —                                      | Required in production                                                                              |
| `GEMINI_MODELS` / `GEMINI_MODEL`                         | 3.8 Flash → 3.6 Flash → 3.5 Flash-Lite | Replace the fallback chain, or move one model first                                                 |
| `SESSION_SECRET`                                         | —                                      | Signs session cookies (≥ 32 characters); required in production; without it locally, sign-in is off |
| `STORE`                                                  | `memory`                               | `firestore` in production (required); `memory` loses records on restart                             |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | —                                      | Web Push; all three or none; without them alerts are not offered                                    |
| `DATA_GOV_IN_API_KEY`, `WAQI_TOKEN`                      | —                                      | Station feeds; without both, reports are forecast-only                                              |
| `SCHEDULER_AUDIENCE`, `SCHEDULER_SERVICE_ACCOUNT`        | —                                      | Both or neither; without them the alert route does not exist                                        |
| `TRUST_PROXY_HOPS`                                       | `1`                                    | Proxies in front of the app (Cloud Run has one)                                                     |
| `AI_REQUESTS_PER_MINUTE`                                 | `10`                                   | Chat requests per client address per minute                                                         |
| `AUTH_REQUESTS_PER_MINUTE`                               | `10`                                   | Sign-in and sign-up attempts per client address per minute                                          |
| `AIR_DATA_MODE`                                          | `live`                                 | `fixture` for demos and CI; refused in production                                                   |
| `PORT`                                                   | `8080`                                 | Set by Cloud Run                                                                                    |
