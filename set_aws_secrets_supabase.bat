@echo off
echo Setting AWS credentials in Supabase Edge Function secrets...
echo.

echo Please enter your AWS credentials:
echo.

set /p AWS_ACCESS_KEY_ID="Enter AWS_ACCESS_KEY_ID: "
set /p AWS_SECRET_ACCESS_KEY="Enter AWS_SECRET_ACCESS_KEY: "
set /p AWS_REGION="Enter AWS_REGION (default: us-east-1): "

if "%AWS_REGION%"=="" set AWS_REGION=us-east-1

echo.
echo Setting secrets in Supabase...
echo.

npx supabase secrets set AWS_ACCESS_KEY_ID=%AWS_ACCESS_KEY_ID% --project-ref ekklokrukxmqlahtonnc
npx supabase secrets set AWS_SECRET_ACCESS_KEY=%AWS_SECRET_ACCESS_KEY% --project-ref ekklokrukxmqlahtonnc
npx supabase secrets set AWS_REGION=%AWS_REGION% --project-ref ekklokrukxmqlahtonnc

echo.
echo AWS credentials have been set in Supabase Edge Function secrets!
echo.
echo The edge function will restart automatically to use the new credentials.
echo.
pause
