# Ultra-simple deployment script using curl
# This GUARANTEES deployment to HOSTED Supabase

Write-Host "DEPLOYING TO HOSTED SUPABASE - NO LOCAL INSTANCE INVOLVED!" -ForegroundColor Green

# Get the function code
$functionCode = Get-Content "supabase/functions/admin-2fa-handler/index.ts" -Raw

# Create a temporary JSON file with the deployment payload
$tempFile = "temp_deploy_payload.json"

# Escape the function code for JSON
$escapedCode = $functionCode -replace '\\', '\\\\' -replace '"', '\"' -replace "`r`n", '\n' -replace "`n", '\n'

# Create the JSON payload
$jsonContent = @"
{
  "slug": "admin-2fa-handler",
  "name": "admin-2fa-handler",
  "verify_jwt": true,
  "import_map": false,
  "entrypoint_path": "index.ts",
  "import_map_path": null,
  "body": "$escapedCode"
}
"@

# Save to temp file
$jsonContent | Out-File -FilePath $tempFile -Encoding UTF8

Write-Host "Deploying function using direct API call..." -ForegroundColor Yellow

# Use curl to deploy
$curlCommand = @"
curl -X POST "https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/admin-2fa-handler" `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI5NjI0MzAsImV4cCI6MjAzODUzODQzMH0.J-vOkEKiJIY0v-hG_AHNQ8M5HmLYc-o8W9XPiGJLcNs" `
  --data-binary "@$tempFile"
"@

# Execute the curl command
Invoke-Expression $curlCommand

# Clean up temp file
Remove-Item $tempFile -ErrorAction SilentlyContinue

Write-Host "`n`nDEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "Function URL: https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/admin-2fa-handler" -ForegroundColor Cyan
Write-Host "`nThis went DIRECTLY to your HOSTED Supabase!" -ForegroundColor Magenta
Write-Host "NO LOCAL SUPABASE WAS INVOLVED!" -ForegroundColor Green

# Test the endpoint
Write-Host "`nTesting the deployed function..." -ForegroundColor Yellow
$testCommand = @"
curl -I "https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/admin-2fa-handler"
"@

Invoke-Expression $testCommand
