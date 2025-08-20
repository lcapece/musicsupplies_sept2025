@echo off
echo 🚀 Executing requested SQL files against Supabase database...
echo.

echo 🔄 Step 1: Executing EMERGENCY_AUTH_FIX_FINAL.sql...
npx supabase db push --file EMERGENCY_AUTH_FIX_FINAL.sql --db-url "postgresql://postgres.ekklokrukxmqlahtonnc:M6wMp&2ecHBw@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
if errorlevel 1 (
    echo ❌ Failed to execute EMERGENCY_AUTH_FIX_FINAL.sql
    pause
    exit /b 1
)
echo ✅ EMERGENCY_AUTH_FIX_FINAL.sql executed successfully!
echo.

echo 🔄 Step 2: Executing 2FA_SETUP.sql...
npx supabase db push --file 2FA_SETUP.sql --db-url "postgresql://postgres.ekklokrukxmqlahtonnc:M6wMp&2ecHBw@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
if errorlevel 1 (
    echo ❌ Failed to execute 2FA_SETUP.sql
    pause
    exit /b 1
)
echo ✅ 2FA_SETUP.sql executed successfully!
echo.

echo 🔄 Step 3: Executing ADD_2FA_PHONES.sql...
npx supabase db push --file ADD_2FA_PHONES.sql --db-url "postgresql://postgres.ekklokrukxmqlahtonnc:M6wMp&2ecHBw@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
if errorlevel 1 (
    echo ❌ Failed to execute ADD_2FA_PHONES.sql
    pause
    exit /b 1
)
echo ✅ ADD_2FA_PHONES.sql executed successfully!
echo.

echo 🎉 ALL SQL FILES EXECUTED SUCCESSFULLY!
echo.
echo ✅ Your authentication system has been updated with:
echo    📋 Emergency authentication fix applied
echo    🔐 2FA system setup for account 999
echo    📱 Phone numbers added for 2FA notifications
echo.
echo The following changes have been made:
echo    1. Fixed authentication system security vulnerabilities
echo    2. Created 2FA tables and functions
echo    3. Enhanced authenticate_user function with 2FA support
echo    4. Added phone numbers for SMS notifications
echo.
pause