# Check deployment status of SecurityPro services

param(
    [string]$ProjectId = "elitagroup",  # <-- YOUR GCP PROJECT ID
    [string]$Region = "us-central1"
)

Write-Host "🔍 Checking SecurityPro deployment status..." -ForegroundColor Green
Write-Host "Project: $ProjectId, Region: $Region" -ForegroundColor Cyan
Write-Host ""

# Check backend service
Write-Host "=== Backend Service ===" -ForegroundColor Yellow
try {
    $backendInfo = gcloud run services describe securitypro-backend --platform managed --region $Region --project $ProjectId --format "export" 2>$null | ConvertFrom-StringData
    if ($backendInfo) {
        Write-Host "✅ Status: Running" -ForegroundColor Green
        Write-Host "🌐 URL: $($backendInfo.status_url)" -ForegroundColor Cyan
        Write-Host "📦 Image: $($backendInfo.spec_template_spec_containers_0_image)" -ForegroundColor Gray
        Write-Host "🕒 Created: $($backendInfo.metadata_creationTimestamp)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Service not found or not deployed" -ForegroundColor Red
}

Write-Host ""

# Check frontend service
Write-Host "=== Frontend Service ===" -ForegroundColor Yellow
try {
    $frontendInfo = gcloud run services describe securitypro-frontend --platform managed --region $Region --project $ProjectId --format "export" 2>$null | ConvertFrom-StringData
    if ($frontendInfo) {
        Write-Host "✅ Status: Running" -ForegroundColor Green
        Write-Host "🌐 URL: $($frontendInfo.status_url)" -ForegroundColor Cyan
        Write-Host "📦 Image: $($frontendInfo.spec_template_spec_containers_0_image)" -ForegroundColor Gray
        Write-Host "🕒 Created: $($frontendInfo.metadata_creationTimestamp)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Service not found or not deployed" -ForegroundColor Red
}

Write-Host ""

# Check recent builds
Write-Host "=== Recent Builds ===" -ForegroundColor Yellow
Write-Host "Backend builds:" -ForegroundColor Cyan
gcloud builds list --filter "source.repo_source.repo_name=securitypro-backend" --limit 3 --project $ProjectId --format "table[no-heading](createTime.date('%Y-%m-%d %H:%M:%S'), status, images)"

Write-Host "Frontend builds:" -ForegroundColor Cyan
gcloud builds list --filter "source.repo_source.repo_name=securitypro-frontend" --limit 3 --project $ProjectId --format "table[no-heading](createTime.date('%Y-%m-%d %H:%M:%S'), status, images)"