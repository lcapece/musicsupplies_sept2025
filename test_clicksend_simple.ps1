# Simple test of ClickSend SMS via Edge Function
$ErrorActionPreference = "Stop"

# Edge function URL
$url = "https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/test-clicksend-sms"

# Test parameters
$phoneNumber = "+15164550980"
$message = "Test SMS from Supabase Edge Function via ClickSend. Secrets: CLICKSEND_API_KEY and CLICKSEND_USERID are working!"

Write-Host "Testing ClickSend SMS via Edge Function..." -ForegroundColor Cyan
Write-Host "Phone: $phoneNumber" -ForegroundColor Yellow
Write-Host "Message: $message" -ForegroundColor Yellow

# Prepare JSON body
$body = @{
    phone_number = $phoneNumber
    message = $message
} | ConvertTo-Json -Compress

# Execute curl directly
Write-Host "`nExecuting curl command..." -ForegroundColor Cyan

$curlCmd = "curl.exe"
$curlArgs = "-X", "POST", $url, "-H", "Content-Type: application/json", "-d", $body

Write-Host "$curlCmd $($curlArgs -join ' ')" -ForegroundColor Gray

try {
    # Execute curl and capture output
    $output = & $curlCmd $curlArgs 2>&1
    $response = $output -join "`n"
    
    Write-Host "`nResponse:" -ForegroundColor Green
    Write-Host $response
    
    # Try to parse as JSON
    try {
        $jsonResponse = $response | ConvertFrom-Json
        if ($jsonResponse.success) {
            Write-Host "`nSUCCESS! SMS sent successfully." -ForegroundColor Green
            Write-Host "Details:" -ForegroundColor Cyan
            $jsonResponse | ConvertTo-Json -Depth 10 | Write-Host
        } else {
            Write-Host "`nFailed to send SMS." -ForegroundColor Red
            Write-Host "Error: $($jsonResponse.error)" -ForegroundColor Red
        }
    } catch {
        Write-Host "`nRaw response (not JSON):" -ForegroundColor Yellow
        Write-Host $response
    }
} catch {
    Write-Host "`nError occurred:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
