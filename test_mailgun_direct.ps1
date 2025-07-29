# Direct Mailgun Email Test
# Testing email functionality

$supabaseUrl = "https://ekklokrukxmqlahtonnc.supabase.co"
$supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

# Test email details
$toEmail = "lcapece@optonline.net"
$subject = "Test Email from MusicSupplies - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$textContent = "This is a test email from your MusicSupplies application.`n`nIf you receive this, your Mailgun email system is working correctly!`n`nSent at: $(Get-Date -Format 'HH:mm:ss')"
$htmlContent = @"
<html>
<body style="font-family: Arial, sans-serif;">
    <h2>Test Email from MusicSupplies</h2>
    <p>This is a test email from your MusicSupplies application.</p>
    <p style="color: green; font-weight: bold;">If you receive this, your Mailgun email system is working correctly!</p>
    <p><em>Sent at: $(Get-Date -Format 'HH:mm:ss')</em></p>
</body>
</html>
"@

Write-Host ""
Write-Host "=== MAILGUN EMAIL TEST ===" -ForegroundColor Yellow
Write-Host "Sending test email to: $toEmail" -ForegroundColor Cyan
Write-Host "Subject: $subject" -ForegroundColor Cyan
Write-Host ""

# Prepare the request body
$requestBody = @{
    to = $toEmail
    subject = $subject
    text = $textContent
    html = $htmlContent
} | ConvertTo-Json

Write-Host "Calling send-mailgun-email edge function..." -ForegroundColor Yellow

# Call the edge function
try {
    $response = Invoke-WebRequest -Uri "$supabaseUrl/functions/v1/send-mailgun-email" `
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
        Write-Host "SUCCESS! Email sent successfully." -ForegroundColor Green
        Write-Host "Message ID: $($responseContent.messageId)" -ForegroundColor Green
        Write-Host "Check your inbox at: $toEmail" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "FAILED! Email was not sent." -ForegroundColor Red
        Write-Host "Error: $($responseContent.error)" -ForegroundColor Red
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
Write-Host "1. If you got a 401 error, the edge function may need JWT disabled" -ForegroundColor Cyan
Write-Host "2. If you got a 500 error, check:" -ForegroundColor Cyan
Write-Host "   - Mailgun API key is set in Supabase secrets" -ForegroundColor White
Write-Host "   - Mailgun domain is configured correctly" -ForegroundColor White
Write-Host "   - Edge function logs in Supabase dashboard" -ForegroundColor White
Write-Host ""
