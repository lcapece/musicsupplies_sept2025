# Test Account 115 Login with Monday123$ password
$accountNumber = "115"
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
    Write-Host "Testing Account 115 login with password: Monday123$" -ForegroundColor Yellow
    
    $response = Invoke-RestMethod -Uri "$env:SUPABASE_URL/functions/v1/authenticate-with-master-password" -Method POST -Body $body -Headers $headers
    
    Write-Host "SUCCESS: Login working!" -ForegroundColor Green
    Write-Host "Account Number: $($response.account.account_number)"
    Write-Host "Account Name: $($response.account.acct_name)"
    Write-Host "Login Type: $($response.loginType)"
    
} catch {
    Write-Host "ERROR: Login failed!" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
    Write-Host "Error Message: $($_.Exception.Response | ConvertFrom-Json | ConvertTo-Json -Depth 5)"
}
