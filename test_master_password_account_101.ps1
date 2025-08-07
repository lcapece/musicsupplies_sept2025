# Load environment variables
$envFile = Get-Content .env
foreach ($line in $envFile) {
    if ($line -match '^\s*([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        Set-Item -Path "env:$name" -Value $value
    }
}

$headers = @{
    'Authorization' = "Bearer $env:VITE_SUPABASE_ANON_KEY"
    'apikey' = $env:VITE_SUPABASE_ANON_KEY
    'Content-Type' = 'application/json'
}

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Testing Account 101 Authentication" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Regular password for account 101
Write-Host "TEST 1: Regular password for account 101" -ForegroundColor Yellow
$body = @{
    accountNumber = '101'
    password = 'Ryanowenbreanne3'
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri 'https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/authenticate-with-master-password' -Method POST -Headers $headers -Body $body
    Write-Host "✓ Success with regular password!" -ForegroundColor Green
    Write-Host "Login Type: $($response.loginType)" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed with regular password" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Master password for account 101
Write-Host "TEST 2: Master password (Music123) for account 101" -ForegroundColor Yellow
$body = @{
    accountNumber = '101'
    password = 'Music123'
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri 'https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/authenticate-with-master-password' -Method POST -Headers $headers -Body $body
    Write-Host "✓ Success with master password!" -ForegroundColor Green
    Write-Host "Login Type: $($response.loginType)" -ForegroundColor Green
    Write-Host "Account Number: $($response.account.account_number)" -ForegroundColor Green
    Write-Host "Account Name: $($response.account.acct_name)" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed with master password" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}
