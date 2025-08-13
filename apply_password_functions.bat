@echo off
echo ========================================
echo Creating Password Management Functions
echo ========================================
echo.
echo This will create functions to safely change passwords through the admin UI
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause >nul

echo.
echo Creating functions in Supabase...

npx supabase db push --db-url "postgresql://postgres.ekklokrukxmqlahtonnc:A7890-musicsupp!!@aws-0-us-east-1.pooler.supabase.com:6543/postgres" < create_password_update_function.sql

echo.
echo ========================================
echo Functions Created Successfully!
echo ========================================
echo.
echo You can now change the admin password through:
echo   1. Admin Dashboard → Security tab
echo   2. Enter current password
echo   3. Enter new password
echo   4. Click "Change Password"
echo.
pause