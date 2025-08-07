# Test a working edge function to verify URL pattern
Write-Host "Testing a working edge function first..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/send-mailgun-email" -Method Post -Headers @{"Content-Type" = "application/json"} -Body '{"to":"test@test.com","subject":"test","text":"test"}' -UseBasicParsing
    
    Write-Host "Response Status: $($response.StatusCode)"
    Write-Host "Response Content: $($response.Content)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Error Details: $($_.ErrorDetails.Message)"
    if ($_.Exception.Response) {
        Write-Host "HTTP Status: $($_.Exception.Response.StatusCode.value__)"
    }
}
