# Load environment variables
$envFile = Get-Content .env
foreach ($line in $envFile) {
    if ($line -match '^\s*([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        Set-Item -Path "env:$name" -Value $value
    }
}

$headers = @{
    'Authorization' = "Bearer $env:VITE_SUPABASE_ANON_KEY"
    'apikey' = $env:VITE_SUPABASE_ANON_KEY
    'Content-Type' = 'application/json'
}

$body = @{
    accountNumber = '999'
    password = 'Music123'
} | ConvertTo-Json

Write-Host "Testing master password authentication..."
Write-Host "URL: https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/authenticate-with-master-password"
Write-Host "Account: 999"
Write-Host "Password: Music123"
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri 'https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/authenticate-with-master-password' -Method POST -Headers $headers -Body $body
    Write-Host "Success! Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body:" -ForegroundColor Yellow
        Write-Host $responseBody
    }
}
