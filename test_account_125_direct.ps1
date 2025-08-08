# Test Account 125 Login Directly
$accountNumber = "125"
$password = "Monday123$"

$body = @{
    accountNumber = $accountNumber
    password = $password
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "apikey" = "$env:SUPABASE_ANON_KEY"
    "Authorization" = "Bearer $env:SUPABASE_ANON_KEY"
}

try {
    Write-Host "Testing Account 125 directly with password: Monday123$" -ForegroundColor Yellow
    Write-Host "URL: $env:SUPABASE_URL/functions/v1/authenticate-with-master-password" -ForegroundColor Cyan
    
    $response = Invoke-RestMethod -Uri "$env:SUPABASE_URL/functions/v1/authenticate-with-master-password" -Method POST -Body $body -Headers $headers
    
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5
    
} catch {
    Write-Host "FAILED!" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
    
    $errorStream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($errorStream)
    $responseBody = $reader.ReadToEnd()
    Write-Host "Error Response Body: $responseBody" -ForegroundColor Red
}
