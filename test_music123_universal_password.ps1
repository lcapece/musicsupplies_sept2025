# EMERGENCY UNIVERSAL PASSWORD TEST - Music123
# Testing all authentication paths

Write-Host "=== EMERGENCY UNIVERSAL PASSWORD TEST ==="
Write-Host "Testing Music123 as universal master password"
Write-Host ""

$supabaseUrl = "https://ekklokrukxmqlahtonnc.supabase.co"
$supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k"

Write-Host "1. Testing Account 999 with Music123 (Special Admin)"
$body999 = @{
    p_identifier = "999"
    p_password = "Music123"
} | ConvertTo-Json

$response999 = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/rpc/authenticate_user_v5" -Method Post -ContentType "application/json" -Headers @{
    "apikey" = $supabaseKey
    "Authorization" = "Bearer $supabaseKey"
} -Body $body999

Write-Host "Account 999 Result:"
Write-Host ($response999 | ConvertTo-Json -Depth 5)
Write-Host ""

Write-Host "2. Testing Account 101 with Music123 (Universal Master Password)"
$body101 = @{
    p_identifier = "101"
    p_password = "Music123"
} | ConvertTo-Json

try {
    $response101 = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/rpc/authenticate_user_v5" -Method Post -ContentType "application/json" -Headers @{
        "apikey" = $supabaseKey
        "Authorization" = "Bearer $supabaseKey"
    } -Body $body101

    Write-Host "Account 101 Result:"
    Write-Host ($response101 | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "Account 101 Error: $_"
}
Write-Host ""

Write-Host "3. Testing Account 115 with Music123 (Universal Master Password)"
$body115 = @{
    p_identifier = "115"
    p_password = "Music123"
} | ConvertTo-Json

try {
    $response115 = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/rpc/authenticate_user_v5" -Method Post -ContentType "application/json" -Headers @{
        "apikey" = $supabaseKey
        "Authorization" = "Bearer $supabaseKey"
    } -Body $body115

    Write-Host "Account 115 Result:"
    Write-Host ($response115 | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "Account 115 Error: $_"
}
Write-Host ""

Write-Host "4. Checking PWD table (Universal Master Password)"
try {
    $pwdResponse = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/pwd?select=pwd" -Method Get -Headers @{
        "apikey" = $supabaseKey
        "Authorization" = "Bearer $supabaseKey"
    }

    Write-Host "Current Master Password in PWD table:"
    Write-Host ($pwdResponse | ConvertTo-Json)
} catch {
    Write-Host "PWD table Error: $_"
}
Write-Host ""

Write-Host "5. Testing Edge Function authenticate-with-master-password"
$edgeBody = @{
    accountNumber = "101"
    password = "Music123"
} | ConvertTo-Json

try {
    $edgeResponse = Invoke-RestMethod -Uri "$supabaseUrl/functions/v1/authenticate-with-master-password" -Method Post -ContentType "application/json" -Headers @{
        "Authorization" = "Bearer $supabaseKey"
    } -Body $edgeBody

    Write-Host "Edge Function Result for Account 101:"
    Write-Host ($edgeResponse | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "Edge Function Error: $_"
}

Write-Host ""
Write-Host "=== EMERGENCY TEST COMPLETE ==="
