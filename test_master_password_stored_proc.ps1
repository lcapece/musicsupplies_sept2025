# Test Master Password Authentication via Stored Procedure
$url = "https://ekklokrukxmqlahtonnc.supabase.co/rest/v1/rpc/authenticate_with_master_password"
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k"

$headers = @{
    "apikey" = $anonKey
    "Content-Type" = "application/json"
}

# Test 1: Master password with account 999
Write-Host "Test 1: Master password authentication for account 999" -ForegroundColor Yellow
$body1 = @{
    p_account_number = "999"
    p_password = "Music123"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri $url -Method POST -Body $body1 -Headers $headers -ErrorAction Stop
    $content = $response.Content | ConvertFrom-Json
    Write-Host "Success! Response:" -ForegroundColor Green
    Write-Host ($content | ConvertTo-Json -Depth 10) -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $result = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($result)
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}

Write-Host "`n" -ForegroundColor White

# Test 2: Master password with account 101
Write-Host "Test 2: Master password authentication for account 101" -ForegroundColor Yellow
$body2 = @{
    p_account_number = "101"
    p_password = "Music123"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri $url -Method POST -Body $body2 -Headers $headers -ErrorAction Stop
    $content = $response.Content | ConvertFrom-Json
    Write-Host "Success! Response:" -ForegroundColor Green
    Write-Host ($content | ConvertTo-Json -Depth 10) -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $result = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($result)
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}

Write-Host "`n" -ForegroundColor White

# Test 3: Wrong password
Write-Host "Test 3: Wrong password (should fail)" -ForegroundColor Yellow
$body3 = @{
    p_account_number = "101"
    p_password = "WrongPassword"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri $url -Method POST -Body $body3 -Headers $headers -ErrorAction Stop
    $content = $response.Content | ConvertFrom-Json
    Write-Host "Response:" -ForegroundColor Yellow
    Write-Host ($content | ConvertTo-Json -Depth 10) -ForegroundColor Yellow
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $result = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($result)
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}
