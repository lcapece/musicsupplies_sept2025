@echo off
echo Creating PostgreSQL RPC function to bypass 1000-row limit...
echo.

REM Execute the SQL file to create the RPC function
psql -h db.ixqjqvqfqjqjqvqfqjqj.supabase.co -p 5432 -U postgres -d postgres -f create_get_all_products_rpc.sql

echo.
echo RPC function creation completed!
echo You can now refresh the Test997 page to load all 3407+ records.
pause
