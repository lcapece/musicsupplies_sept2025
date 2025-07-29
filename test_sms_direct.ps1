# Direct SMS Test - Bypassing Frontend
# This tests the edge function directly with proper authentication

$supabaseUrl = "https://ekklokrukxmqlahtonnc.supabase.co"
$supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

# Test phone number - UPDATE THIS
$testPhone = "+15164550980"
$testMessage = "URGENT TEST: Direct SMS test at $(Get-Date -Format 'HH:mm:ss')"

Write-Host ""
Write-Host "=== DIRECT EDGE FUNCTION TEST ===" -ForegroundColor Yellow
Write-Host "Testing direct call to send-admin-sms edge function" -ForegroundColor Cyan
Write-Host "Phone: $testPhone" -ForegroundColor Cyan
Write-Host "Message: $testMessage" -ForegroundColor Cyan
Write-Host ""

# Prepare the request body
$requestBody = @{
    eventName = "adhoc_sms"
    message = $testMessage
    customPhones = @($testPhone)
} | ConvertTo-Json

Write-Host "Request body:" -ForegroundColor Yellow
Write-Host $requestBody -ForegroundColor Gray
Write-Host ""

# Call the edge function
try {
    Write-Host "Calling edge function..." -ForegroundColor Yellow
    
    $response = Invoke-WebRequest -Uri "$supabaseUrl/functions/v1/send-admin-sms" `
        -Method Post `
        -Headers @{
            "Authorization" = "Bearer $supabaseAnonKey"
            "Content-Type" = "application/json"
            "apikey" = $supabaseAnonKey
        } `
        -Body $requestBody `
        -UseBasicParsing
    
    Write-Host "Response Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response Content:" -ForegroundColor Green
    $responseContent = $response.Content | ConvertFrom-Json
    Write-Host ($responseContent | ConvertTo-Json -Depth 10) -ForegroundColor Cyan
    
    if ($responseContent.success -eq $true) {
        Write-Host ""
        Write-Host "SUCCESS! SMS should have been sent." -ForegroundColor Green
        Write-Host "Check your phone for the message." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "FAILED! SMS was not sent." -ForegroundColor Red
        Write-Host "Error: $($responseContent.message)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "ERROR calling edge function!" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host "Response Body:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== TROUBLESHOOTING ===" -ForegroundColor Yellow
Write-Host "1. If you got a 401 error, the edge function needs to be redeployed" -ForegroundColor Cyan
Write-Host "2. If you got a 500 error, check the edge function logs in Supabase dashboard" -ForegroundColor Cyan
Write-Host "3. If success but no SMS, check:" -ForegroundColor Cyan
Write-Host "   - ClickSend dashboard for the message" -ForegroundColor White
Write-Host "   - Phone number format (should include country code)" -ForegroundColor White
Write-Host "   - ClickSend account balance and status" -ForegroundColor White
Write-Host ""
