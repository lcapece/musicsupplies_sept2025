# Test the authenticate-with-master-password edge function with no auth headers
Write-Host "Testing master password authentication..." -ForegroundColor Yellow

$body = @{
    accountNumber = "999"
    password = "Music123"
} | ConvertTo-Json

Write-Host "URL: https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/authenticate-with-master-password"
Write-Host "Body: $body"

try {
    $response = Invoke-WebRequest -Uri "https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/authenticate-with-master-password" -Method Post -Headers @{"Content-Type" = "application/json"} -Body $body -UseBasicParsing
    
    Write-Host "Response Status: $($response.StatusCode)"
    Write-Host "Response Content: $($response.Content)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Error Details: $($_.ErrorDetails.Message)"
    if ($_.Exception.Response) {
        Write-Host "HTTP Status: $($_.Exception.Response.StatusCode.value__)"
    }
}
