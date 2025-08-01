# Direct test of the edge function
Write-Host "Testing edge function directly..." -ForegroundColor Green

$url = "https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/list-s3-files"

# Get anon key from .env
$envContent = Get-Content ".env" -Raw
$anonKey = ($envContent | Select-String -Pattern "VITE_SUPABASE_ANON_KEY=(.+)").Matches[0].Groups[1].Value.Trim()

$headers = @{
    "apikey" = $anonKey
    "Authorization" = "Bearer $anonKey"
}

try {
    $response = Invoke-RestMethod -Uri $url -Method GET -Headers $headers
    
    Write-Host "`nSUCCESS! Edge function is working!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 3
    
    Write-Host "`nFiles found: $($response.count)" -ForegroundColor Cyan
    Write-Host "Bucket: $($response.bucket)" -ForegroundColor Cyan
    Write-Host "Region: $($response.region)" -ForegroundColor Cyan
    
} catch {
    Write-Host "`nError calling edge function:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "`nError details:" -ForegroundColor Red
        Write-Host $errorBody
    }
}
