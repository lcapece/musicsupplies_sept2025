# Test Master Password Authentication with Service Role Key
$url = "https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/authenticate-with-master-password"
$serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxNzQ1NjU2OCwiZXhwIjoyMDMzMDMyNTY4fQ.d6M2gQ2FJl81vNnPqzaQbIOyt9-F0XTGOz4S7BzkoRc"

$headers = @{
    "Authorization" = "Bearer $serviceRoleKey"
    "apikey" = $serviceRoleKey
    "Content-Type" = "application/json"
}

$body = @{
    accountNumber = "999"
    password = "Music123"
} | ConvertTo-Json

Write-Host "Testing master password authentication with service role key..." -ForegroundColor Yellow
Write-Host "URL: $url" -ForegroundColor Cyan
Write-Host "Body: $body" -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri $url -Method POST -Body $body -Headers $headers -ErrorAction Stop
    Write-Host "Success! Status: $($response.StatusCode)" -ForegroundColor Green
    $content = $response.Content | ConvertFrom-Json
    Write-Host "Response:" -ForegroundColor Green
    Write-Host ($content | ConvertTo-Json -Depth 10) -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Error: HTTP $statusCode" -ForegroundColor Red
    
    # Try to get the response body
    $result = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($result)
    $reader.BaseStream.Position = 0
    $reader.DiscardBufferedData()
    $responseBody = $reader.ReadToEnd()
    
    Write-Host "Error Response Body:" -ForegroundColor Red
    Write-Host $responseBody -ForegroundColor Red
    
    try {
        $errorJson = $responseBody | ConvertFrom-Json
        Write-Host "Parsed Error:" -ForegroundColor Red
        Write-Host ($errorJson | ConvertTo-Json -Depth 10) -ForegroundColor Red
    } catch {
        Write-Host "Could not parse error as JSON" -ForegroundColor Yellow
    }
}
