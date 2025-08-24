$ErrorActionPreference = 'Stop'

$uri = 'https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/send-admin-sms'
$key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDA3MzE5NCwiZXhwIjoyMDU1NjQ5MTk0fQ.ZsVqBj8TaF5RbILv-JOlXWzQjNFI5yt5Yqn5cQMkgzw'

$headers = @{
  'Content-Type' = 'application/json'
  'Authorization' = "Bearer $key"
  'apikey'        = $key
}

$bodyObj = @{
  eventName    = 'adhoc_sms'
  message      = 'MusicSupplies test SMS'
  customPhones = @('+15164550980')
}
$body = $bodyObj | ConvertTo-Json -Depth 5

try {
  $resp = Invoke-RestMethod -Uri $uri -Method POST -Headers $headers -Body $body
  $resp | ConvertTo-Json -Depth 10 | Write-Host
} catch {
  Write-Error "Edge function call failed: $($_.Exception.Message)"
  if ($_.Exception.Response -and $_.Exception.Response.GetResponseStream()) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $respText = $reader.ReadToEnd() | Out-String
    Write-Host "Response body:`n$respText"
  }
  exit 1
}
