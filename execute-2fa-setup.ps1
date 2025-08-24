# PowerShell script to execute 2FA setup SQL via curl to Supabase REST API
# This uses the Supabase REST API to execute the SQL commands

$supabaseUrl = "https://ekklokrukxmqlahtonnc.supabase.co"
$supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k"

Write-Host "Setting up 2FA system for account 999..." -ForegroundColor Green

# 1. Insert SMS admins
Write-Host "`n1. Setting up SMS admins..." -ForegroundColor Yellow
$admins = @(
    @{ phone = '+15164550980'; notes = 'Primary admin' },
    @{ phone = '+15164107455'; notes = 'Secondary admin' },
    @{ phone = '+15167650816'; notes = 'Tertiary admin' }
)

foreach ($admin in $admins) {
    $body = @{
        phone_number = $admin.phone
        is_active = $true
        notes = $admin.notes
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/sms_admins" `
            -Method POST `
            -Headers @{
                "apikey" = $supabaseKey
                "Authorization" = "Bearer $supabaseKey"
                "Content-Type" = "application/json"
                "Prefer" = "resolution=merge-duplicates"
            } `
            -Body $body
        Write-Host "✓ Added/updated $($admin.phone): $($admin.notes)" -ForegroundColor Green
    }
    catch {
        if ($_.Exception.Response.StatusCode -eq 409) {
            Write-Host "✓ Phone $($admin.phone) already exists, updating..." -ForegroundColor Green
            # Try UPDATE instead
            try {
                $updateResponse = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/sms_admins?phone_number=eq.$($admin.phone)" `
                    -Method PATCH `
                    -Headers @{
                        "apikey" = $supabaseKey
                        "Authorization" = "Bearer $supabaseKey"
                        "Content-Type" = "application/json"
                    } `
                    -Body $body
                Write-Host "✓ Updated $($admin.phone): $($admin.notes)" -ForegroundColor Green
            }
            catch {
                Write-Host "✗ Error updating $($admin.phone): $($_.Exception.Message)" -ForegroundColor Red
            }
        } else {
            Write-Host "✗ Error adding $($admin.phone): $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# 2. Verify SMS admins
Write-Host "`n2. Verifying SMS admins..." -ForegroundColor Yellow
try {
    $adminsResponse = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/sms_admins?is_active=eq.true" `
        -Method GET `
        -Headers @{
            "apikey" = $supabaseKey
            "Authorization" = "Bearer $supabaseKey"
        }
    
    Write-Host "Active SMS admins found:" -ForegroundColor Green
    foreach ($admin in $adminsResponse) {
        Write-Host "  - $($admin.phone_number): $($admin.notes)" -ForegroundColor Cyan
    }
}
catch {
    Write-Host "✗ Error retrieving SMS admins: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Clean up expired admin logins
Write-Host "`n3. Cleaning up expired admin login codes..." -ForegroundColor Yellow
try {
    $currentTime = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $deleteResponse = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/admin_logins?account_number=eq.999&expires_at=lt.$currentTime" `
        -Method DELETE `
        -Headers @{
            "apikey" = $supabaseKey
            "Authorization" = "Bearer $supabaseKey"
        }
    Write-Host "✓ Expired admin login codes cleaned up" -ForegroundColor Green
}
catch {
    Write-Host "✗ Error cleaning up expired codes: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n✅ 2FA system setup completed!" -ForegroundColor Green
Write-Host "The system is now configured to send 2FA codes to the specified admin phones." -ForegroundColor Cyan