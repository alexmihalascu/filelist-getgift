@echo off
echo ===================================================
echo Filelist Gift Automation - Setup Script for Windows
echo ===================================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Node.js is not installed. Please install Node.js from https://nodejs.org/
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

:: Check Node.js version
for /f "tokens=1,2,3 delims=." %%a in ('node -v') do (
    set NODE_MAJOR=%%a
    set NODE_MINOR=%%b
    set NODE_PATCH=%%c
)

set NODE_MAJOR=%NODE_MAJOR:~1%

if %NODE_MAJOR% LSS 14 (
    echo Your Node.js version is too old. Please upgrade to Node.js 14 or newer.
    echo Current version: %NODE_MAJOR%.%NODE_MINOR%.%NODE_PATCH%
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

echo [✓] Node.js detected (version %NODE_MAJOR%.%NODE_MINOR%.%NODE_PATCH%)
echo.

:: Create default config if not exists
if not exist config.json (
    echo Creating default config.json...
    echo [] > config.json
    echo [✓] Created default config.json
) else (
    echo [✓] Found existing config.json
)

:: Check if node_modules directory already exists
if exist node_modules (
    echo [✓] Dependencies already installed, skipping installation.
) else (
    echo.
    echo Installing dependencies...
    call npm install

    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo Error installing dependencies. Please check your internet connection.
        echo Press any key to exit...
        pause >nul
        exit /b 1
    )

    echo.
    echo [✓] Dependencies installed successfully.
)

echo.
echo ===================================================
echo Setup complete! Starting Filelist Gift Automation...
echo ===================================================
echo.

npm start

echo.
echo Press any key to exit...
pause >nul
