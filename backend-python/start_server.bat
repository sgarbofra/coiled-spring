@echo off
cd /d "%~dp0"
echo Starting Coiled Spring Backend Server...
echo ========================================
echo.
python -m uvicorn main:app --reload --port 8001
pause
