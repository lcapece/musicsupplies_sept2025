@echo off
echo ==============================================
echo SETTING CLICKSEND SECRETS MANUALLY
echo ==============================================
echo.
echo Setting CLICKSEND_USERNAME to: lcapece@optonline.net
npx supabase secrets set CLICKSEND_USERNAME=lcapece@optonline.net

echo.
echo Setting CLICKSEND_API_KEY...
npx supabase secrets set CLICKSEND_API_KEY=EE8B20BD-7C92-2FB1-3AE0-16C2AB80B814

echo.
echo ==============================================
echo Listing current secrets to verify...
echo ==============================================
npx supabase secrets list

echo.
echo ==============================================
echo Now redeploying edge functions with secrets...
echo ==============================================
echo.
echo Deploying send-admin-sms...
npx supabase functions deploy send-admin-sms --no-verify-jwt

echo.
echo Deploying send-customer-sms...
npx supabase functions deploy send-customer-sms --no-verify-jwt

echo.
echo ==============================================
echo DONE! Test with: powershell -ExecutionPolicy Bypass -File test_sms_direct.ps1
echo ==============================================
pause
