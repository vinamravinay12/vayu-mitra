# Deployment

One container ([`Dockerfile`](../Dockerfile)) serves the API and the built client from the same
origin on **Google Cloud Run**, so the browser needs no CORS and the strict same-origin CSP holds.
The image is a two-stage `node:24-alpine` build that runs as the unprivileged `node` user with
production dependencies only.

## First deploy

```bash
P=<your-gcp-project-id>
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com --project $P
```

Store the Gemini key in Secret Manager (use the absolute path to your `.env`):

```bash
grep '^GEMINI_API_KEY=' /absolute/path/to/vayu-mitra/packages/server/.env | cut -d= -f2- | tr -d '\n' \
  | gcloud secrets create gemini-api-key --project $P --replication-policy=automatic --data-file=-
```

Let the Cloud Run service account read it:

```bash
gcloud secrets add-iam-policy-binding gemini-api-key --project $P \
  --member="serviceAccount:$(gcloud projects describe $P --format='value(projectNumber)')-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

Deploy:

```bash
gcloud run deploy vayu-mitra --source . --project $P --region asia-south1 \
  --allow-unauthenticated --set-secrets GEMINI_API_KEY=gemini-api-key:latest \
  --set-env-vars TRUST_PROXY_HOPS=1 --memory 512Mi --max-instances 5 --quiet
```

## Configuration

| Variable                         | Default                                                                | Meaning                                                         |
| :------------------------------- | :--------------------------------------------------------------------- | :-------------------------------------------------------------- |
| `GEMINI_API_KEY`                 | —                                                                      | Required in production (the server refuses to start without it) |
| `GEMINI_MODELS` / `GEMINI_MODEL` | `gemini-3.5-flash-lite,gemini-flash-lite-latest,gemini-3.1-flash-lite` | Replace the fallback chain, or move one model to the front      |
| `TRUST_PROXY_HOPS`               | `1`                                                                    | Proxies in front of the app (Cloud Run has one)                 |
| `AI_REQUESTS_PER_MINUTE`         | `10`                                                                   | AI requests per client address per minute                       |
| `AIR_DATA_MODE`                  | `live`                                                                 | `fixture` for offline demos and CI; refused in production       |
| `ALLOWED_ORIGIN`                 | same-origin                                                            | Only if the API is called from another origin                   |
| `PORT`                           | `8080`                                                                 | Set by Cloud Run                                                |

## After deploying

1. `curl https://<service-url>/api/health` → `{"status":"ok","mode":"gemini","airData":"live"}`.
2. Describe a household and confirm a real extraction; ask the coach for an explanation.
3. Try a blatant and a paraphrased injection; both should be refused.
4. Read the Cloud Run logs to confirm which model answered and how long it took.
