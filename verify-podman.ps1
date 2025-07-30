# PowerShell script to verify Podman setup
param(
    [switch]$Verbose = $false
)

Write-Host "🔍 Verifying Podman Setup for LC Workflow Backend" -ForegroundColor Cyan
Write-Host "=" * 50

# Function to check service health
function Test-ServiceHealth {
    param($Url, $ServiceName)
    
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $ServiceName is running" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "❌ $ServiceName is not responding" -ForegroundColor Red
        return $false
    }
}

# Check if Podman is installed
try {
    $podmanVersion = podman --version 2>$null
    if ($podmanVersion) {
        Write-Host "✅ Podman installed: $podmanVersion" -ForegroundColor Green
    } else {
        Write-Host "❌ Podman not found" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Podman not found or not in PATH" -ForegroundColor Red
    exit 1
}

# Check if podman-compose is available
try {
    $composeVersion = podman-compose --version 2>$null
    if ($composeVersion) {
        Write-Host "✅ podman-compose available: $composeVersion" -ForegroundColor Green
    } else {
        Write-Host "⚠️  podman-compose not found - will attempt to install" -ForegroundColor Yellow
        pip install podman-compose
    }
} catch {
    Write-Host "⚠️  podman-compose not found - will attempt to install" -ForegroundColor Yellow
    pip install podman-compose
}

Write-Host ""

# Check if containers are running
Write-Host "🔍 Checking running containers..." -ForegroundColor Yellow
$containers = podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>$null

if ($containers) {
    Write-Host "📋 Running containers:" -ForegroundColor Cyan
    $containers | ForEach-Object {
        if ($_ -notmatch "NAMES") {
            Write-Host "  $_" -ForegroundColor White
        }
    }
} else {
    Write-Host "⚠️  No containers are currently running" -ForegroundColor Yellow
    Write-Host "Run 'podman-compose up -d' to start services" -ForegroundColor Yellow
}

Write-Host ""

# Test service health
Write-Host "🔍 Testing service health..." -ForegroundColor Yellow

$apiHealth = Test-ServiceHealth -Url "http://localhost:8000/health" -ServiceName "FastAPI API"
$minioHealth = Test-ServiceHealth -Url "http://localhost:9000/minio/health/live" -ServiceName "MinIO Storage"

Write-Host ""

# Check if .env file exists
if (Test-Path ".env") {
    Write-Host "✅ .env file found" -ForegroundColor Green
} else {
    Write-Host "⚠️  .env file not found - using .env.example" -ForegroundColor Yellow
}

# Check uploads directory
if (Test-Path "uploads") {
    Write-Host "✅ uploads directory exists" -ForegroundColor Green
} else {
    Write-Host "⚠️  uploads directory not found" -ForegroundColor Yellow
    New-Item -ItemType Directory -Name "uploads" | Out-Null
    Write-Host "✅ Created uploads directory" -ForegroundColor Green
}

Write-Host ""

# Summary
$allHealthy = $apiHealth -and $minioHealth

if ($allHealthy) {
    Write-Host "🎉 All services are healthy!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Access your application:" -ForegroundColor Cyan
    Write-Host "- API: http://localhost:8000" -ForegroundColor White
    Write-Host "- API Documentation: http://localhost:8000/docs" -ForegroundColor White
    Write-Host "- MinIO Console: http://localhost:9001" -ForegroundColor White
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Open http://localhost:8000/docs to test the API" -ForegroundColor White
    Write-Host "2. Configure your Flutter app to use http://localhost:8000" -ForegroundColor White
} else {
    Write-Host "⚠️  Some services are not running properly" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Troubleshooting steps:" -ForegroundColor Cyan
    Write-Host "1. Check logs: podman-compose logs" -ForegroundColor White
    Write-Host "2. Restart services: podman-compose restart" -ForegroundColor White
    Write-Host "3. Reset everything: podman-compose down -v && podman-compose up --build" -ForegroundColor White
}

Write-Host ""
Write-Host "=" * 50
Write-Host "Verification complete!" -ForegroundColor Cyan