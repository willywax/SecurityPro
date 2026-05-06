#!/bin/bash

# Set your GCP project ID
PROJECT_ID="elitagroup"
REGION="us-central1"

echo "Deploying SecurityPro Backend and Frontend to Google Cloud Run..."

# Build and deploy backend
echo "Building backend..."
gcloud builds submit --config backend/cloudbuild.yaml --project $PROJECT_ID

echo "Deploying backend to Cloud Run..."
gcloud run deploy securitypro-backend \
  --image gcr.io/$PROJECT_ID/securitypro-backend:v1 \
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

# Get backend URL
BACKEND_URL=$(gcloud run services describe securitypro-backend --platform managed --region $REGION --project $PROJECT_ID --format "value(status.url)")

echo "Backend deployed at: $BACKEND_URL"

# Build and deploy frontend
echo "Building frontend..."
gcloud builds submit --config frontend/cloudbuild.yaml \
  --substitutions _VITE_API_URL=$BACKEND_URL \
  --project $PROJECT_ID

echo "Deploying frontend to Cloud Run..."
gcloud run deploy securitypro-frontend \
  --image gcr.io/$PROJECT_ID/securitypro-frontend:v5 \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 80 \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --project $PROJECT_ID

# Get frontend URL
FRONTEND_URL=$(gcloud run services describe securitypro-frontend --platform managed --region $REGION --project $PROJECT_ID --format "value(status.url)")

echo "Frontend deployed at: $FRONTEND_URL"
echo "Deployment complete!"