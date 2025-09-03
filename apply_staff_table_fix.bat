@echo off
echo Applying staff table RLS policy fixes...
echo.

REM Get Supabase project details from environment or use defaults
set SUPABASE_URL=https://ekklokrukxmqlahtonnc.supabase.co
set SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMzU2NzQ5NCwiZXhwIjoyMDM5MTQzNDk0fQ.4EFWJNdJ5aOKWUeWqiDnKJZe8JZFZz5-p7HZQQJZQQs

echo Executing SQL fix via curl...
curl -X POST "%SUPABASE_URL%/rest/v1/rpc/exec_sql" ^
  -H "apikey: %SUPABASE_SERVICE_KEY%" ^
  -H "Authorization: Bearer %SUPABASE_SERVICE_KEY%" ^
  -H "Content-Type: application/json" ^
  -d @fix_staff_table_access.sql

echo.
echo Fix applied! Please refresh your browser and try accessing /test997 again.
echo.
pause
