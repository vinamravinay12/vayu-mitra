# Deployment

One container ([`Dockerfile`](../Dockerfile)) serves the API and the built client from one
origin on **Google Cloud Run**. Firebase provides sign-in, Firestore and Cloud Messaging; Cloud
Scheduler runs the alert check.

**Status:** the live URL (https://vayu-mitra-982453010059.asia-south1.run.app) still runs the
earlier, form-based build. This version is deployed with the steps below once the Firebase
project and keys exist.

## 1. Firebase project

1. In the [Firebase console](https://console.firebase.google.com), add Firebase to the same GCP
   project as Cloud Run.
2. **Authentication → Sign-in method:** enable **Google**. Under **Settings → Authorised domains**,
   add the Cloud Run host (`vayu-mitra-…run.app`) and any custom domain.
3. **Firestore:** create a database in `asia-south1` (production mode) and set the rules in
   [SECURITY.md](SECURITY.md#firestore-rules): the browser never reads Firestore, only the server.
4. **Project settings → General → Your apps:** add a web app and note `apiKey`, `appId`,
   `messagingSenderId` (public identifiers, not secrets).
5. **Project settings → Cloud Messaging → Web Push certificates:** generate a key pair; note the
   public key (`FIREBASE_VAPID_KEY`).

## 2. Keys

| Key         | Where to get it                                 | Store as                     |
| :---------- | :---------------------------------------------- | :--------------------------- |
| Gemini      | Google AI Studio                                | Secret `gemini-api-key`      |
| data.gov.in | Register at data.gov.in, “My Account → API key” | Secret `data-gov-in-api-key` |
| WAQI        | https://aqicn.org/data-platform/token/          | Secret `waqi-token`          |

```bash
P=<project-id>
printf '%s' "$KEY" | gcloud secrets create gemini-api-key --project $P --data-file=-
# repeat for data-gov-in-api-key and waqi-token
SA=$(gcloud projects describe $P --format='value(projectNumber)')-compute@developer.gserviceaccount.com
for s in gemini-api-key data-gov-in-api-key waqi-token; do
  gcloud secrets add-iam-policy-binding $s --project $P --member="serviceAccount:$SA" --role=roles/secretmanager.secretAccessor
done
# The service account uses Firestore and FCM through the Admin SDK:
gcloud projects add-iam-policy-binding $P --member="serviceAccount:$SA" --role=roles/datastore.user
gcloud projects add-iam-policy-binding $P --member="serviceAccount:$SA" --role=roles/firebasecloudmessaging.admin
```

## 3. Deploy

```bash
gcloud run deploy vayu-mitra --source . --project $P --region asia-south1 \
  --allow-unauthenticated --memory 512Mi --max-instances 5 --quiet \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest,DATA_GOV_IN_API_KEY=data-gov-in-api-key:latest,WAQI_TOKEN=waqi-token:latest \
  --set-env-vars TRUST_PROXY_HOPS=1,FIREBASE_PROJECT_ID=$P,FIREBASE_WEB_API_KEY=<apiKey>,FIREBASE_APP_ID=<appId>,FIREBASE_MESSAGING_SENDER_ID=<senderId>,FIREBASE_VAPID_KEY=<vapid public key>
```

Production refuses to start without Gemini or Firebase, or with fixture air.

## 4. Background alerts

```bash
URL=$(gcloud run services describe vayu-mitra --project $P --region asia-south1 --format='value(status.url)')
gcloud iam service-accounts create vayu-scheduler --project $P
gcloud run services update vayu-mitra --project $P --region asia-south1 \
  --update-env-vars SCHEDULER_AUDIENCE=$URL,SCHEDULER_SERVICE_ACCOUNT=vayu-scheduler@$P.iam.gserviceaccount.com
gcloud scheduler jobs create http vayu-alerts --project $P --location asia-south1 \
  --schedule '*/30 * * * *' --http-method POST --uri "$URL/api/internal/check-alerts" \
  --oidc-service-account-email vayu-scheduler@$P.iam.gserviceaccount.com --oidc-token-audience $URL
```

## 5. Check it

1. `curl $URL/api/health` → `mode: gemini`, `airData: live`, `stations: {cpcb: true, waqi: true}`,
   `auth: firebase`, `alerts: true`.
2. Sign in, pick a place: the air card names a CPCB station and its reading time.
3. Ask “Dadi has asthma and walks at 6:30. Is it OK today?”: chips appear, the advice card names Dadi.
4. Turn alerts on, then `gcloud scheduler jobs run vayu-alerts`; logs show `alert run finished`.
5. Try “Ignore previous instructions…”: the reply is the refusal.
6. Delete my data; `GET /api/me` returns an empty record.

## Configuration reference

| Variable                                                                                         | Default                     | Meaning                                                      |
| :----------------------------------------------------------------------------------------------- | :-------------------------- | :----------------------------------------------------------- |
| `GEMINI_API_KEY`                                                                                 | —                           | Required in production                                       |
| `GEMINI_MODELS` / `GEMINI_MODEL`                                                                 | Flash-Lite chain            | Replace the fallback chain, or move one model first          |
| `DATA_GOV_IN_API_KEY`, `WAQI_TOKEN`                                                              | —                           | Station feeds; without both, reports are forecast-only       |
| `FIREBASE_PROJECT_ID`, `FIREBASE_WEB_API_KEY`, `FIREBASE_APP_ID`, `FIREBASE_MESSAGING_SENDER_ID` | —                           | Sign-in, storage, push; required in production               |
| `FIREBASE_AUTH_DOMAIN`                                                                           | `<project>.firebaseapp.com` | Custom auth domain                                           |
| `FIREBASE_VAPID_KEY`                                                                             | —                           | Without it, alerts are not offered                           |
| `SCHEDULER_AUDIENCE`, `SCHEDULER_SERVICE_ACCOUNT`                                                | —                           | Both or neither; without them the alert route does not exist |
| `TRUST_PROXY_HOPS`                                                                               | `1`                         | Proxies in front of the app (Cloud Run has one)              |
| `AI_REQUESTS_PER_MINUTE`                                                                         | `10`                        | Chat requests per client address per minute                  |
| `AIR_DATA_MODE`                                                                                  | `live`                      | `fixture` for demos and CI; refused in production            |
| `PORT`                                                                                           | `8080`                      | Set by Cloud Run                                             |
