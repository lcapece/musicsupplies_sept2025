@echo off
echo Executing 2FA setup SQL directly...

set SUPABASE_URL=https://ekklokrukxmqlahtonnc.supabase.co
set SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDA3MzE5NCwiZXhwIjoyMDU1NjQ5MTk0fQ.ZsVqBj8TaF5RbILv-JOlXWzQjNFI5yt5Yqn5cQMkgzw

echo Step 1: Populate sms_admins table...
powershell -Command "try { $body = @{ sql_query = 'INSERT INTO public.sms_admins (phone_number, is_active, notes) VALUES (''+15164550980'', true, ''Primary admin''), (''+15164107455'', true, ''Secondary admin''), (''+15167650816'', true, ''Tertiary admin'') ON CONFLICT (phone_number) DO UPDATE SET is_active = true;' } | ConvertTo-Json; $headers = @{ ''Authorization'' = ''Bearer %SERVICE_KEY%''; ''Content-Type'' = ''application/json''; ''apikey'' = ''%SERVICE_KEY%'' }; $result = Invoke-RestMethod -Uri ''%SUPABASE_URL%/rest/v1/rpc/exec_sql'' -Method POST -Headers $headers -Body $body; Write-Host ''Success: SMS admins populated'' } catch { Write-Host ''Error:'' $_.Exception.Message }"

echo Step 2: Verify sms_admins table...
powershell -Command "try { $body = @{ sql_query = 'SELECT phone_number, is_active, notes FROM public.sms_admins WHERE is_active = true;' } | ConvertTo-Json; $headers = @{ ''Authorization'' = ''Bearer %SERVICE_KEY%''; ''Content-Type'' = ''application/json''; ''apikey'' = ''%SERVICE_KEY%'' }; $result = Invoke-RestMethod -Uri ''%SUPABASE_URL%/rest/v1/rpc/exec_sql'' -Method POST -Headers $headers -Body $body; Write-Host ''Active SMS Admins:'' $result } catch { Write-Host ''Error:'' $_.Exception.Message }"

echo Step 3: Clean up expired codes...
powershell -Command "try { $body = @{ sql_query = 'DELETE FROM public.admin_logins WHERE account_number = 999 AND expires_at < NOW();' } | ConvertTo-Json; $headers = @{ ''Authorization'' = ''Bearer %SERVICE_KEY%''; ''Content-Type'' = ''application/json''; ''apikey'' = ''%SERVICE_KEY%'' }; $result = Invoke-RestMethod -Uri ''%SUPABASE_URL%/rest/v1/rpc/exec_sql'' -Method POST -Headers $headers -Body $body; Write-Host ''Expired codes cleaned up:'' $result } catch { Write-Host ''Error:'' $_.Exception.Message }"

echo 2FA setup completed!
pause