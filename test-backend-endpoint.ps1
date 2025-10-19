# Test Backend Endpoint Script
# This script tests if the /settings/theme endpoint is accessible

Write-Host "Testing Backend /settings/theme Endpoint..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if backend is running
Write-Host "Test 1: Checking if backend is running on port 8090..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8090/api/v1/settings/theme" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Backend is running!" -ForegroundColor Green
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    if ($_.Exception.Message -like "*Unable to connect*" -or $_.Exception.Message -like "*No connection*") {
        Write-Host "❌ Backend is NOT running on port 8090" -ForegroundColor Red
        Write-Host ""
        Write-Host "To start the backend, run:" -ForegroundColor Yellow
        Write-Host "  cd le-backend" -ForegroundColor White
        Write-Host "  python -m uvicorn app.main:app --host=127.0.0.1 --port=8090 --reload" -ForegroundColor White
    } elseif ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "❌ Endpoint not found (404)" -ForegroundColor Red
        Write-Host "The backend is running but the /settings/theme endpoint is not accessible" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Test 2: Trying to initialize theme settings..." -ForegroundColor Yellow
try {
    $initResponse = Invoke-WebRequest -Uri "http://localhost:8090/api/v1/settings/theme/initialize" -Method POST -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Theme settings initialized!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    $initResponse.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "⚠️  Could not initialize: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Cyan
