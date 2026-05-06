# GCP Deployment Guide for SecurityPro

This guide explains how to deploy the SecurityPro application (frontend and backend) to Google Cloud Platform using Cloud Run.

## Prerequisites

1. Google Cloud Project with billing enabled
2. Google Cloud SDK (gcloud) installed and authenticated
3. Docker installed locally (for testing)
4. GCS bucket created for media storage
5. PostgreSQL database (Cloud SQL or external)

## Environment Variables Setup

### Backend Environment Variables
Create a `.env` file in the `backend/` directory with the following variables:

```env
DATABASE_URL=postgresql+asyncpg://username:password@host:port/database?sslmode=require
JWT_SECRET_KEY=your-very-secure-jwt-secret-key
CORS_ORIGINS=https://your-frontend-url.run.app
GCS_BUCKET_NAME=your-gcs-bucket-name
GCS_PROJECT_ID=your-gcp-project-id
GOOGLE_APPLICATION_CREDENTIALS=./gcs-key.json
```

### GCS Service Account Key
1. Create a service account in GCP IAM
2. Grant Storage Admin role to the service account
3. Download the JSON key file and place it as `backend/gcs-key.json`

## Deployment Options

### Initial Deployment
For the first deployment, use the full `deploy.ps1` script.

### Updating Existing Deployment

#### Quick Update (Recommended for frequent changes)
```powershell
# Set environment variables if needed
$env:DATABASE_URL = "your-database-url"
$env:JWT_SECRET_KEY = "your-jwt-secret"
$env:GCS_BUCKET_NAME = "your-bucket-name"
$env:GCS_PROJECT_ID = "your-gcp-project-id"

# Run quick update
.\quick-update.ps1
```

This automatically versions images with timestamps and deploys both services.

#### Advanced Update Options
```powershell
# Deploy only backend
.\deploy.ps1 -Service backend

# Deploy only frontend
.\deploy.ps1 -Service frontend

# Skip building (use existing images)
.\deploy.ps1 -SkipBuild

# Don't auto-increment versions
.\deploy.ps1 -NoVersionBump
```

## Manual Deployment (Alternative)

If you prefer manual control:

### Backend Deployment
```powershell
# Build backend
gcloud builds submit --config backend/cloudbuild.yaml --project $PROJECT_ID

# Deploy backend
gcloud run deploy securitypro-backend `
  --image gcr.io/$PROJECT_ID/securitypro-backend:v1 `
  --platform managed `
  --region us-central1 `
  --allow-unauthenticated `
  --port 8080 `
  --memory 1Gi `
  --cpu 1 `
  --max-instances 10 `
  --set-env-vars DATABASE_URL=$env:DATABASE_URL,JWT_SECRET_KEY=$env:JWT_SECRET_KEY,GCS_BUCKET_NAME=$env:GCS_BUCKET_NAME,GCS_PROJECT_ID=$env:GCS_PROJECT_ID `
  --set-secrets GOOGLE_APPLICATION_CREDENTIALS=gcs-key:latest `
  --project $PROJECT_ID
```

### Frontend Deployment
```powershell
# Get backend URL
$BACKEND_URL = gcloud run services describe securitypro-backend --platform managed --region us-central1 --project $PROJECT_ID --format "value(status.url)"

# Build frontend
gcloud builds submit --config frontend/cloudbuild.yaml --substitutions _VITE_API_URL=$BACKEND_URL --project $PROJECT_ID

# Deploy frontend
gcloud run deploy securitypro-frontend `
  --image gcr.io/$PROJECT_ID/securitypro-frontend:v5 `
  --platform managed `
  --region us-central1 `
  --allow-unauthenticated `
  --port 80 `
  --memory 512Mi `
  --cpu 1 `
  --max-instances 10 `
  --project $PROJECT_ID
```

## Post-Deployment Configuration

1. Update CORS settings in backend if needed
2. Configure domain mapping if using custom domains
3. Set up monitoring and logging in GCP Console
4. Configure backup strategies for database

## Troubleshooting

- **Build failures**: Check Cloud Build logs in GCP Console
- **Runtime errors**: Check Cloud Run logs
- **Environment variables**: Ensure all required env vars are set
- **CORS issues**: Verify CORS_ORIGINS includes the frontend URL

## Deployment Best Practices

### Version Control
- Each deployment creates timestamped versions (e.g., `v2401021430`)
- Previous versions are preserved in Container Registry
- Easy rollback to any previous version

### Rollback Procedure
```powershell
# List available versions
gcloud container images list-tags gcr.io/$PROJECT_ID/securitypro-backend

# Rollback backend to specific version
gcloud run deploy securitypro-backend --image gcr.io/$PROJECT_ID/securitypro-backend:v2401011200 --platform managed --region us-central1 --project $PROJECT_ID

# Rollback frontend to specific version
gcloud run deploy securitypro-frontend --image gcr.io/$PROJECT_ID/securitypro-frontend:v2401011200 --platform managed --region us-central1 --project $PROJECT_ID
```

### Monitoring Deployments
- Check Cloud Run logs: `gcloud logs read --project $PROJECT_ID`
- Monitor service health in GCP Console
- Set up alerts for deployment failures

### Environment Management
- Use different projects for staging/production
- Test deployments in staging first
- Keep environment variables in secure secret management