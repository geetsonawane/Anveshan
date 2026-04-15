@echo off
echo ========================================
echo Starting Anveshan Application
echo ========================================
echo.

cd /d "%~dp0"

echo Checking Python...
python --version
if %errorlevel% neq 0 (
    echo ERROR: Python not found!
    pause
    exit /b 1
)

echo.
echo Starting Flask server...
echo.
echo ✓ Admin login: http://localhost:5000/admin-login
echo   Username: admin
echo   Password: admin123
echo.
echo ✓ Face Search: http://localhost:5000/search-results
echo.
echo Press Ctrl+C to stop the server
echo.

python app.py

pause
