# Test ClickSend Authentication for South Africa SMS
# This script directly tests the ClickSend API with the provided credentials

# Your ClickSend credentials
$username = "lcapece@optonline.net"
$apiKey = "EE8B20BD-7C92-2FB1-3AE0-16C2AB80B814"

# Create base64 auth string (username:apikey)
$authString = "${username}:${apiKey}"
$authBytes = [System.Text.Encoding]::UTF8.GetBytes($authString)
$base64Auth = [Convert]::ToBase64String($authBytes)

Write-Host "Testing ClickSend Authentication for South Africa SMS" -ForegroundColor Yellow
Write-Host "=" * 60 -ForegroundColor Yellow
Write-Host "Username: $username" -ForegroundColor Cyan
Write-Host "API Key: $apiKey" -ForegroundColor Cyan
Write-Host "Auth String: $authString" -ForegroundColor Green
Write-Host "Base64 Auth: $base64Auth" -ForegroundColor Green
Write-Host ""

# Test SMS payload
$testMessage = @{
    messages = @(
        @{
            source = "MusicSupplies"
            body = "URGENT TEST: SMS for South Africa children - Lou Capece Music. Reply STOP to opt out."
            to = "+27123456789"  # Test South African number format
        }
    )
} | ConvertTo-Json -Depth 3

Write-Host "Test Message Payload:" -ForegroundColor Cyan
Write-Host $testMessage -ForegroundColor White
Write-Host ""

# Test the authentication
try {
    Write-Host "Testing ClickSend API authentication..." -ForegroundColor Yellow
    
    $headers = @{
        "Authorization" = "Basic $base64Auth"
        "Content-Type" = "application/json"
    }
    
    # Make the API call
    $response = Invoke-RestMethod -Uri "https://rest.clicksend.com/v3/sms/send" -Method POST -Headers $headers -Body $testMessage
    
    Write-Host "SUCCESS! ClickSend API Response:" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10) -ForegroundColor White
    
} catch {
    Write-Host "AUTHENTICATION ERROR:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode
        Write-Host "HTTP Status Code: $statusCode" -ForegroundColor Red
        
        try {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = [System.IO.StreamReader]::new($errorStream)
            $errorBody = $reader.ReadToEnd()
            Write-Host "Error Response Body: $errorBody" -ForegroundColor Red
        } catch {
            Write-Host "Could not read error response body" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. If authentication succeeds, run: fix_clicksend_auth_south_africa.bat" -ForegroundColor Green
Write-Host "2. Then test the SMS from the admin panel" -ForegroundColor Green
Write-Host "3. Use a real South African phone number in format: +27xxxxxxxxx" -ForegroundColor Green

Read-Host "Press Enter to continue..."
