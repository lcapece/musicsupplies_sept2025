# Test script to send SMS to multiple admin phones via ClickSend
# This simulates sending 2FA codes to all admin users

$supabaseUrl = "https://ekklokrukxmqlahtonnc.supabase.co"
$supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k"

# Use the existing test-clicksend-backend function
$functionUrl = "$supabaseUrl/functions/v1/test-clicksend-backend"

# Admin phone numbers to send to
$adminPhones = @(
    "+15164550980",
    "+15164107455"
)

$headers = @{
    "Authorization" = "Bearer $supabaseAnonKey"
    "Content-Type" = "application/json"
}

Write-Host "Testing SMS delivery to multiple admin phones for account 999..." -ForegroundColor Cyan
Write-Host "Total admin phones: $($adminPhones.Count)" -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor Gray

$successCount = 0
$failureCount = 0

foreach ($phone in $adminPhones) {
    Write-Host ""
    Write-Host "Sending SMS to: $phone" -ForegroundColor Yellow
    
    $timestamp = Get-Date -Format 'HH:mm:ss'
    $message = "Admin 2FA Test: Your verification code is 123456 (test message sent at $timestamp)"
    
    $body = @{
        to = $phone
        message = $message
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri $functionUrl -Method Post -Headers $headers -Body $body -ContentType "application/json"
        
        Write-Host "  SUCCESS" -ForegroundColor Green
        Write-Host "  Message ID: $($response.clicksendResponse.data.messages[0].message_id)" -ForegroundColor Gray
        Write-Host "  Cost: $($response.clicksendResponse.data.messages[0].message_price) USD" -ForegroundColor Gray
        
        $successCount++
    } catch {
        Write-Host "  FAILED" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        
        $failureCount++
    }
    
    # Small delay between messages to avoid rate limiting
    Start-Sleep -Milliseconds 500
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Gray
Write-Host "SUMMARY:" -ForegroundColor Cyan
Write-Host "  Total phones: $($adminPhones.Count)" -ForegroundColor White
Write-Host "  Successful: $successCount" -ForegroundColor Green
if ($failureCount -gt 0) {
    Write-Host "  Failed: $failureCount" -ForegroundColor Red
} else {
    Write-Host "  Failed: $failureCount" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Multi-phone SMS test completed!" -ForegroundColor Green
Write-Host "All admin users (999) would receive 2FA codes via SMS." -ForegroundColor Cyan
