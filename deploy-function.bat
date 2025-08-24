@echo off
echo Starting deployment of admin-2fa-handler function...
cd "C:\Users\ryanh\rc10\musicsupplies_rc10"
npx supabase functions deploy admin-2fa-handler --project-ref ekklokrukxmqlahtonnc
echo Deployment command completed.
echo.
echo Testing function endpoint...
node test-function.js
echo Done.