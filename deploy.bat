@echo off
echo 🎵 Music Supplies App - Netlify Deployment 🎵
echo =============================================

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: package.json not found. Please run this script from the project root.
    pause
    exit /b 1
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

REM Build the project
echo 🔨 Building the project...
npm run build

if %ERRORLEVEL% neq 0 (
    echo ❌ Build failed. Please check for errors above.
    pause
    exit /b 1
)

echo ✅ Build successful!

REM Check if Netlify CLI is installed
netlify --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo 📥 Installing Netlify CLI...
    npm install -g netlify-cli
)

REM Deploy to Netlify
echo 🚀 Deploying to Netlify...
echo.
echo Choose deployment method:
echo 1^) Production deployment (--prod^)
echo 2^) Preview deployment (draft^)
set /p choice="Enter choice (1 or 2): "

if "%choice%"=="1" (
    echo 🚀 Deploying to production...
    netlify deploy --prod --dir=dist
) else if "%choice%"=="2" (
    echo 🚀 Creating preview deployment...
    netlify deploy --dir=dist
) else (
    echo ❌ Invalid choice. Exiting.
    pause
    exit /b 1
)

echo.
echo ✅ Deployment complete!
echo.
echo 📋 Post-deployment checklist:
echo 1. Set environment variables in Netlify dashboard:
echo    - VITE_SUPABASE_URL
echo    - VITE_SUPABASE_ANON_KEY
echo 2. Run fix_login_manual.sql in Supabase dashboard
echo 3. Test login with account 101
echo.
echo 🎉 Your Music Supplies app is now live!
pause
