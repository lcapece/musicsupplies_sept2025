@echo off
echo ========================================
echo Setting Admin Account 999 Password
echo ========================================
echo.
echo This will set the password for account 999 to use the standard authentication system
echo Password will be: 2750grove
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause >nul

echo.
echo Applying password update to Supabase...

npx supabase db push --db-url "postgresql://postgres.ekklokrukxmqlahtonnc:A7890-musicsupp!!@aws-0-us-east-1.pooler.supabase.com:6543/postgres" < set_admin_999_password.sql

echo.
echo ========================================
echo Password Update Complete!
echo ========================================
echo.
echo Account 999 can now login with:
echo   Account: 999
echo   Password: 2750grove
echo.
echo The account now uses the standard authentication system
echo (no more hardcoded passwords in the code)
echo.
pause