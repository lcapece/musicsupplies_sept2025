# Test New Authentication System V3 with Account 999 Special Case
# This script tests the new authentication system

Write-Host "=== Testing New Authentication System V3 ===" -ForegroundColor Green

# Get Supabase URL and Service Key from .env file
$envFile = Get-Content ".env" -ErrorAction SilentlyContinue
$supabaseUrl = ""
$serviceKey = ""

foreach ($line in $envFile) {
    if ($line -match "^VITE_SUPABASE_URL=(.+)$") {
        $supabaseUrl = $matches[1]
    }
    elseif ($line -match "^SUPABASE_SERVICE_ROLE_KEY=(.+)$") {
        $serviceKey = $matches[1]
    }
}

if (-not $supabaseUrl -or -not $serviceKey) {
    Write-Host "ERROR: Could not find SUPABASE_URL or SERVICE_KEY in .env file" -ForegroundColor Red
    exit 1
}

Write-Host "Supabase URL: $supabaseUrl" -ForegroundColor Yellow

# Headers for Supabase requests
$headers = @{
    'apikey' = $serviceKey
    'Authorization' = "Bearer $serviceKey"
    'Content-Type' = 'application/json'
}

Write-Host ""
Write-Host "=== Test 1: Account 999 with correct password ===" -ForegroundColor Cyan

$testPayload = @{
    p_identifier = "999"
    p_password = "Music123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/rpc/authenticate_user_v3" -Method Post -Headers $headers -Body $testPayload
    
    if ($response -and $response.Count -gt 0) {
        $user = $response[0]
        Write-Host "SUCCESS: Account 999 authenticated successfully" -ForegroundColor Green
        Write-Host "Account Number: $($user.account_number)" -ForegroundColor White
        Write-Host "Account Name: $($user.acct_name)" -ForegroundColor White
        Write-Host "Email: $($user.email_address)" -ForegroundColor White
        Write-Host "Special Admin: $($user.is_special_admin)" -ForegroundColor White
        Write-Host "Requires Password Change: $($user.requires_password_change)" -ForegroundColor White
        
        if ($user.is_special_admin -eq $true) {
            Write-Host "✓ Special admin flag correctly set" -ForegroundColor Green
        } else {
            Write-Host "✗ Special admin flag NOT set" -ForegroundColor Red
        }
        
        if ($user.account_number -eq 999) {
            Write-Host "✓ Account number correctly returned as 999" -ForegroundColor Green
        } else {
            Write-Host "✗ Account number incorrect: $($user.account_number)" -ForegroundColor Red
        }
    } else {
        Write-Host "FAILED: No user data returned" -ForegroundColor Red
        Write-Host "Response: $($response | ConvertTo-Json -Depth 10)" -ForegroundColor Red
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Test 2: Account 999 with wrong password ===" -ForegroundColor Cyan

$testPayload = @{
    p_identifier = "999"
    p_password = "WrongPassword"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/rpc/authenticate_user_v3" -Method Post -Headers $headers -Body $testPayload
    
    if ($response -and $response.Count -gt 0) {
        $user = $response[0]
        if ($user.account_number -eq $null) {
            Write-Host "SUCCESS: Account 999 with wrong password correctly rejected" -ForegroundColor Green
        } else {
            Write-Host "FAILED: Account 999 with wrong password was accepted" -ForegroundColor Red
            Write-Host "Account Number: $($user.account_number)" -ForegroundColor Red
        }
    } else {
        Write-Host "SUCCESS: Account 999 with wrong password correctly rejected (no response)" -ForegroundColor Green
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Test 3: Account 999 with email identifier ===" -ForegroundColor Cyan

$testPayload = @{
    p_identifier = "admin@999"
    p_password = "Music123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/rpc/authenticate_user_v3" -Method Post -Headers $headers -Body $testPayload
    
    if ($response -and $response.Count -gt 0) {
        $user = $response[0]
        if ($user.account_number -eq 999) {
            Write-Host "SUCCESS: Account 999 can be accessed via email identifier" -ForegroundColor Green
            Write-Host "Account Number: $($user.account_number)" -ForegroundColor White
            Write-Host "Special Admin: $($user.is_special_admin)" -ForegroundColor White
        } else {
            Write-Host "FAILED: Email identifier did not work correctly" -ForegroundColor Red
            Write-Host "Account Number: $($user.account_number)" -ForegroundColor Red
        }
    } else {
        Write-Host "FAILED: Email identifier authentication failed" -ForegroundColor Red
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Test 4: Regular account (non-999) ===" -ForegroundColor Cyan

$testPayload = @{
    p_identifier = "101"
    p_password = "testpassword"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/rpc/authenticate_user_v3" -Method Post -Headers $headers -Body $testPayload
    
    if ($response -and $response.Count -gt 0) {
        $user = $response[0]
        if ($user.account_number -ne $null) {
            Write-Host "Account found for regular authentication test" -ForegroundColor White
            Write-Host "Account Number: $($user.account_number)" -ForegroundColor White
            Write-Host "Special Admin: $($user.is_special_admin)" -ForegroundColor White
            
            if ($user.is_special_admin -eq $false) {
                Write-Host "✓ Regular accounts correctly NOT marked as special admin" -ForegroundColor Green
            } else {
                Write-Host "✗ Regular account incorrectly marked as special admin" -ForegroundColor Red
            }
        } else {
            Write-Host "No authentication for account 101 (expected - wrong password)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "No authentication for account 101 (expected - wrong password)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Expected error for wrong credentials: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Test 5: Non-existent account ===" -ForegroundColor Cyan

$testPayload = @{
    p_identifier = "99999"
    p_password = "anypassword"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/rpc/authenticate_user_v3" -Method Post -Headers $headers -Body $testPayload
    
    if ($response -and $response.Count -gt 0) {
        $user = $response[0]
        if ($user.account_number -eq $null) {
            Write-Host "SUCCESS: Non-existent account correctly rejected" -ForegroundColor Green
        } else {
            Write-Host "FAILED: Non-existent account was somehow authenticated" -ForegroundColor Red
        }
    } else {
        Write-Host "SUCCESS: Non-existent account correctly rejected (no response)" -ForegroundColor Green
    }
} catch {
    Write-Host "Expected error for non-existent account: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Testing Complete ===" -ForegroundColor Green
Write-Host "New authentication system V3 with account 999 special case has been tested." -ForegroundColor White
Write-Host "Key features:" -ForegroundColor White
Write-Host "- Account 999 uses hard-coded credentials: username 999 with password Music123" -ForegroundColor White
Write-Host "- Account 999 does not require database records in ACCOUNTS_LCMD or USER_PASSWORDS" -ForegroundColor White
Write-Host "- Account 999 is marked as special admin" -ForegroundColor White
Write-Host "- All other accounts use existing database logic" -ForegroundColor White
Write-Host "- Regular accounts are NOT marked as special admin" -ForegroundColor White
