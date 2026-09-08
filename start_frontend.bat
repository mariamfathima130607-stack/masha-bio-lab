@echo off
echo ============================================================
echo  MASHA Bio Lab - Starting Frontend (Vite + React)
echo ============================================================

set "PATH=C:\Program Files\nodejs;%PATH%"

cd /d "%~dp0frontend"

:: Check for node_modules
if not exist "node_modules" (
    echo Installing npm dependencies...
    call npm install
)

echo.
echo Starting Vite dev server on http://localhost:5173
echo.
call npm run dev

pause
