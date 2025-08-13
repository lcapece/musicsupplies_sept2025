@echo off
echo ========================================
echo    EMERGENCY DIRECT DEPLOY TO NETLIFY
echo ========================================
echo.
echo This will deploy directly to Netlify without GitHub
echo.

:: Build the project
echo Building project...
call npm run build

if errorlevel 1 (
    echo BUILD FAILED!
    pause
    exit /b 1
)

echo.
echo Build successful!
echo.

:: Deploy directly to production
echo.
echo Deploying directly to your Netlify site...
netlify deploy --prod --dir=dist

echo.
echo ========================================
echo DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Your site should update in 1-2 minutes.
echo Clear browser cache (Ctrl+F5) if needed.
echo.
pause