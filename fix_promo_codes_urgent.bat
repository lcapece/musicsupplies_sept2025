@echo off
echo.
echo ========================================
echo URGENT: Fixing SAVE10 Promo Code Issue
echo ========================================
echo.
echo This will update SAVE10 (and other promo codes) to be single-use per account.
echo Account 101 has used SAVE10 5 times! This needs to stop immediately.
echo.

set /p CONFIRM=Type YES to apply the fix: 
if /i "%CONFIRM%" neq "YES" (
    echo Operation cancelled.
    exit /b 1
)

echo.
echo Applying promo code fix...
npx supabase migration up --file supabase/migrations/20250728_fix_save10_single_use.sql

echo.
echo Fix applied! SAVE10 is now limited to one use per account.
echo.
pause
