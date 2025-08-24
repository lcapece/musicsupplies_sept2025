$ErrorActionPreference = 'Stop'

# Supabase REST base and service role key
$base = 'https://ekklokrukxmqlahtonnc.supabase.co/rest/v1'
$key  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDA3MzE5NCwiZXhwIjoyMDU1NjQ5MTk0fQ.ZsVqBj8TaF5RbILv-JOlXWzQjNFI5yt5Yqn5cQMkgzw'

$headers = @{
  'Authorization' = "Bearer $key"
  'apikey'        = $key
  'Content-Type'  = 'application/json'
}

Write-Host '--- sms_notification_settings (2FA_LOGIN) ---'
$u1 = "$base/sms_notification_settings?event_name=eq.2FA_LOGIN&select=event_name,is_enabled,notification_phones"
try {
  $r1 = Invoke-RestMethod -Uri $u1 -Headers $headers -Method GET
  $r1 | ConvertTo-Json -Depth 10
} catch {
  Write-Warning "Failed to query sms_notification_settings: $($_.Exception.Message)"
}

Write-Host ''
Write-Host '--- legacy public."2fa" phones ---'
$u2 = "$base/2fa?select=phonenumber"
try {
  $r2 = Invoke-RestMethod -Uri $u2 -Headers $headers -Method GET
  $r2 | ConvertTo-Json -Depth 10
} catch {
  Write-Warning "Failed to query legacy 2fa table: $($_.Exception.Message)"
}
