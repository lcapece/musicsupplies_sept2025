# Test complete admin 999 2FA flow
Write-Host "Testing Admin 999 2FA Complete Flow" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

# Load environment variables
$envPath = ".env"
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], [System.EnvironmentVariableTarget]::Process)
        }
    }
}

$SUPABASE_URL = $env:VITE_SUPABASE_URL
$SUPABASE_ANON_KEY = $env:VITE_SUPABASE_ANON_KEY

if (-not $SUPABASE_URL -or -not $SUPABASE_ANON_KEY) {
    Write-Host "Error: Missing Supabase credentials" -ForegroundColor Red
    exit 1
}

Write-Host "`nStep 1: Testing admin password validation" -ForegroundColor Yellow
$headers = @{
    "apikey" = $SUPABASE_ANON_KEY
    "Authorization" = "Bearer $SUPABASE_ANON_KEY"
    "Content-Type" = "application/json"
}

# Test is_admin_password_valid function
$passwordCheckBody = @{
    p_password = "2750GroveAvenue"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/rpc/is_admin_password_valid" `
        -Method POST `
        -Headers $headers `
        -Body $passwordCheckBody
    
    Write-Host "Admin password validation: $response" -ForegroundColor Green
} catch {
    Write-Host "Error checking admin password: $_" -ForegroundColor Red
}

Write-Host "`nStep 2: Testing 2FA code generation via Edge Function" -ForegroundColor Yellow
$edgeHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $SUPABASE_ANON_KEY"
}

$generateBody = @{
    account_number = 999
} | ConvertTo-Json

try {
    $generateUrl = "$SUPABASE_URL/functions/v1/admin-2fa-handler/generate"
    Write-Host "Calling: $generateUrl" -ForegroundColor Gray
    
    $response = Invoke-RestMethod -Uri $generateUrl `
        -Method POST `
        -Headers $edgeHeaders `
        -Body $generateBody
    
    Write-Host "2FA Generation Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10 | Write-Host
    
    if ($response.success -and $response.sent_to -gt 0) {
        Write-Host "`nSMS sent to $($response.sent_to) admin phone(s)" -ForegroundColor Green
    }
} catch {
    Write-Host "Error generating 2FA code: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error details: $errorBody" -ForegroundColor Red
    }
}

Write-Host "`nStep 3: Checking admin_logins table for generated code" -ForegroundColor Yellow
try {
    $logsUrl = "$SUPABASE_URL/rest/v1/admin_logins?account_number=eq.999&order=created_at.desc&limit=1"
    $response = Invoke-RestMethod -Uri $logsUrl `
        -Method GET `
        -Headers $headers
    
    if ($response -and $response.Count -gt 0) {
        $latestCode = $response[0]
        Write-Host "Latest code in admin_logins:" -ForegroundColor Green
        Write-Host "  Code: $($latestCode.code)" -ForegroundColor Cyan
        Write-Host "  Created: $($latestCode.created_at)" -ForegroundColor Gray
        Write-Host "  Expires: $($latestCode.expires_at)" -ForegroundColor Gray
        Write-Host "  Used: $($latestCode.used)" -ForegroundColor Gray
        
        # Test authentication with the code
        Write-Host "`nStep 4: Testing authentication with 2FA code" -ForegroundColor Yellow
        $authBody = @{
            p_identifier = "999"
            p_password = "2750GroveAvenue"
            p_ip_address = "127.0.0.1"
            p_2fa_code = $latestCode.code
        } | ConvertTo-Json
        
        $authResponse = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/rpc/authenticate_user" `
            -Method POST `
            -Headers $headers `
            -Body $authBody
        
        if ($authResponse -and $authResponse.Count -gt 0) {
            Write-Host "Authentication successful!" -ForegroundColor Green
            Write-Host "Account: $($authResponse[0].account_number)" -ForegroundColor Cyan
            Write-Host "Name: $($authResponse[0].acct_name)" -ForegroundColor Cyan
            Write-Host "Is Special Admin: $($authResponse[0].is_special_admin)" -ForegroundColor Cyan
        } else {
            Write-Host "Authentication failed - no data returned" -ForegroundColor Red
        }
    } else {
        Write-Host "No codes found in admin_logins table" -ForegroundColor Red
    }
} catch {
    Write-Host "Error checking admin_logins: $_" -ForegroundColor Red
}

Write-Host "`nStep 5: Checking sms_admins table" -ForegroundColor Yellow
try {
    $smsAdminsUrl = "$SUPABASE_URL/rest/v1/sms_admins?is_active=eq.true"
    $response = Invoke-RestMethod -Uri $smsAdminsUrl `
        -Method GET `
        -Headers $headers
    
    Write-Host "Active SMS admin phones:" -ForegroundColor Green
    foreach ($admin in $response) {
        Write-Host "  $($admin.phone_number)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "Error checking sms_admins: $_" -ForegroundColor Red
}

Write-Host "`nTest complete!" -ForegroundColor Green
