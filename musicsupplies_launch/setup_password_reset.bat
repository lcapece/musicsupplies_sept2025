@echo off
echo ========================================
echo SETUP PASSWORD RESET TABLE
echo ========================================
echo.

echo Step 1: Applying the database migration...
npx supabase db push --password %SUPABASE_DATABASE_PASSWORD% < create_password_reset_tokens_table.sql

echo.
echo ========================================
echo SETUP COMPLETE
echo ========================================
