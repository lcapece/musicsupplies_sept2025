@echo off
echo ============================================
echo Deploying S3 List Files Edge Function
echo ============================================
echo.

echo Step 1: Deploying edge function...
call supabase functions deploy list-s3-files

echo.
echo Step 2: Setting AWS credentials...
echo Please enter your AWS credentials:
echo.

set /p AWS_KEY="Enter AWS_ACCESS_KEY_ID: "
set /p AWS_SECRET="Enter AWS_SECRET_ACCESS_KEY: "
set /p AWS_REGION="Enter AWS_REGION (default: us-east-1): "

if "%AWS_REGION%"=="" set AWS_REGION=us-east-1

echo.
echo Setting secrets in Supabase...
call supabase secrets set AWS_ACCESS_KEY_ID=%AWS_KEY%
call supabase secrets set AWS_SECRET_ACCESS_KEY=%AWS_SECRET%
call supabase secrets set AWS_REGION=%AWS_REGION%

echo.
echo ============================================
echo Deployment Complete!
echo ============================================
echo.
echo The edge function has been deployed and configured.
echo You can now use the Image Management tab to fetch S3 files.
echo.
echo If you need to update credentials later, use:
echo   supabase secrets set AWS_ACCESS_KEY_ID=your-new-key
echo   supabase secrets set AWS_SECRET_ACCESS_KEY=your-new-secret
echo.
pause
