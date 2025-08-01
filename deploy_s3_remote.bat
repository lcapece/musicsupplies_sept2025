@echo off
echo ============================================
echo Remote S3 Edge Function Deployment
echo ============================================
echo.
echo This script deploys directly to Supabase (no Docker needed)
echo.

echo Step 1: Linking to remote project...
echo Please enter your Supabase project reference:
set /p PROJECT_REF="Project Reference (e.g., ekklokrukxmqlahtonnc): "

echo.
echo Linking to project...
call supabase link --project-ref %PROJECT_REF%

echo.
echo Step 2: Deploying edge function remotely...
call supabase functions deploy list-s3-files --no-verify-jwt --project-ref %PROJECT_REF%

echo.
echo ============================================
echo Deployment Complete!
echo ============================================
echo.
echo The edge function has been deployed.
echo AWS credentials are already configured in your Supabase vault.
echo.
echo You can now test the Image Management tab!
echo.
pause
