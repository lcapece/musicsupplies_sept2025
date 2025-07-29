# Simple ClickSend SMS Test for USA
# Testing SMS functionality

$username = "lcapece@optonline.net"
$apiKey = "EE8B20BD-7C92-2FB1-3AE0-16C2AB80B814"

# Create auth header
$authString = "${username}:${apiKey}"
$authBytes = [System.Text.Encoding]::ASCII.GetBytes($authString)
$auth = [System.Convert]::ToBase64String($authBytes)

Write-Host ""
Write-Host "=== TESTING CLICKSEND AUTHENTICATION ===" -ForegroundColor Yellow
Write-Host "Username: $username" -ForegroundColor Cyan
Write-Host ""

# Test account access
Write-Host "Checking ClickSend account..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Basic $auth"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "https://rest.clicksend.com/v3/account" -Headers $headers -Method Get
    Write-Host "SUCCESS: Authentication working!" -ForegroundColor Green
    Write-Host "Account balance: $($response.data.balance) $($response.data.currency)" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "ERROR: Authentication failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please verify your ClickSend credentials are correct." -ForegroundColor Yellow
    exit 1
}

# Test edge function
Write-Host "Testing Supabase edge function..." -ForegroundColor Yellow
$supabaseUrl = "https://ekklokrukxmqlahtonnc.supabase.co"
$supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

$testNumber = "+15164550980"  # Replace with actual USA number
$testMessage = "TEST: MusicSupplies SMS system - $(Get-Date -Format 'HH:mm:ss')"

$body = @{
    eventName = "adhoc_sms"
    message = $testMessage
    customPhones = @($testNumber)
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$supabaseUrl/functions/v1/send-admin-sms" `
        -Headers @{
            "Authorization" = "Bearer $supabaseKey"
            "Content-Type" = "application/json"
        } `
        -Method Post `
        -Body $body
    
    Write-Host "SUCCESS: Edge function responded!" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Cyan
} catch {
    Write-Host "ERROR: Edge function failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== NEXT STEPS ===" -ForegroundColor Yellow
Write-Host "1. Replace +15164550980 with actual USA number in this script" -ForegroundColor Cyan
Write-Host "2. Check Supabase dashboard edge function logs for any errors" -ForegroundColor Cyan
Write-Host "3. Try sending SMS from admin dashboard" -ForegroundColor Cyan
Write-Host ""
