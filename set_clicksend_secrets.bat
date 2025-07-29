@echo off
echo ==============================================
echo SETTING CLICKSEND SECRETS IN SUPABASE
echo ==============================================
echo.
echo This will set the ClickSend credentials as secrets in your Supabase project.
echo.
echo Your credentials:
echo Username: lcapece@optonline.net
echo API Key: EE8B20BD-7C92-2FB1-3AE0-16C2AB80B814
echo.
pause

cd /d "%~dp0"

echo.
echo Setting CLICKSEND_USERNAME...
echo lcapece@optonline.net | npx supabase secrets set CLICKSEND_USERNAME

echo.
echo Setting CLICKSEND_API_KEY...
echo EE8B20BD-7C92-2FB1-3AE0-16C2AB80B814 | npx supabase secrets set CLICKSEND_API_KEY

echo.
echo ==============================================
echo IMPORTANT: After setting secrets, you MUST redeploy the edge functions!
echo ==============================================
echo.
echo Redeploying send-admin-sms function...
npx supabase functions deploy send-admin-sms --no-verify-jwt

echo.
echo Redeploying send-customer-sms function...
npx supabase functions deploy send-customer-sms --no-verify-jwt

echo.
echo ==============================================
echo DONE! Secrets set and functions redeployed.
echo ==============================================
echo.
echo Test the SMS system with: powershell -ExecutionPolicy Bypass -File test_sms_direct.ps1
echo.
pause
