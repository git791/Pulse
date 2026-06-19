#!/bin/bash
set -e

# ============================================
# Pulse — Cloud Run Deployment Script
# ============================================
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# Prerequisites:
#   1. Google Cloud CLI installed: https://cloud.google.com/sdk/docs/install
#   2. Authenticated: gcloud auth login
#   3. Project set: gcloud config set project YOUR_PROJECT_ID
#   4. APIs enabled:
#      gcloud services enable run.googleapis.com
#      gcloud services enable cloudbuild.googleapis.com
#      gcloud services enable artifactregistry.googleapis.com
#   5. .env file created from .env.example with your values
#
# ============================================

# Load .env if it exists
if [ -f .env ]; then
  echo "📂 Loading environment from .env..."
  export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
fi

# Configuration with defaults
PROJECT_ID=${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}
REGION=${GCP_REGION:-us-central1}
SERVICE=${CLOUD_RUN_SERVICE:-pulse}
MEMORY=${CLOUD_RUN_MEMORY:-256Mi}
CPU=${CLOUD_RUN_CPU:-1}
MIN_INSTANCES=${CLOUD_RUN_MIN_INSTANCES:-0}
MAX_INSTANCES=${CLOUD_RUN_MAX_INSTANCES:-3}

# Validate
if [ -z "$PROJECT_ID" ]; then
  echo "❌ Error: GCP_PROJECT_ID not set. Run: gcloud config set project YOUR_PROJECT_ID"
  exit 1
fi

if [ -z "$GEMINI_API_KEY" ] || [ "$GEMINI_API_KEY" = "your_gemini_api_key_here" ]; then
  echo "⚠️  Warning: GEMINI_API_KEY not set. Multimodal features will be disabled."
  echo "   Get your key at: https://aistudio.google.com/apikey"
  read -p "   Continue without API key? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo ""
echo "🚀 Deploying Pulse to Google Cloud Run"
echo "   ├── Project:    ${PROJECT_ID}"
echo "   ├── Region:     ${REGION}"
echo "   ├── Service:    ${SERVICE}"
echo "   ├── Memory:     ${MEMORY}"
echo "   ├── CPU:        ${CPU}"
echo "   ├── Min scale:  ${MIN_INSTANCES}"
echo "   └── Max scale:  ${MAX_INSTANCES}"
echo ""

# Build environment variables for Cloud Run
ENV_VARS="NODE_ENV=production"
if [ -n "$GEMINI_API_KEY" ] && [ "$GEMINI_API_KEY" != "your_gemini_api_key_here" ]; then
  ENV_VARS="${ENV_VARS},GEMINI_API_KEY=${GEMINI_API_KEY}"
fi

# Deploy using --source (Cloud Build builds the container automatically)
gcloud run deploy ${SERVICE} \
  --source . \
  --project ${PROJECT_ID} \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 8080 \
  --memory ${MEMORY} \
  --cpu ${CPU} \
  --min-instances ${MIN_INSTANCES} \
  --max-instances ${MAX_INSTANCES} \
  --set-env-vars "${ENV_VARS}" \
  --timeout 300

echo ""
echo "✅ Deployment complete!"
echo ""

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE} --region ${REGION} --project ${PROJECT_ID} --format 'value(status.url)' 2>/dev/null)
if [ -n "$SERVICE_URL" ]; then
  echo "🌐 Your app is live at: ${SERVICE_URL}"
  echo ""
  echo "📱 Share this URL with judges — it works on any device!"
else
  echo "🔍 Check your service at: https://console.cloud.google.com/run"
fi
