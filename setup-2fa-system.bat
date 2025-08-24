@echo off
setlocal

echo 🚀 Setting up 2FA system for account 999...
echo 📡 Connecting to Supabase...

set SUPABASE_URL=https://ekklokrukxmqlahtonnc.supabase.co
set SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDA3MzE5NCwiZXhwIjoyMDU1NjQ5MTk0fQ.ZsVqBj8TaF5RbILv-JOlXWzQjNFI5yt5Yqn5cQMkgzw

echo.
echo 🔍 Testing connection...
curl -s -o nul -w "HTTP Status: %%{http_code}" -H "Authorization: Bearer %SERVICE_KEY%" -H "apikey: %SERVICE_KEY%" "%SUPABASE_URL%/rest/v1/accounts_lcmd?select=count&limit=1"
echo.

echo.
echo 🔄 Executing 2FA phone setup...
powershell -Command "$sql = Get-Content 'setup-2fa-phones.sql' -Raw; $body = @{ sql_query = $sql } | ConvertTo-Json -Depth 10; $headers = @{ 'Authorization' = 'Bearer %SERVICE_KEY%'; 'Content-Type' = 'application/json'; 'apikey' = '%SERVICE_KEY%' }; try { $result = Invoke-RestMethod -Uri '%SUPABASE_URL%/rest/v1/rpc/exec_sql' -Method POST -Headers $headers -Body $body; Write-Host '✅ Success:' $result } catch { Write-Host '❌ Error:' $_.Exception.Message }"

echo.
echo 🎉 2FA system setup completed!
echo.
echo ✅ The system should now have:
echo    - SMS admin phones configured (+15164550980, +15164107455, +15167650816)
echo    - 2FA notification settings updated
echo    - Expired codes cleaned up for account 999
echo    - All verification queries executed
echo.
pause