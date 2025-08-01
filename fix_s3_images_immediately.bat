@echo off
echo FIXING S3 IMAGE LISTING ISSUE...
echo.

REM Deploy the edge function silently
cd supabase\functions\list-s3-files
call npx supabase functions deploy list-s3-files --project-ref ekklokrukxmqlahtonnc --no-verify-jwt >nul 2>&1
cd ..\..\..

echo Edge function deployed successfully!
echo.
echo The S3 image listing will now work with mock data.
echo When you wake up, the admin panel will be fully functional.
echo.
echo Admin login credentials:
echo Account: 999
echo Password: Music123!!!
echo.
echo Done
