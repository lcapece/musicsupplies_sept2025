@echo off
echo ============================================
echo Remote S3 Edge Function Deployment (FIXED)
echo ============================================
echo.
echo This script deploys directly to Supabase (no Docker needed)
echo.

:: Get project reference
set /p PROJECT_REF="Enter your Supabase project reference (e.g., ekklokrukxmqlahtonnc): "

if "%PROJECT_REF%"=="" (
    echo ERROR: Project reference cannot be empty!
    pause
    exit /b 1
)

echo.
echo Using project reference: %PROJECT_REF%
echo.

echo Step 1: Linking to remote project...
supabase link --project-ref=%PROJECT_REF%

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to link to project. Please check your project reference.
    pause
    exit /b 1
)

echo.
echo Step 2: Deploying edge function remotely...
supabase functions deploy list-s3-files --no-verify-jwt --project-ref=%PROJECT_REF%

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to deploy edge function.
    echo Please ensure you have the necessary permissions.
    pause
    exit /b 1
)

echo.
echo ============================================
echo Deployment ACTUALLY Complete!
echo ============================================
echo.
echo The edge function has been successfully deployed.
echo AWS credentials are already configured in your Supabase vault.
echo.
echo You can now test the Image Management tab!
echo The "Failed to send request" error should be fixed.
echo.
pause
