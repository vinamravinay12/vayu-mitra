#!/usr/bin/env bash
# Deploys Vayu Mitra to Google Cloud: Cloud Run, Firestore, Secret Manager and
# Cloud Scheduler. Run it from the repository root in Cloud Shell, where you are
# already signed in:
#
#   bash scripts/deploy-gcp.sh [project-id]
#
# Safe to run again: existing secrets, keys, accounts and jobs are reused, and
# a re-run redeploys the current code.
set -euo pipefail

PROJECT="${1:-gen-lang-client-0308156900}"
REGION="${REGION:-asia-south1}"
SERVICE="${SERVICE:-vayu-mitra}"
RUN_SA="vayu-mitra-run@${PROJECT}.iam.gserviceaccount.com"
SCHEDULER_SA="vayu-scheduler@${PROJECT}.iam.gserviceaccount.com"

say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }

gcloud config set project "$PROJECT" >/dev/null

say "Enabling the APIs"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com firestore.googleapis.com \
  cloudscheduler.googleapis.com iam.googleapis.com

say "Firestore (native mode, ${REGION})"
if ! gcloud firestore databases describe --database='(default)' >/dev/null 2>&1; then
  gcloud firestore databases create --database='(default)' --location="$REGION" --type=firestore-native
fi

# Creates a secret from stdin, unless it already exists.
ensure_secret() {
  local name="$1"
  if gcloud secrets describe "$name" >/dev/null 2>&1; then
    cat >/dev/null
    echo "  ${name}: kept"
  else
    gcloud secrets create "$name" --replication-policy=automatic --data-file=- >/dev/null
    echo "  ${name}: created"
  fi
}

say "Secrets"
if ! gcloud secrets describe gemini-api-key >/dev/null 2>&1; then
  read -rsp "Gemini API key (from aistudio.google.com, input hidden): " GEMINI_KEY; echo
  printf '%s' "$GEMINI_KEY" | ensure_secret gemini-api-key
  unset GEMINI_KEY
else
  echo "  gemini-api-key: kept"
fi
openssl rand -base64 48 | tr -d '\n' | ensure_secret session-secret
if ! gcloud secrets describe vapid-private-key >/dev/null 2>&1; then
  KEYS="$(npx --yes web-push@3.6.7 generate-vapid-keys --json)"
  node -e 'process.stdout.write(JSON.parse(process.argv[1]).privateKey)' "$KEYS" | ensure_secret vapid-private-key
  node -e 'process.stdout.write(JSON.parse(process.argv[1]).publicKey)' "$KEYS" | ensure_secret vapid-public-key
  unset KEYS
else
  echo "  vapid-private-key, vapid-public-key: kept"
fi
for optional in data-gov-in-api-key:"data.gov.in API key for CPCB stations" waqi-token:"WAQI token"; do
  name="${optional%%:*}"
  if ! gcloud secrets describe "$name" >/dev/null 2>&1; then
    read -rsp "${optional#*:} (Enter to skip, input hidden): " VALUE; echo
    if [ -n "$VALUE" ]; then printf '%s' "$VALUE" | ensure_secret "$name"; fi
    unset VALUE
  fi
done

say "Service account the app runs as (least privilege)"
if ! gcloud iam service-accounts describe "$RUN_SA" >/dev/null 2>&1; then
  gcloud iam service-accounts create vayu-mitra-run --display-name="Vayu Mitra on Cloud Run"
fi
gcloud projects add-iam-policy-binding "$PROJECT" --member="serviceAccount:${RUN_SA}" \
  --role=roles/datastore.user --condition=None >/dev/null
SECRETS="GEMINI_API_KEY=gemini-api-key:latest,SESSION_SECRET=session-secret:latest"
SECRETS+=",VAPID_PRIVATE_KEY=vapid-private-key:latest,VAPID_PUBLIC_KEY=vapid-public-key:latest"
for pair in DATA_GOV_IN_API_KEY=data-gov-in-api-key WAQI_TOKEN=waqi-token; do
  if gcloud secrets describe "${pair#*=}" >/dev/null 2>&1; then SECRETS+=",${pair}:latest"; fi
done
for secret in $(echo "$SECRETS" | tr ',' '\n' | sed 's/.*=\(.*\):latest/\1/'); do
  gcloud secrets add-iam-policy-binding "$secret" --member="serviceAccount:${RUN_SA}" \
    --role=roles/secretmanager.secretAccessor >/dev/null
done

say "Building and deploying to Cloud Run (a few minutes)"
CONTACT="$(gcloud config get-value account 2>/dev/null)"
gcloud run deploy "$SERVICE" --source . --region "$REGION" --service-account "$RUN_SA" \
  --allow-unauthenticated --memory 512Mi --max-instances 5 --quiet \
  --set-secrets "$SECRETS" \
  --set-env-vars "STORE=firestore,TRUST_PROXY_HOPS=1,VAPID_SUBJECT=mailto:${CONTACT}"
URL="$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')"

say "Background alerts every 30 minutes (Cloud Scheduler, OIDC)"
if ! gcloud iam service-accounts describe "$SCHEDULER_SA" >/dev/null 2>&1; then
  gcloud iam service-accounts create vayu-scheduler --display-name="Vayu Mitra alert scheduler"
fi
gcloud run services update "$SERVICE" --region "$REGION" --quiet \
  --update-env-vars "SCHEDULER_AUDIENCE=${URL},SCHEDULER_SERVICE_ACCOUNT=${SCHEDULER_SA}" >/dev/null
JOB_FLAGS=(--location "$REGION" --schedule '*/30 * * * *' --http-method POST
  --uri "${URL}/api/internal/check-alerts"
  --oidc-service-account-email "$SCHEDULER_SA" --oidc-token-audience "$URL")
if gcloud scheduler jobs describe vayu-alerts --location "$REGION" >/dev/null 2>&1; then
  gcloud scheduler jobs update http vayu-alerts "${JOB_FLAGS[@]}" >/dev/null
else
  gcloud scheduler jobs create http vayu-alerts "${JOB_FLAGS[@]}" >/dev/null
fi

say "Checking"
curl -fsS "${URL}/api/health"; echo
echo
echo "Vayu Mitra is live at ${URL}"
