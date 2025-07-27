@echo off
echo ========================================
echo FIXING PASSWORD RESET ISSUES
echo ========================================
echo.

echo Step 1: Stopping any running dev servers...
taskkill /F /IM node.exe 2>nul
timeout /t 2 >nul

echo.
echo Step 2: Clearing Vite cache...
if exist "node_modules\.vite" (
    rmdir /s /q "node_modules\.vite"
    echo Vite cache cleared!
) else (
    echo No Vite cache found.
)

echo.
echo Step 3: Starting fresh dev server...
echo.
echo IMPORTANT: After the server starts:
echo 1. Open a NEW incognito/private browser window
echo 2. Navigate to the login page
echo 3. Try password reset for: lcapece@optonline.net
echo.
echo Press any key to start the dev server...
pause >nul

npm run dev
