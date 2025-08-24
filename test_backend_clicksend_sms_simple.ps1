# Test ClickSend SMS via Backend Edge Function

# Get environment variables
$envContent = Get-Content .env
$supabaseUrl = ($envContent | Where-Object { $_ -match "^VITE_SUPABASE_URL=" }) -replace "VITE_SUPABASE_URL=", ""
$supabaseAnonKey = ($envContent | Where-Object { $_ -match "^VITE_SUPABASE_ANON_KEY=" }) -replace "VITE_SUPABASE_ANON_KEY=", ""

Write-Host "Testing ClickSend SMS via Backend Edge Function" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Construct the Edge function URL
$functionUrl = "$supabaseUrl/functions/v1/test-clicksend-backend"
Write-Host "Edge Function URL: $functionUrl" -ForegroundColor Yellow
Write-Host ""

# Call the Edge function
try {
    Write-Host "Calling Edge function..." -ForegroundColor Green
    
    $headers = @{
        "Authorization" = "Bearer $supabaseAnonKey"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri $functionUrl -Method POST -Headers $headers
    
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10)
    
    if ($response.success) {
        Write-Host ""
        Write-Host "[SUCCESS] SMS sent successfully!" -ForegroundColor Green
        Write-Host "  Message sent to: +15164550980" -ForegroundColor Cyan
        
        if ($response.clicksend_response.data.messages) {
            $message = $response.clicksend_response.data.messages[0]
            Write-Host "  Message ID: $($message.message_id)" -ForegroundColor Cyan
            Write-Host "  Status: $($message.status)" -ForegroundColor Cyan
        }
    } else {
        Write-Host ""
        Write-Host "[FAILED] Failed to send SMS" -ForegroundColor Red
        Write-Host "  Error: $($response.error)" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Credentials Status:" -ForegroundColor Yellow
    Write-Host "  Username: $($response.credentials_found.username)" -ForegroundColor Cyan
    Write-Host "  API Key: $($response.credentials_found.api_key)" -ForegroundColor Cyan
    
} catch {
    Write-Host ""
    Write-Host "Error calling Edge function:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response body:" -ForegroundColor Red
        Write-Host $responseBody -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Test complete!" -ForegroundColor Green
