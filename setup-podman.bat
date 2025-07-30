@echo off
echo Setting up LC Workflow Backend with Podman...
echo.

REM Check if Podman is installed
podman --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Podman is not installed or not in PATH
    echo Please install Podman first: https://podman.io/getting-started/installation
    pause
    exit /b 1
)

echo Podman found! Version:
podman --version
echo.

REM Check if podman-compose is available
podman-compose --version >nul 2>&1
if errorlevel 1 (
    echo WARNING: podman-compose not found
    echo Installing podman-compose...
    pip install podman-compose
    if errorlevel 1 (
        echo ERROR: Failed to install podman-compose
        echo Please install it manually: pip install podman-compose
        pause
        exit /b 1
    )
)

echo podman-compose found! Version:
podman-compose --version
echo.

REM Create uploads directory if it doesn't exist
if not exist "uploads" (
    mkdir uploads
    echo Created uploads directory
)

REM Copy environment file if it doesn't exist
if not exist ".env" (
    copy .env.example .env
    echo Created .env file from .env.example
    echo Please update .env file with your configuration
)

echo.
echo Starting services with Podman...
echo.
echo This may take a few minutes on first run...
echo.

REM Build and start services
podman-compose up --build -d

if errorlevel 1 (
    echo ERROR: Failed to start services
    echo Check the logs above for details
    pause
    exit /b 1
)

echo.
echo Services started successfully!
echo.
echo Access your application:
echo - API: http://localhost:8000
echo - API Documentation: http://localhost:8000/docs
echo - MinIO Console: http://localhost:9001
echo.
echo To view logs: podman-compose logs -f
echo To stop services: podman-compose down
echo.
echo Setup complete! 🚀
pause