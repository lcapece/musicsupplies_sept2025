# Direct test of ClickSend SMS via Edge Function using curl
$ErrorActionPreference = "Stop"

# Edge function URL
$url = "https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/test-clicksend-sms"

# Test parameters
$phoneNumber = "+15164550980"
$message = "Test SMS from Supabase Edge Function via ClickSend. Secrets: CLICKSEND_API_KEY and CLICKSEND_USERID are working!"

Write-Host "Testing ClickSend SMS via Edge Function (Direct)..." -ForegroundColor Cyan
Write-Host "Phone: $phoneNumber" -ForegroundColor Yellow
Write-Host "Message: $message" -ForegroundColor Yellow

# Prepare JSON body
$body = @{
    phone_number = $phoneNumber
    message = $message
} | ConvertTo-Json -Compress

# Call the Edge function using curl (bypasses JWT requirement)
Write-Host "`nExecuting curl command..." -ForegroundColor Cyan

$curlArgs = @(
    "-X", "POST",
    $url,
    "-H", "Content-Type: application/json",
    "-d", $body,
    "--silent",
    "--show-error"
)

Write-Host "curl $($curlArgs -join ' ')" -ForegroundColor Gray

try {
    $response = & curl @curlArgs
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
