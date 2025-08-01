# Test script to get REAL S3 file names from the deployed edge function

Write-Host "Testing S3 Edge Function to get REAL file names..." -ForegroundColor Green

# Get the Supabase project URL and anon key
$projectUrl = "https://ekklokrukxmqlahtonnc.supabase.co"
$functionUrl = "$projectUrl/functions/v1/list-s3-files"

# Read the anon key from .env file
$envContent = Get-Content ".env" -Raw
$anonKey = ($envContent | Select-String -Pattern "VITE_SUPABASE_ANON_KEY=(.+)").Matches[0].Groups[1].Value.Trim()

Write-Host "`nCalling Edge Function at: $functionUrl" -ForegroundColor Cyan

try {
    # Call the edge function
    $headers = @{
        "apikey" = $anonKey
        "Authorization" = "Bearer $anonKey"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri $functionUrl -Method GET -Headers $headers
    
    Write-Host "`nResponse from Edge Function:" -ForegroundColor Green
    Write-Host "Bucket: $($response.bucket)" -ForegroundColor Yellow
    Write-Host "Region: $($response.region)" -ForegroundColor Yellow
    Write-Host "Total Files: $($response.count)" -ForegroundColor Yellow
    Write-Host "`nREAL S3 Files:" -ForegroundColor Cyan
    
    foreach ($file in $response.files) {
        Write-Host "  - $($file.filename) (Size: $($file.size) bytes, Last Modified: $($file.lastModified))" -ForegroundColor White
    }
    
    # Save to file for reference
    $response | ConvertTo-Json -Depth 10 | Out-File "real_s3_files.json"
    Write-Host "`nFull response saved to real_s3_files.json" -ForegroundColor Green
    
} catch {
    Write-Host "`nError calling edge function:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "`nError Response Body:" -ForegroundColor Red
        Write-Host $errorBody
    }
}
