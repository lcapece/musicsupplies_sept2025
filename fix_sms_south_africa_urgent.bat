@echo off
echo ==============================================
echo CRITICAL SMS FIX FOR SOUTH AFRICA
echo ==============================================
echo.
echo URGENT: This will help fix SMS for children in South Africa
echo.
echo Your ClickSend Credentials:
echo Username: lcapece@optonline.net
echo API Key: EE8B20BD-7C92-2FB1-3AE0-16C2AB80B814
echo.
echo =============================================
echo STEP 1: Update Supabase Environment Variables
echo =============================================
echo.
echo You MUST manually update these in the Supabase Dashboard:
echo.
echo 1. Open: https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/functions
echo 2. Click on "send-admin-sms" function
echo 3. Go to "Settings" tab
echo 4. Add these Environment Variables:
echo    CLICKSEND_USERNAME = lcapece@optonline.net
echo    CLICKSEND_API_KEY = EE8B20BD-7C92-2FB1-3AE0-16C2AB80B814
echo.
echo 5. Repeat for "send-customer-sms" function
echo.
pause
echo.
echo =============================================
echo STEP 2: Deploy Edge Functions
echo =============================================
echo.
echo Deploying edge functions with proper environment...
echo.

cd /d "%~dp0"

echo Linking to Supabase project...
npx supabase link --project-ref ekklokrukxmqlahtonnc

echo.
echo Setting function secrets...
echo lcapece@optonline.net:EE8B20BD-7C92-2FB1-3AE0-16C2AB80B814 | npx supabase secrets set CLICKSEND_USERNAME=lcapece@optonline.net CLICKSEND_API_KEY=EE8B20BD-7C92-2FB1-3AE0-16C2AB80B814

echo.
echo Deploying send-admin-sms function...
npx supabase functions deploy send-admin-sms

echo.
echo Deploying send-customer-sms function...
npx supabase functions deploy send-customer-sms

echo.
echo =============================================
echo STEP 3: Test SMS Authentication
echo =============================================
echo.
echo Running authentication test...
powershell -ExecutionPolicy Bypass -File test_clicksend_auth.ps1

echo.
echo =============================================
echo CRITICAL NEXT STEPS:
echo =============================================
echo.
echo 1. Check the test results above
echo 2. If authentication failed, verify credentials with ClickSend
echo 3. Replace test phone number in test_clicksend_auth.ps1 with actual South African number
echo 4. Test ad hoc SMS from the admin dashboard
echo.
echo For South African numbers, use format: +27XXXXXXXXX
echo.
pause
