# PowerShell script for Podman setup on Windows
Write-Host "Setting up LC Workflow Backend with Podman..." -ForegroundColor Green
Write-Host ""

# Check if Podman is installed
try {
    $podmanVersion = podman --version
    Write-Host "Podman found! Version: $podmanVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Podman is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Podman first: https://podman.io/getting-started/installation" -ForegroundColor Yellow
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Check if podman-compose is available
try {
    $composeVersion = podman-compose --version
    Write-Host "podman-compose found! Version: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "WARNING: podman-compose not found" -ForegroundColor Yellow
    Write-Host "Installing podman-compose..." -ForegroundColor Yellow
    
    try {
        pip install podman-compose
        Write-Host "podman-compose installed successfully!" -ForegroundColor Green
    } catch {
        Write-Host "ERROR: Failed to install podman-compose" -ForegroundColor Red
        Write-Host "Please install it manually: pip install podman-compose" -ForegroundColor Yellow
        Write-Host "Press any key to exit..."
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 1
    }
}

Write-Host ""

# Create uploads directory if it doesn't exist
if (-not (Test-Path -Path "uploads")) {
    New-Item -ItemType Directory -Name "uploads" | Out-Null
    Write-Host "Created uploads directory" -ForegroundColor Green
}

# Copy environment file if it doesn't exist
if (-not (Test-Path -Path ".env")) {
    Copy-Item -Path ".env.example" -Destination ".env"
    Write-Host "Created .env file from .env.example" -ForegroundColor Green
    Write-Host "Please update .env file with your configuration" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Starting services with Podman..." -ForegroundColor Green
Write-Host "This may take a few minutes on first run..." -ForegroundColor Yellow
Write-Host ""

# Build and start services
$process = Start-Process -FilePath "podman-compose" -ArgumentList "up --build -d" -PassThru -Wait -NoNewWindow

if ($process.ExitCode -ne 0) {
    Write-Host "ERROR: Failed to start services" -ForegroundColor Red
    Write-Host "Check the logs above for details" -ForegroundColor Yellow
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host ""
Write-Host "Services started successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Access your application:" -ForegroundColor Cyan
Write-Host "- API: http://localhost:8000" -ForegroundColor White
Write-Host "- API Documentation: http://localhost:8000/docs" -ForegroundColor White
Write-Host "- MinIO Console: http://localhost:9001" -ForegroundColor White
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "- View logs: podman-compose logs -f" -ForegroundColor White
Write-Host "- Stop services: podman-compose down" -ForegroundColor White
Write-Host "- View containers: podman ps" -ForegroundColor White
Write-Host ""
Write-Host "Setup complete! 🚀" -ForegroundColor Green
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")