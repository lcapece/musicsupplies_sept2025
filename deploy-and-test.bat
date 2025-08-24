@echo off
echo Starting 2FA System Fix and Test
echo ==================================

echo.
echo 1. Deploying edge function...
npx supabase functions deploy admin-2fa-handler --project-ref ekklokrukxmqlahtonnc

echo.
echo 2. Opening test page...
start test-2fa-browser.html

echo.
echo 3. Test completed! Check the browser for results.
pause