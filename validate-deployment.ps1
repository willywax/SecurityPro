# Validation script for SecurityPro GCP deployment

Write-Host "Validating SecurityPro deployment setup..." -ForegroundColor Green

# Check if gcloud is installed
try {
    $gcloudVersion = gcloud --version 2>$null
    Write-Host "✓ gcloud CLI is installed" -ForegroundColor Green
} catch {
    Write-Host "✗ gcloud CLI is not installed. Please install Google Cloud SDK." -ForegroundColor Red
    exit 1
}

# Check if authenticated
try {
    $account = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
    if ($account) {
        Write-Host "✓ Authenticated with GCP as: $account" -ForegroundColor Green
    } else {
        Write-Host "✗ Not authenticated with GCP. Run 'gcloud auth login'" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Authentication check failed. Run 'gcloud auth login'" -ForegroundColor Red
    exit 1
}

# Check if required files exist
$requiredFiles = @(
    "backend/Dockerfile",
    "backend/requirements-prod.txt",
    "backend/cloudbuild.yaml",
    "frontend/Dockerfile",
    "frontend/cloudbuild.yaml",
    "backend/.env"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "✓ $file exists" -ForegroundColor Green
    } else {
        Write-Host "✗ $file is missing" -ForegroundColor Red
    }
}

# Check GCS key file
if (Test-Path "backend/gcs-key.json") {
    Write-Host "✓ GCS service account key exists" -ForegroundColor Green
} else {
    Write-Host "✗ GCS service account key (backend/gcs-key.json) is missing" -ForegroundColor Red
    Write-Host "  Create a service account and download the JSON key file" -ForegroundColor Yellow
}

Write-Host "`nValidation complete. Fix any issues before deploying." -ForegroundColor Green