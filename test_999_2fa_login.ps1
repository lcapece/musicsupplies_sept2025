# Test 999 2FA Login Flow
$ErrorActionPreference = "Stop"

Write-Host "Testing 999 2FA Login Flow..." -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Load environment variables
$envPath = ".env"
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
}

$supabaseUrl = $env:VITE_SUPABASE_URL
$supabaseAnonKey = $env:VITE_SUPABASE_ANON_KEY

if (-not $supabaseUrl -or -not $supabaseAnonKey) {
    Write-Host "Error: Missing Supabase environment variables" -ForegroundColor Red
    exit 1
}

Write-Host "`nStep 1: Testing Edge Function directly..." -ForegroundColor Yellow
Write-Host "URL: $supabaseUrl/functions/v1/admin-2fa-handler/generate" -ForegroundColor Gray

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $supabaseAnonKey"
}

$body = @{
    account_number = 999
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$supabaseUrl/functions/v1/admin-2fa-handler/generate" -Method POST -Headers $headers -Body $body -UseBasicParsing
    
    Write-Host "`n✅ SUCCESS! Edge function called successfully" -ForegroundColor Green
    Write-Host "Response Status: $($response.StatusCode)" -ForegroundColor Green
    
    $jsonResponse = $response.Content | ConvertFrom-Json
    Write-Host "`nResponse Details:" -ForegroundColor Cyan
    $jsonResponse | ConvertTo-Json -Depth 10 | Write-Host
    
    if ($jsonResponse.success -and $jsonResponse.sent_to -gt 0) {
        Write-Host "`n✅ 2FA SMS sent successfully to $($jsonResponse.sent_to) admin phone(s)!" -ForegroundColor Green
        Write-Host "`nCheck your phone for the 6-digit code." -ForegroundColor Yellow
    } else {
        Write-Host "`n❌ Failed to send 2FA SMS" -ForegroundColor Red
        if ($jsonResponse.error) {
            Write-Host "Error: $($jsonResponse.error)" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "`n❌ Error occurred:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "`nError Response:" -ForegroundColor Red
        Write-Host $errorBody
    }
}

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Test Complete!" -ForegroundColor Cyan
Write-Host "`nNow try logging in with account 999 in the web app." -ForegroundColor Yellow
Write-Host "You should receive the 2FA SMS and be able to complete login." -ForegroundColor Yellow
