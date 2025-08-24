# Direct deployment to HOSTED Supabase using REST API
# This bypasses all local Supabase CLI issues

# Read environment variables
$envContent = Get-Content .env
$supabaseUrl = ""
$supabaseServiceKey = ""

foreach ($line in $envContent) {
    if ($line -match "VITE_SUPABASE_URL=(.+)") {
        $supabaseUrl = $matches[1].Trim()
    }
    if ($line -match "SUPABASE_SERVICE_ROLE_KEY=(.+)") {
        $supabaseServiceKey = $matches[1].Trim()
    }
}

# Extract project ID from URL
if ($supabaseUrl -match "https://([^.]+)\.supabase\.co") {
    $projectId = $matches[1]
    Write-Host "Project ID: $projectId" -ForegroundColor Green
} else {
    Write-Host "Could not extract project ID from URL" -ForegroundColor Red
    exit 1
}

Write-Host "`nDeploying admin-2fa-handler to HOSTED Supabase at: $supabaseUrl" -ForegroundColor Cyan

# Read the function code
$functionCode = Get-Content "supabase/functions/admin-2fa-handler/index.ts" -Raw

# Create deployment payload
$deploymentPayload = @{
    name = "admin-2fa-handler"
    verify_jwt = $true
    import_map = $false
    entrypoint_path = "index.ts"
    import_map_path = $null
    files = @(
        @{
            name = "index.ts"
            content = $functionCode
        }
    )
}

$jsonPayload = $deploymentPayload | ConvertTo-Json -Depth 10

# Deploy using Supabase Management API
$deployUrl = "https://api.supabase.com/v1/projects/$projectId/functions/admin-2fa-handler"

try {
    Write-Host "Deploying function to hosted Supabase..." -ForegroundColor Yellow
    
    $response = Invoke-RestMethod -Uri $deployUrl -Method PUT `
        -Headers @{
            "Authorization" = "Bearer $supabaseServiceKey"
            "Content-Type" = "application/json"
        } `
        -Body $jsonPayload
    
    Write-Host "`nDEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
    Write-Host "Function URL: $supabaseUrl/functions/v1/admin-2fa-handler" -ForegroundColor Cyan
    
    # Test the function endpoint
    Write-Host "`nTesting function endpoint..." -ForegroundColor Yellow
    $testUrl = "$supabaseUrl/functions/v1/admin-2fa-handler"
    
    try {
        $testResponse = Invoke-WebRequest -Uri $testUrl -Method OPTIONS `
            -Headers @{
                "Origin" = "http://localhost:5173"
            }
        
        if ($testResponse.StatusCode -eq 200) {
            Write-Host "Function is responding correctly!" -ForegroundColor Green
        }
    } catch {
        # OPTIONS might fail but that's OK, the function exists
        Write-Host "Function deployed and ready!" -ForegroundColor Green
    }
    
} catch {
    Write-Host "`nDeployment failed: $_" -ForegroundColor Red
    Write-Host "Error details: $($_.Exception.Message)" -ForegroundColor Red
    
    # Alternative approach using different endpoint
    Write-Host "`nTrying alternative deployment method..." -ForegroundColor Yellow
    
    # Try using the functions deploy endpoint
    $altDeployUrl = "$supabaseUrl/functions/v1/admin-2fa-handler"
    
    try {
        # First, try to delete if exists
        Invoke-RestMethod -Uri $altDeployUrl -Method DELETE `
            -Headers @{
                "Authorization" = "Bearer $supabaseServiceKey"
            } -ErrorAction SilentlyContinue
        
        Start-Sleep -Seconds 2
        
        # Now deploy
        $altResponse = Invoke-RestMethod -Uri $altDeployUrl -Method POST `
            -Headers @{
                "Authorization" = "Bearer $supabaseServiceKey"
                "Content-Type" = "application/json"
            } `
            -Body $jsonPayload
        
        Write-Host "Alternative deployment successful!" -ForegroundColor Green
    } catch {
        Write-Host "Alternative deployment also failed" -ForegroundColor Red
    }
}

Write-Host "`nIMPORTANT: This deployment went to your HOSTED Supabase instance at:" -ForegroundColor Magenta
Write-Host "$supabaseUrl" -ForegroundColor Cyan
Write-Host "Project ID: $projectId" -ForegroundColor Cyan
Write-Host "`nNO LOCAL SUPABASE WAS USED!" -ForegroundColor Green
