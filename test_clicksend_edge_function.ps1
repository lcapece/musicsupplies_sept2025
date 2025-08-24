# Test ClickSend SMS via Edge Function
$ErrorActionPreference = "Stop"

# Get environment variables
$env:SUPABASE_URL = "https://ekklokrukxmqlahtonnc.supabase.co"
$env:SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE5MjU0NzAsImV4cCI6MjAzNzUwMTQ3MH0.Dkxicm9oaLu-IYSB9OY5w7uJFVO8RL9dojVOL5U_J7E"

# Test parameters
$phoneNumber = "+15164550980"
$message = "Test SMS from Supabase Edge Function via ClickSend. Secrets: CLICKSEND_API_KEY and CLICKSEND_USERID are working!"

Write-Host "Testing ClickSend SMS via Edge Function..." -ForegroundColor Cyan
Write-Host "Phone: $phoneNumber" -ForegroundColor Yellow
Write-Host "Message: $message" -ForegroundColor Yellow

# Prepare request body
$body = @{
    phone_number = $phoneNumber
    message = $message
} | ConvertTo-Json

# Call the Edge function
try {
    $response = Invoke-RestMethod `
        -Uri "$($env:SUPABASE_URL)/functions/v1/test-clicksend-sms" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $($env:SUPABASE_ANON_KEY)"
            "Content-Type" = "application/json"
        } `
        -Body $body

    Write-Host "`nSuccess! SMS sent successfully." -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10 | Write-Host
} catch {
    Write-Host "`nError occurred:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "`nError details:" -ForegroundColor Red
        Write-Host $errorBody
    }
}
