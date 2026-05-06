# PowerShell script to deploy/update SecurityPro to Google Cloud Run

param(
    [string]$Service = "both",  # "backend", "frontend", or "both"
    [switch]$SkipBuild,         # Skip building if you want to deploy existing images
    [switch]$NoVersionBump      # Don't increment version numbers
)

# Set your GCP project ID and region
$PROJECT_ID = "elitagroup"  # <-- YOUR GCP PROJECT ID
$REGION = "us-central1"

# Version management
$BACKEND_VERSION = "v1"
$FRONTEND_VERSION = "v5"

if (-not $NoVersionBump) {
    # Auto-increment versions for updates
    $timestamp = Get-Date -Format "yyMMddHHmm"
    $BACKEND_VERSION = "v$timestamp"
    $FRONTEND_VERSION = "v$timestamp"
}

Write-Host "Updating SecurityPro on Google Cloud Run..." -ForegroundColor Green
Write-Host "Project: $PROJECT_ID, Region: $REGION" -ForegroundColor Cyan
Write-Host "Deploying: $Service" -ForegroundColor Cyan

# Function to check if service exists
function Test-CloudRunService {
    param([string]$ServiceName)
    try {
        $result = gcloud run services describe $ServiceName --platform managed --region $REGION --project $PROJECT_ID 2>$null
        return $true
    } catch {
        return $false
    }
}

# Deploy backend
if ($Service -eq "both" -or $Service -eq "backend") {
    Write-Host "`n=== Deploying Backend ===" -ForegroundColor Yellow

    if (-not $SkipBuild) {
        Write-Host "Building backend image..." -ForegroundColor Yellow
        gcloud builds submit --config backend/cloudbuild.yaml --substitutions TAG_NAME=$BACKEND_VERSION --project $PROJECT_ID

        if ($LASTEXITCODE -ne 0) {
            Write-Host "Backend build failed!" -ForegroundColor Red
            exit 1
        }
    }

    Write-Host "Deploying backend to Cloud Run..." -ForegroundColor Yellow

    $deployCmd = "gcloud run deploy securitypro-backend " +
        "--image gcr.io/$PROJECT_ID/securitypro-backend:$BACKEND_VERSION " +
        "--platform managed " +
        "--region $REGION " +
        "--allow-unauthenticated " +
        "--port 8080 " +
        "--memory 1Gi " +
        "--cpu 1 " +
        "--max-instances 10 " +
        "--set-env-vars `"DATABASE_URL=$env:DATABASE_URL,JWT_SECRET_KEY=$env:JWT_SECRET_KEY,GCS_BUCKET_NAME=$env:GCS_BUCKET_NAME,GCS_PROJECT_ID=$env:GCS_PROJECT_ID`" " +
        "--set-secrets `"GOOGLE_APPLICATION_CREDENTIALS=gcs-key:latest`" " +
        "--project $PROJECT_ID"

    Invoke-Expression $deployCmd

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Backend deployment failed!" -ForegroundColor Red
        exit 1
    }

    # Get backend URL
    $BACKEND_URL = gcloud run services describe securitypro-backend --platform managed --region $REGION --project $PROJECT_ID --format "value(status.url)"
    Write-Host "Backend updated at: $BACKEND_URL" -ForegroundColor Green
}

# Deploy frontend
if ($Service -eq "both" -or $Service -eq "frontend") {
    Write-Host "`n=== Deploying Frontend ===" -ForegroundColor Yellow

    # Get backend URL (either from previous deployment or existing service)
    if (-not $BACKEND_URL) {
        $BACKEND_URL = gcloud run services describe securitypro-backend --platform managed --region $REGION --project $PROJECT_ID --format "value(status.url)"
        Write-Host "Using existing backend URL: $BACKEND_URL" -ForegroundColor Cyan
    }

    if (-not $SkipBuild) {
        Write-Host "Building frontend image..." -ForegroundColor Yellow
        gcloud builds submit --config frontend/cloudbuild.yaml `
            --substitutions _VITE_API_URL=$BACKEND_URL,TAG_NAME=$FRONTEND_VERSION `
            --project $PROJECT_ID

        if ($LASTEXITCODE -ne 0) {
            Write-Host "Frontend build failed!" -ForegroundColor Red
            exit 1
        }
    }

    Write-Host "Deploying frontend to Cloud Run..." -ForegroundColor Yellow

    $deployCmd = "gcloud run deploy securitypro-frontend " +
        "--image gcr.io/$PROJECT_ID/securitypro-frontend:$FRONTEND_VERSION " +
        "--platform managed " +
        "--region $REGION " +
        "--allow-unauthenticated " +
        "--port 80 " +
        "--memory 512Mi " +
        "--cpu 1 " +
        "--max-instances 10 " +
        "--project $PROJECT_ID"

    Invoke-Expression $deployCmd

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Frontend deployment failed!" -ForegroundColor Red
        exit 1
    }

    # Get frontend URL
    $FRONTEND_URL = gcloud run services describe securitypro-frontend --platform managed --region $REGION --project $PROJECT_ID --format "value(status.url)"
    Write-Host "Frontend updated at: $FRONTEND_URL" -ForegroundColor Green
}

Write-Host "`n✅ Deployment complete!" -ForegroundColor Green
Write-Host "Backend: $BACKEND_URL" -ForegroundColor Cyan
Write-Host "Frontend: $FRONTEND_URL" -ForegroundColor Cyan