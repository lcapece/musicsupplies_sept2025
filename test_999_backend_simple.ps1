# Simple test of 999 backend components
$supabaseUrl = "https://ekklokrukxmqlahtonnc.supabase.co"
$supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k"

Write-Host "=== TESTING 999 BACKEND ===" -ForegroundColor Cyan

# Test 1: Check account exists
Write-Host "`nChecking account 999..." -ForegroundColor Yellow
$headers = @{
    "apikey" = $supabaseAnonKey
    "Authorization" = "Bearer $supabaseAnonKey"
}

$accountUrl = "$supabaseUrl/rest/v1/accounts?account_number=eq.999`&select=*"
$account = Invoke-RestMethod -Uri $accountUrl -Method Get -Headers $headers
if ($account) {
    Write-Host "✓ Account 999 exists" -ForegroundColor Green
}

# Test 2: Check 2FA config
Write-Host "`nChecking 2FA config..." -ForegroundColor Yellow
$adminUrl = "$supabaseUrl/rest/v1/admin_logins?account_number=eq.999`&select=*"
$adminConfig = Invoke-RestMethod -Uri $adminUrl -Method Get -Headers $headers
if ($adminConfig) {
    Write-Host "✓ 2FA is configured" -ForegroundColor Green
}

# Test 3: Check SMS phones
Write-Host "`nChecking SMS phones..." -ForegroundColor Yellow
$smsUrl = "$supabaseUrl/rest/v1/sms_admins?account_number=eq.999`&select=*"
$phones = Invoke-RestMethod -Uri $smsUrl -Method Get -Headers $headers
Write-Host "✓ Found $($phones.Count) phone numbers" -ForegroundColor Green

Write-Host "`n✓ Backend is ready for browser testing!" -ForegroundColor Green
