# Test the authenticate-with-master-password edge function with no auth headers
Write-Host "Testing master password authentication with no auth headers..." -ForegroundColor Yellow

$body = @{
    accountNumber = "999"
    password = "Music123"
} | ConvertTo-Json

Write-Host "URL: https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/authenticate-with-master-password"
Write-Host "Body: $body"

try {
    $headers = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k"
        "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k"
    }
    $response = Invoke-WebRequest -Uri "https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/authenticate-with-master-password" -Method Post -Headers $headers -Body $body -UseBasicParsing
    
    Write-Host "Response Status: $($response.StatusCode)"
    Write-Host "Response Content: $($response.Content)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Error Details: $($_.ErrorDetails.Message)"
    if ($_.Exception.Response) {
        Write-Host "HTTP Status: $($_.Exception.Response.StatusCode.value__)"
    }
}
