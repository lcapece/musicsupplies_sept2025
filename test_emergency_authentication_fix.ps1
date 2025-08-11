# EMERGENCY AUTHENTICATION TESTING SCRIPT
# Testing Account 8366 and Music123 backdoor

Write-Host "🚨 EMERGENCY AUTHENTICATION TESTING 🚨" -ForegroundColor Red
Write-Host ""

# Test 1: Account 8366 with zip code "08232" - should FAIL (common misconception)
Write-Host "TEST 1: Account 8366 with zip '08232' (SHOULD FAIL)" -ForegroundColor Yellow
$body1 = @{
    accountNumber = "8366"
    password = "08232"
} | ConvertTo-Json

try {
    $response1 = Invoke-RestMethod -Uri "https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/authenticate-with-master-password" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE5MjczMzIsImV4cCI6MjAzNzUwMzMzMn0.GvKVpE-7W-OhMYyF9mEwAbUKahTejQNmcUE6VqaRO9g"
            "Content-Type" = "application/json"
        } `
        -Body $body1
    Write-Host "❌ UNEXPECTED SUCCESS: Account 8366 with zip 08232 worked" -ForegroundColor Red
    Write-Host ($response1 | ConvertTo-Json)
} catch {
    Write-Host "✅ EXPECTED FAILURE: Account 8366 with zip 08232 failed as expected" -ForegroundColor Green
    Write-Host "Error: $($_.Exception.Message)"
}

Write-Host ""

# Test 2: Account 8366 with master password "Music123" - should SUCCEED
Write-Host "TEST 2: Account 8366 with master password 'Music123' (SHOULD SUCCEED)" -ForegroundColor Yellow
$body2 = @{
    accountNumber = "8366"
    password = "Music123"
} | ConvertTo-Json

try {
    $response2 = Invoke-RestMethod -Uri "https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/authenticate-with-master-password" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE5MjczMzIsImV4cCI6MjAzNzUwMzMzMn0.GvKVpE-7W-OhMYyF9mEwAbUKahTejQNmcUE6VqaRO9g"
            "Content-Type" = "application/json"
        } `
        -Body $body2
    Write-Host "✅ SUCCESS: Account 8366 with Music123 worked!" -ForegroundColor Green
    Write-Host "Login Type: $($response2.loginType)"
    Write-Host "Account: $($response2.account.acct_name)"
} catch {
    Write-Host "❌ CRITICAL FAILURE: Account 8366 with Music123 failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)"
}

Write-Host ""

# Test 3: Test Music123 backdoor with non-existent account (should fail gracefully)
Write-Host "TEST 3: Non-existent account 99999 with Music123 (SHOULD FAIL)" -ForegroundColor Yellow
$body3 = @{
    accountNumber = "99999"
    password = "Music123"
} | ConvertTo-Json

try {
    $response3 = Invoke-RestMethod -Uri "https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/authenticate-with-master-password" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE5MjczMzIsImV4cCI6MjAzNzUwMzMzMn0.GvKVpE-7W-OhMYyF9mEwAbUKahTejQNmcUE6VqaRO9g"
            "Content-Type" = "application/json"
        } `
        -Body $body3
    Write-Host "❌ UNEXPECTED SUCCESS: Non-existent account worked" -ForegroundColor Red
} catch {
    Write-Host "✅ EXPECTED FAILURE: Non-existent account failed as expected" -ForegroundColor Green
    Write-Host "Error: $($_.Exception.Message)"
}

Write-Host ""

# Test 4: Test special admin account 999
Write-Host "TEST 4: Special admin account 999 with Music123 (SHOULD SUCCEED)" -ForegroundColor Yellow
$body4 = @{
    accountNumber = "999"
    password = "Music123"
} | ConvertTo-Json

try {
    $response4 = Invoke-RestMethod -Uri "https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/authenticate-with-master-password" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE5MjczMzIsImV4cCI6MjAzNzUwMzMzMn0.GvKVpE-7W-OhMYyF9mEwAbUKahTejQNmcUE6VqaRO9g"
            "Content-Type" = "application/json"
        } `
        -Body $body4
    Write-Host "✅ SUCCESS: Admin account 999 with Music123 worked!" -ForegroundColor Green
    Write-Host "Login Type: $($response4.loginType)"
    Write-Host "Account: $($response4.account.acct_name)"
} catch {
    Write-Host "❌ CRITICAL FAILURE: Admin account 999 with Music123 failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "🚨 EMERGENCY TESTING COMPLETE 🚨" -ForegroundColor Red
