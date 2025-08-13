@echo off
echo ===================================
echo EMERGENCY DEPLOYMENT - v RC813.1000
echo ===================================

echo Creating .env with version...
echo VITE_APP_VERSION=RC813.1000 > .env

echo Creating version.json...
echo {"version":"RC813.1000","timestamp":"%date%","build":%random%} > public\version.json

echo Building with new version...
call npm run build

echo Copying version.json to dist...
copy public\version.json dist\version.json

echo.
echo BUILD COMPLETE! Version RC813.1000 is ready.
echo.
echo TO DEPLOY:
echo 1. Go to https://app.netlify.com
echo 2. Select your site (musicsupplies)  
echo 3. Drag the entire 'dist' folder to the deployment area
echo.
echo OR run: netlify deploy --prod --dir dist
echo.
pause