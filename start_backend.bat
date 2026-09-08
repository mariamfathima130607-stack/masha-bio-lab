@echo off
echo ============================================================
echo  MASHA Bio Lab - Starting Backend (FastAPI - Python 3.11)
echo ============================================================

cd /d "%~dp0backend"

echo [1/3] Creating necessary directories...
if not exist "data" mkdir data
if not exist "models" mkdir models  
if not exist "knowledge_base" mkdir knowledge_base

echo [2/3] Activating Python 3.11 virtual environment...
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
) else (
    echo Warning: venv\Scripts\activate.bat not found!
)

echo [3/3] Starting FastAPI server...
echo.
echo  Backend API:  http://localhost:8000
echo  Swagger Docs: http://localhost:8000/docs
echo.
python -m uvicorn main:app --reload --port 8000

pause
