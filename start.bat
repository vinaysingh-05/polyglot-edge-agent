```bat
@echo off
setlocal EnableExtensions EnableDelayedExpansion

title Polyglot Edge Agent Launcher

:: ============================================================
:: Polyglot Edge Agent - Local Development Launcher
:: Backend : FastAPI on 127.0.0.1:8000
:: Frontend: Vite on localhost:8443
:: ============================================================

set "ROOT=%~dp0"
set "BACKEND_PORT=8000"
set "FRONTEND_PORT=8443"
set "PYTHON=%ROOT%.venv\Scripts\python.exe"

echo.
echo  ============================================
echo       POLYGLOT EDGE AGENT
echo  ============================================
echo.

:: ------------------------------------------------------------
:: 1. Check Python virtual environment
:: ------------------------------------------------------------

if not exist "%PYTHON%" (
    echo [ERROR] Python virtual environment not found.
    echo.
    echo Expected:
    echo %PYTHON%
    echo.
    echo Create the environment with:
    echo python -m venv .venv
    echo.
    pause
    exit /b 1
)

echo [OK] Python virtual environment found.

:: ------------------------------------------------------------
:: 2. Check Node.js and npm
:: ------------------------------------------------------------

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not on PATH.
    pause
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed or not on PATH.
    pause
    exit /b 1
)

echo [OK] Node.js and npm found.

:: ------------------------------------------------------------
:: 3. Check frontend package.json
:: ------------------------------------------------------------

if not exist "%ROOT%package.json" (
    echo [ERROR] package.json not found in project root.
    pause
    exit /b 1
)

:: ------------------------------------------------------------
:: 4. Install frontend dependencies if missing
:: ------------------------------------------------------------

if not exist "%ROOT%node_modules\vite\bin\vite.js" (
    echo.
    echo [INFO] Frontend dependencies are missing.
    echo [INFO] Installing dependencies...

    pushd "%ROOT%"

    if exist "package-lock.json" (
        call npm ci
    ) else (
        call npm install
    )

    if errorlevel 1 (
        echo.
        echo [ERROR] Frontend dependency installation failed.
        popd
        pause
        exit /b 1
    )

    popd
)

echo [OK] Frontend dependencies checked.

:: ------------------------------------------------------------
:: 5. Check existing environment configuration
:: ------------------------------------------------------------

if not exist "%ROOT%.env" (
    echo.
    echo [WARN] .env file not found.
    echo [WARN] Some providers may require additional configuration.
)

:: ------------------------------------------------------------
:: 6. Check backend port
:: ------------------------------------------------------------

netstat -ano 2>nul | findstr /R /C:":8000 .*LISTENING" >nul

if not errorlevel 1 (
    echo.
    echo [WARN] Port 8000 is already in use.
    echo [WARN] The existing service may already be running.
    echo [WARN] Check http://127.0.0.1:8000/health
    echo.
    pause
    exit /b 1
)

:: ------------------------------------------------------------
:: 7. Check frontend port
:: ------------------------------------------------------------

netstat -ano 2>nul | findstr /R /C:":8443 .*LISTENING" >nul

if not errorlevel 1 (
    echo.
    echo [ERROR] Port 8443 is already in use.
    echo [ERROR] Stop the existing frontend or configure another port.
    pause
    exit /b 1
)

:: ------------------------------------------------------------
:: 8. Start FastAPI backend
:: ------------------------------------------------------------

echo.
echo [START] Starting FastAPI backend...

start "Polyglot Backend" /D "%ROOT%" cmd /k ""%PYTHON%" -m uvicorn backend.api:app --host 127.0.0.1 --port %BACKEND_PORT%"

:: ------------------------------------------------------------
:: 9. Wait for backend health
:: ------------------------------------------------------------

echo [WAIT] Waiting for backend health...

set "BACKEND_READY=0"

for /L %%I in (1,1,30) do (
    curl.exe -s --max-time 2 "http://127.0.0.1:8000/health" >nul 2>&1

    if not errorlevel 1 (
        set "BACKEND_READY=1"
        goto BACKEND_CHECK_DONE
    )

    timeout /t 1 /nobreak >nul
)

:BACKEND_CHECK_DONE

if "!BACKEND_READY!"=="0" (
    echo.
    echo [ERROR] Backend did not become healthy within 30 seconds.
    echo [INFO] Check the Polyglot Backend window.
    echo [INFO] Verify Python dependencies and backend.api:app.
    pause
    exit /b 1
)

echo [OK] Backend health endpoint responded.

:: ------------------------------------------------------------
:: 10. Start Vite frontend
:: ------------------------------------------------------------

echo.
echo [START] Starting Vite frontend...

start "Polyglot Frontend" /D "%ROOT%" cmd /k "call npm run dev -- --host 127.0.0.1 --port 8443 --strictPort"

:: ------------------------------------------------------------
:: 11. Wait for frontend
:: ------------------------------------------------------------

echo [WAIT] Waiting for frontend...

set "FRONTEND_READY=0"

for /L %%I in (1,1,30) do (
    curl.exe -s --max-time 2 "http://127.0.0.1:8443/" >nul 2>&1

    if not errorlevel 1 (
        set "FRONTEND_READY=1"
        goto FRONTEND_CHECK_DONE
    )

    timeout /t 1 /nobreak >nul
)

:FRONTEND_CHECK_DONE

if "!FRONTEND_READY!"=="0" (
    echo.
    echo [WARN] Frontend did not respond within 30 seconds.
    echo [INFO] Check the Polyglot Frontend window.
    echo [INFO] Verify the Vite configuration.
) else (
    echo [OK] Frontend responded successfully.
)

:: ------------------------------------------------------------
:: 12. Display application URLs
:: ------------------------------------------------------------

echo.
echo  ============================================
echo       POLYGLOT EDGE AGENT IS STARTING
echo  ============================================
echo.
echo  Dashboard : http://localhost:8443
echo  Backend   : http://127.0.0.1:8000
echo  API Docs  : http://127.0.0.1:8000/docs
echo  Health    : http://127.0.0.1:8000/health
echo  Readiness : http://127.0.0.1:8000/ready
echo.
echo  Backend and frontend run in separate windows.
echo  Keep both windows open while using the application.
echo.
echo  Press any key to open the dashboard.
pause >nul

start "" "http://localhost:8443"

echo.
echo Launcher finished. The service windows remain open.
echo Close each service window or press Ctrl+C in it to stop.
echo.

endlocal
exit /b 0
```
