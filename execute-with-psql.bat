@echo off
setlocal

set PGPASSWORD=M6wMp^&2ecHBw
set DB_URL=postgresql://postgres.ekklokrukxmqlahtonnc:M6wMp^&2ecHBw@aws-0-us-west-1.pooler.supabase.com:6543/postgres

echo 🚀 Executing SQL files using psql...
echo.

echo 🔄 Step 1: Executing EMERGENCY_AUTH_FIX_FINAL.sql...
psql "%DB_URL%" -f "EMERGENCY_AUTH_FIX_FINAL.sql"
if errorlevel 1 (
    echo ❌ Failed to execute EMERGENCY_AUTH_FIX_FINAL.sql
    pause
    exit /b 1
)
echo ✅ Step 1 completed!
echo.

echo 🔄 Step 2: Executing 2FA_SETUP.sql...
psql "%DB_URL%" -f "2FA_SETUP.sql"
if errorlevel 1 (
    echo ❌ Failed to execute 2FA_SETUP.sql
    pause
    exit /b 1
)
echo ✅ Step 2 completed!
echo.

echo 🔄 Step 3: Executing ADD_2FA_PHONES.sql...
psql "%DB_URL%" -f "ADD_2FA_PHONES.sql"
if errorlevel 1 (
    echo ❌ Failed to execute ADD_2FA_PHONES.sql
    pause
    exit /b 1
)
echo ✅ Step 3 completed!
echo.

echo 🎉 ALL SQL FILES EXECUTED SUCCESSFULLY!
echo.
echo Your authentication system has been updated with:
echo - Emergency authentication fix applied
echo - 2FA system setup for account 999
echo - Phone numbers added for 2FA notifications
echo.
pause