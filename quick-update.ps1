# Quick update script for SecurityPro - deploys both services with auto-versioning

# Set your GCP project ID and region
$PROJECT_ID = "elitagroup"  # <-- YOUR GCP PROJECT ID
$REGION = "us-central1"

# Auto-generate version based on timestamp
$timestamp = Get-Date -Format "yyMMddHHmm"
$BACKEND_VERSION = "v$timestamp"
$FRONTEND_VERSION = "v$timestamp"

Write-Host "🚀 Quick update: SecurityPro $timestamp" -ForegroundColor Green

# Deploy backend
Write-Host "Building and deploying backend..." -ForegroundColor Yellow
gcloud builds submit --config backend/cloudbuild.yaml --substitutions TAG_NAME=$BACKEND_VERSION --project $PROJECT_ID --quiet
gcloud run deploy securitypro-backend --image gcr.io/$PROJECT_ID/securitypro-backend:$BACKEND_VERSION --platform managed --region $REGION --allow-unauthenticated --port 8080 --memory 1Gi --cpu 1 --max-instances 10 --set-env-vars "DATABASE_URL=$env:DATABASE_URL,JWT_SECRET_KEY=$env:JWT_SECRET_KEY,GCS_BUCKET_NAME=$env:GCS_BUCKET_NAME,GCS_PROJECT_ID=$env:GCS_PROJECT_ID" --set-secrets "GOOGLE_APPLICATION_CREDENTIALS=gcs-key:latest" --project $PROJECT_ID --quiet

$BACKEND_URL = gcloud run services describe securitypro-backend --platform managed --region $REGION --project $PROJECT_ID --format "value(status.url)"

# Deploy frontend
Write-Host "Building and deploying frontend..." -ForegroundColor Yellow
gcloud builds submit --config frontend/cloudbuild.yaml --substitutions _VITE_API_URL=$BACKEND_URL,TAG_NAME=$FRONTEND_VERSION --project $PROJECT_ID --quiet
gcloud run deploy securitypro-frontend --image gcr.io/$PROJECT_ID/securitypro-frontend:$FRONTEND_VERSION --platform managed --region $REGION --allow-unauthenticated --port 80 --memory 512Mi --cpu 1 --max-instances 10 --project $PROJECT_ID --quiet

$FRONTEND_URL = gcloud run services describe securitypro-frontend --platform managed --region $REGION --project $PROJECT_ID --format "value(status.url)"

Write-Host "✅ Update complete!" -ForegroundColor Green
Write-Host "🌐 Frontend: $FRONTEND_URL" -ForegroundColor Cyan
Write-Host "🔧 Backend: $BACKEND_URL" -ForegroundColor Cyan