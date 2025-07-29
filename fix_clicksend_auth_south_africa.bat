@echo off
echo Setting ClickSend credentials for South Africa SMS...

:: Set the correct ClickSend credentials
supabase secrets set CLICKSEND_USERNAME="lcapece@optonline.net"
supabase secrets set CLICKSEND_API_KEY="EE8B20BD-7C92-2FB1-3AE0-16C2AB80B814"

echo ClickSend credentials have been set.
echo Username: lcapece@optonline.net
echo API Key: EE8B20BD-7C92-2FB1-3AE0-16C2AB80B814

echo.
echo Testing base64 encoding...
:: Calculate what the base64 auth should be
echo Username:APIKey = lcapece@optonline.net:EE8B20BD-7C92-2FB1-3AE0-16C2AB80B814

echo.
echo Deploying edge functions with updated credentials...
supabase functions deploy send-admin-sms
supabase functions deploy send-customer-sms

echo.
echo Setup complete! SMS should now work for South Africa.
pause
