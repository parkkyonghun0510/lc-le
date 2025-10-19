# Setup Test Users for LC Workflow System
# This script sets up the complete test environment including permissions and test users

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "LC WORKFLOW TEST ENVIRONMENT SETUP" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the correct directory
if (-not (Test-Path "le-backend")) {
    Write-Host "Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Navigate to backend directory
Set-Location le-backend

Write-Host "Step 1: Setting up Python virtual environment..." -ForegroundColor Yellow
Write-Host ""

# Check if virtual environment exists
if (-not (Test-Path "venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1

Write-Host ""
Write-Host "Step 2: Running complete test environment setup..." -ForegroundColor Yellow
Write-Host ""

# Run the setup script
python scripts/setup_test_environment.py

$exitCode = $LASTEXITCODE

# Deactivate virtual environment
deactivate

# Return to project root
Set-Location ..

Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "======================================================================" -ForegroundColor Green
    Write-Host "SETUP SUCCESSFUL!" -ForegroundColor Green
    Write-Host "======================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Test users are ready. Default password: Test@123" -ForegroundColor Green
    Write-Host ""
    Write-Host "Quick Start:" -ForegroundColor Cyan
    Write-Host "  1. Start the backend: cd le-backend && python -m uvicorn app.main:app --reload" -ForegroundColor White
    Write-Host "  2. Start the frontend: cd lc-workflow-frontend && npm run dev" -ForegroundColor White
    Write-Host "  3. Login with: admin / Test@123" -ForegroundColor White
    Write-Host ""
    Write-Host "See TEST_USERS_SETUP_GUIDE.md for detailed testing instructions" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "======================================================================" -ForegroundColor Red
    Write-Host "SETUP FAILED" -ForegroundColor Red
    Write-Host "======================================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check the error messages above and try again." -ForegroundColor Yellow
    Write-Host ""
}

exit $exitCode
