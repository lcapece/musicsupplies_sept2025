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
Write-Host "=" * 60 -ForegroundColor Gray

$successCount = 0
$failureCount = 0
$results = @()

foreach ($phone in $adminPhones) {
    Write-Host "`nSending SMS to: $phone" -ForegroundColor Yellow
    
    $body = @{
        to = $phone
        message = "Admin 2FA Test: Your verification code is 123456 (test message sent at $(Get-Date -Format 'HH:mm:ss'))"
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri $functionUrl -Method Post -Headers $headers -Body $body -ContentType "application/json"
        
        Write-Host "  ✓ SUCCESS" -ForegroundColor Green
        Write-Host "  Message ID: $($response.clicksendResponse.data.messages[0].message_id)" -ForegroundColor Gray
        Write-Host "  Cost: `$$($response.clicksendResponse.data.messages[0].message_price) USD" -ForegroundColor Gray
        
        $successCount++
        $results += @{
            phone = $phone
            status = "SUCCESS"
            messageId = $response.clicksendResponse.data.messages[0].message_id
            cost = $response.clicksendResponse.data.messages[0].message_price
        }
    } catch {
        Write-Host "  ✗ FAILED" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        
        $failureCount++
        $results += @{
            phone = $phone
            status = "FAILED"
            error = $_.Exception.Message
        }
    }
    
    # Small delay between messages to avoid rate limiting
    Start-Sleep -Milliseconds 500
}

Write-Host "`n" + ("=" * 60) -ForegroundColor Gray
Write-Host "SUMMARY:" -ForegroundColor Cyan
Write-Host "  Total phones: $($adminPhones.Count)" -ForegroundColor White
Write-Host "  Successful: $successCount" -ForegroundColor Green
Write-Host "  Failed: $failureCount" -ForegroundColor $(if ($failureCount -gt 0) { "Red" } else { "Gray" })

# Calculate total cost
$totalCost = 0
foreach ($result in $results) {
    if ($result.cost) {
        $totalCost += [decimal]$result.cost
    }
}
Write-Host "  Total cost: `$$totalCost USD" -ForegroundColor Yellow

Write-Host "`nDETAILED RESULTS:" -ForegroundColor Cyan
$results | ForEach-Object {
    $result = $_
    $statusColor = if ($result.status -eq "SUCCESS") { "Green" } else { "Red" }
    Write-Host "`n  Phone: $($result.phone)" -ForegroundColor White
    Write-Host "  Status: $($result.status)" -ForegroundColor $statusColor
    if ($result.messageId) {
        Write-Host "  Message ID: $($result.messageId)" -ForegroundColor Gray
        Write-Host "  Cost: `$$($result.cost)" -ForegroundColor Gray
    }
    if ($result.error) {
        Write-Host "  Error: $($result.error)" -ForegroundColor Red
    }
}

Write-Host "`nMulti-phone SMS test completed!" -ForegroundColor Green
Write-Host "All admin users (999) would receive 2FA codes via SMS." -ForegroundColor Cyan
