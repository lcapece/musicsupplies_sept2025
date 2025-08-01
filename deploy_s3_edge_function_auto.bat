@echo off
echo Deploying S3 Edge Function (Auto mode - no prompts)...
echo.

cd supabase\functions\list-s3-files

echo Installing dependencies if needed...
call npm install -g supabase --silent 2>nul

echo.
echo Deploying function to Supabase...
call npx supabase functions deploy list-s3-files --project-ref ekklokrukxmqlahtonnc --no-verify-jwt

echo.
echo Testing the deployed function...
powershell -Command "$headers = @{'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k'; 'Content-Type' = 'application/json'}; try { $response = Invoke-RestMethod -Uri 'https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/list-s3-files' -Headers $headers -Method Get; Write-Host 'SUCCESS! Edge function is working:' -ForegroundColor Green; $response | ConvertTo-Json -Depth 10 } catch { Write-Host 'ERROR:' $_.Exception.Message -ForegroundColor Red }"

cd ..\..\..

echo.
echo Deployment complete!
echo.
pause
