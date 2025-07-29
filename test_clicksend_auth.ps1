# Test ClickSend Authentication
# CRITICAL: For children in South Africa

$username = "lcapece@optonline.net"
$apiKey = "EE8B20BD-7C92-2FB1-3AE0-16C2AB80B814"

# Create Basic Auth header (username:apikey base64 encoded)
$auth = [System.Convert]::ToBase64String([System.Text.Encoding]::ASCII.GetBytes("${username}:${apiKey}"))

Write-Host "Testing ClickSend Authentication..." -ForegroundColor Yellow
Write-Host "Username: $username" -ForegroundColor Cyan
Write-Host "API Key: $apiKey" -ForegroundColor Cyan
Write-Host "Basic Auth: Basic $auth" -ForegroundColor Green
Write-Host ""

# Test 1: Check account balance (simple test to verify credentials)
Write-Host "Test 1: Checking account balance..." -ForegroundColor Yellow
$balanceUrl = "https://rest.clicksend.com/v3/account"
try {
    $balanceResponse = Invoke-RestMethod -Uri $balanceUrl -Headers @{
        "Authorization" = "Basic $auth"
        "Content-Type" = "application/json"
    } -Method Get
    
    Write-Host "✓ Authentication successful!" -ForegroundColor Green
    Write-Host "Account Details:" -ForegroundColor Cyan
    Write-Host ($balanceResponse | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "✗ Authentication failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Test 2: Sending test SMS..." -ForegroundColor Yellow

# Test 2: Send a test SMS
$smsUrl = "https://rest.clicksend.com/v3/sms/send"
$testPhone = "+27123456789"  # Example South African number (replace with actual test number)
$testMessage = "TEST: MusicSupplies SMS system verification - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

$smsBody = @{
    messages = @(
        @{
            source = "MusicSupplies"
            body = $testMessage
            to = $testPhone
        }
    )
} | ConvertTo-Json -Depth 3

Write-Host "Sending to: $testPhone" -ForegroundColor Cyan
Write-Host "Message: $testMessage" -ForegroundColor Cyan

try {
    $smsResponse = Invoke-RestMethod -Uri $smsUrl -Headers @{
        "Authorization" = "Basic $auth"
        "Content-Type" = "application/json"
    } -Method Post -Body $smsBody
    
    Write-Host "✓ SMS sent successfully!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    Write-Host ($smsResponse | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "✗ SMS send failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Response Body: $($_.ErrorDetails.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Test 3: Testing edge function..." -ForegroundColor Yellow

# Test 3: Test via Supabase edge function
$supabaseUrl = "https://ekklokrukxmqlahtonnc.supabase.co"
$supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

$edgeFunctionBody = @{
    eventName = "adhoc_sms"
    message = "URGENT TEST: Verifying SMS system for South Africa - $(Get-Date -Format 'HH:mm:ss')"
    customPhones = @($testPhone)
} | ConvertTo-Json

try {
    $edgeResponse = Invoke-RestMethod -Uri "$supabaseUrl/functions/v1/send-admin-sms" -Headers @{
        "Authorization" = "Bearer $supabaseAnonKey"
        "Content-Type" = "application/json"
    } -Method Post -Body $edgeFunctionBody
    
    Write-Host "✓ Edge function call successful!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    Write-Host ($edgeResponse | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "✗ Edge function call failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== CRITICAL NEXT STEPS ===" -ForegroundColor Yellow
Write-Host "1. If authentication failed above, update the Supabase edge function environment variables:" -ForegroundColor Cyan
Write-Host "   CLICKSEND_USERNAME = lcapece@optonline.net" -ForegroundColor White
Write-Host "   CLICKSEND_API_KEY = EE8B20BD-7C92-2FB1-3AE0-16C2AB80B814" -ForegroundColor White
Write-Host ""
Write-Host "2. Replace the test phone number in this script with an actual South African number to test" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Check the Supabase dashboard for edge function logs to see any errors" -ForegroundColor Cyan
