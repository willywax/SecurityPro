#!/bin/bash
set -e

PROJECT_ID="elitagroup"
REGION="us-central1"
TAG=$(git rev-parse --short HEAD)

echo "==> Deploying SecurityPro  [tag: $TAG]"

# ── Backend ──────────────────────────────────────────────────────────────────
echo ""
echo "[1/4] Building backend image..."
gcloud builds submit \
  --config backend/cloudbuild.yaml \
  --substitutions TAG_NAME=$TAG \
  --project $PROJECT_ID

echo "[2/4] Deploying backend to Cloud Run..."
gcloud run deploy securitypro-backend \
  --image gcr.io/$PROJECT_ID/securitypro-backend:$TAG \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10 \
  --set-env-vars "DATABASE_URL=${DATABASE_URL},JWT_SECRET_KEY=${JWT_SECRET_KEY},GCS_BUCKET_NAME=${GCS_BUCKET_NAME},GCS_PROJECT_ID=${GCS_PROJECT_ID}" \
  --set-secrets "GOOGLE_APPLICATION_CREDENTIALS=gcs-key:latest" \
  --project $PROJECT_ID

BACKEND_URL=$(gcloud run services describe securitypro-backend \
  --platform managed --region $REGION --project $PROJECT_ID \
  --format "value(status.url)")
echo "    Backend: $BACKEND_URL"

# ── Frontend ─────────────────────────────────────────────────────────────────
echo ""
echo "[3/4] Building frontend image..."
gcloud builds submit \
  --config frontend/cloudbuild.yaml \
  --substitutions TAG_NAME=$TAG,_VITE_API_URL=$BACKEND_URL \
  --project $PROJECT_ID

echo "[4/4] Deploying frontend to Cloud Run..."
gcloud run deploy securitypro-frontend \
  --image gcr.io/$PROJECT_ID/securitypro-frontend:$TAG \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 80 \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --project $PROJECT_ID

FRONTEND_URL=$(gcloud run services describe securitypro-frontend \
  --platform managed --region $REGION --project $PROJECT_ID \
  --format "value(status.url)")
echo "    Frontend: $FRONTEND_URL"

echo ""
echo "==> Deployment complete!"
echo "    Frontend : $FRONTEND_URL"
echo "    Backend  : $BACKEND_URL"
