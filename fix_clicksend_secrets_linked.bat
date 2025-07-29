@echo off
echo ==============================================
echo FIXING CLICKSEND SECRETS - PROPERLY LINKED
echo ==============================================
echo.
echo This will properly link your project and set ClickSend credentials.
echo.
pause

cd /d "%~dp0"

echo.
echo Linking to Supabase project...
npx supabase link --project-ref ekklokrukxmqlahtonnc

echo.
echo Now setting CLICKSEND_USERNAME...
echo lcapece@optonline.net | npx supabase secrets set CLICKSEND_USERNAME

echo.
echo Setting CLICKSEND_API_KEY...
echo EE8B20BD-7C92-2FB1-3AE0-16C2AB80B814 | npx supabase secrets set CLICKSEND_API_KEY

echo.
echo ==============================================
echo Secrets set! Now redeploying functions...
echo ==============================================
echo.
echo Redeploying send-admin-sms function with secrets...
npx supabase functions deploy send-admin-sms --no-verify-jwt

echo.
echo Redeploying send-customer-sms function with secrets...
npx supabase functions deploy send-customer-sms --no-verify-jwt

echo.
echo ==============================================
echo COMPLETE! Functions deployed with secrets.
echo ==============================================
echo.
echo Test now with: powershell -ExecutionPolicy Bypass -File test_sms_direct.ps1
echo.
pause
