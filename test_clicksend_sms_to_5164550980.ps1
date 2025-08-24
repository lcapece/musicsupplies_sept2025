# Test script to send SMS via ClickSend using Edge secrets
# Target phone: +15164550980

$supabaseUrl = "https://ekklokrukxmqlahtonnc.supabase.co"
$supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k"

# Use the existing test-clicksend-backend function
$functionUrl = "$supabaseUrl/functions/v1/test-clicksend-backend"

$headers = @{
    "Authorization" = "Bearer $supabaseAnonKey"
    "Content-Type" = "application/json"
}

$body = @{
    to = "+15164550980"
    message = "Test SMS from backend via ClickSend Edge secrets - sent at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
} | ConvertTo-Json

Write-Host "Sending test SMS to +15164550980..." -ForegroundColor Cyan
Write-Host "Using Edge function: $functionUrl" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri $functionUrl -Method Post -Headers $headers -Body $body -ContentType "application/json"
    
    Write-Host "`nSuccess! SMS sent successfully" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 10 | Write-Host
    
    if ($response.clicksendResponse) {
        Write-Host "`nClickSend Response Details:" -ForegroundColor Cyan
        $response.clicksendResponse | ConvertTo-Json -Depth 10 | Write-Host
    }
} catch {
    Write-Host "`nError sending SMS:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "`nError details:" -ForegroundColor Red
        Write-Host $errorBody
    }
}
