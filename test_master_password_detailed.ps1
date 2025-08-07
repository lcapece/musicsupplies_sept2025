# Test Master Password Authentication with Detailed Response
$url = "https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/authenticate-with-master-password"
$body = @{
    accountNumber = "999"
    password = "Music123"
} | ConvertTo-Json

Write-Host "Testing master password authentication..." -ForegroundColor Yellow
Write-Host "URL: $url" -ForegroundColor Cyan
Write-Host "Body: $body" -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri $url -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
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
