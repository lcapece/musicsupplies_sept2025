@echo off
echo ========================================
echo    DEPLOY TO NETLIFY
echo ========================================
echo.

:: Check for required environment variables
if not defined VITE_SUPABASE_URL (
    echo ERROR: VITE_SUPABASE_URL not set in .env
    echo Please add your Supabase URL to .env file
    pause
    exit /b 1
)

if not defined VITE_SUPABASE_ANON_KEY (
    echo ERROR: VITE_SUPABASE_ANON_KEY not set in .env
    echo Please add your Supabase Anon Key to .env file
    pause
    exit /b 1
)

:: Build the project
echo Building project...
call npm run build

if errorlevel 1 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo Build successful!
echo.

:: Deploy to Netlify
echo Deploying to Netlify...
netlify deploy --prod --dir=dist

if errorlevel 1 (
    echo.
    echo Deployment failed!
    echo Make sure you're logged in: netlify login
    pause
    exit /b 1
)

echo.
echo ========================================
echo DEPLOYMENT SUCCESSFUL!
echo ========================================
echo.
echo IMPORTANT: Make sure these environment variables
echo are also set in your Netlify dashboard:
echo.
echo 1. VITE_SUPABASE_URL
echo 2. VITE_SUPABASE_ANON_KEY
echo 3. VITE_ELEVENLABS_API_KEY (for voice chat)
echo.
echo Go to: Netlify Dashboard > Site Settings > Environment Variables
echo.
pause