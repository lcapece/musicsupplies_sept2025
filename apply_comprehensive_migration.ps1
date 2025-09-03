# Apply comprehensive migration to fix 404 API errors
# This script applies the missing functions and tables to Supabase

$ErrorActionPreference = "Stop"

# Load environment variables
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^([^#][^=]*?)=(.*)$") {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            if ($value -match "^[`"'].*[`"']$") {
                $value = $value.Substring(1, $value.Length - 2)
            }
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

$supabaseUrl = $env:VITE_SUPABASE_URL
$serviceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $supabaseUrl -or -not $serviceRoleKey) {
    Write-Error "Missing required environment variables. Check .env file for VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    exit 1
}

$migrationFile = "supabase/migrations/20250827_fix_missing_functions_comprehensive.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Error "Migration file not found: $migrationFile"
    exit 1
}

Write-Host "Reading migration file..." -ForegroundColor Green
$migrationSql = Get-Content $migrationFile -Raw

Write-Host "Applying comprehensive migration to fix missing functions..." -ForegroundColor Green
Write-Host "Target: $supabaseUrl" -ForegroundColor Gray

# Prepare the request body
$body = @{
    query = $migrationSql
} | ConvertTo-Json -Depth 10

# Execute the migration
try {
    $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/rpc/exec" -Method POST -Headers @{
        "Authorization" = "Bearer $serviceRoleKey"
        "Content-Type" = "application/json"
        "apikey" = $serviceRoleKey
    } -Body $body

    Write-Host "✅ Migration applied successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "The following functions are now available:" -ForegroundColor Cyan
    Write-Host "  • get_system_logs - System event logging"
    Write-Host "  • get_cart_activity_admin - Cart activity tracking"
    Write-Host "  • get_all_cart_contents - Active cart monitoring"
    Write-Host "  • set_config / get_config - System configuration"
    Write-Host "  • log_sms_failure / get_sms_failures - SMS error tracking"
    Write-Host ""
    Write-Host "Created tables:" -ForegroundColor Cyan
    Write-Host "  • app_events - System event logs"
    Write-Host "  • cart_activity - Shopping cart activity"
    Write-Host "  • product_views - Product browsing history"
    Write-Host "  • sms_failures - SMS error tracking"
    Write-Host "  • system_config - Application configuration"
    Write-Host ""
    Write-Host "This should resolve the 404 errors in SystemLogTab and related components." -ForegroundColor Yellow

} catch {
    Write-Host "❌ Error applying migration:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
    exit 1
}

Write-Host ""
Write-Host "Migration completed. You can now test the System Log panel in the admin dashboard." -ForegroundColor Green
