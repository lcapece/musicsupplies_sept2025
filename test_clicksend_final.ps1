# Final test of ClickSend SMS via Edge Function
$ErrorActionPreference = "Stop"

# Edge function URL
$url = "https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/test-clicksend-sms"

# Test parameters
$phoneNumber = "+15164550980"
$message = "Test SMS from Supabase Edge Function via ClickSend. Secrets: CLICKSEND_API_KEY and CLICKSEND_USERID are working!"

Write-Host "Testing ClickSend SMS via Edge Function..." -ForegroundColor Cyan
Write-Host "Phone: $phoneNumber" -ForegroundColor Yellow
Write-Host "Message: $message" -ForegroundColor Yellow

# Load environment variables to get the anon key
$envPath = ".env"
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
}

$supabaseAnonKey = $env:VITE_SUPABASE_ANON_KEY

if (-not $supabaseAnonKey) {
    Write-Host "Error: Missing VITE_SUPABASE_ANON_KEY in .env file" -ForegroundColor Red
    exit 1
}

# Prepare request with authorization header
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $supabaseAnonKey"
}

$body = @{
    phone_number = $phoneNumber
    message = $message
} | ConvertTo-Json

Write-Host "`nSending request to Edge function..." -ForegroundColor Cyan

try {
    # Make the request
    $response = Invoke-WebRequest -Uri $url -Method POST -Headers $headers -Body $body -UseBasicParsing
    
    Write-Host "`nResponse Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response Content:" -ForegroundColor Green
    Write-Host $response.Content
    
    # Parse JSON response
    $jsonResponse = $response.Content | ConvertFrom-Json
    
    if ($jsonResponse.success) {
        Write-Host "`n✅ SUCCESS! SMS sent successfully to $phoneNumber" -ForegroundColor Green
        Write-Host "`nDetails:" -ForegroundColor Cyan
        $jsonResponse | ConvertTo-Json -Depth 10 | Write-Host
    } else {
        Write-Host "`n❌ Failed to send SMS" -ForegroundColor Red
        Write-Host "Error: $($jsonResponse.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "`n❌ Error occurred:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "`nError Response:" -ForegroundColor Red
        Write-Host $errorBody
        
        # Try to parse error as JSON
        try {
            $errorJson = $errorBody | ConvertFrom-Json
            Write-Host "`nError Details:" -ForegroundColor Red
            $errorJson | ConvertTo-Json -Depth 10 | Write-Host
        } catch {
            # Not JSON, already displayed
        }
    }
}
