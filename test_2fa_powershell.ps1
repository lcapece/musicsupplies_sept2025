# Test the admin-2fa-handler Edge function directly
$ErrorActionPreference = 'Stop'

$url = 'https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/admin-2fa-handler/generate'
$anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k'

$headers = @{
    'Authorization' = "Bearer $anonKey"
    'Content-Type' = 'application/json'
}

$body = @{
    account_number = 999
} | ConvertTo-Json

Write-Host "Testing admin-2fa-handler Edge function..."
Write-Host "URL: $url"

try {
    $response = Invoke-WebRequest -Uri $url -Method POST -Headers $headers -Body $body -UseBasicParsing
    Write-Host "✅ SUCCESS!"
    Write-Host "Status Code: $($response.StatusCode)"
    Write-Host "Response Body: $($response.Content)"
} catch {
    Write-Host "❌ ERROR!"
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
    }
}