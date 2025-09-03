# Apply ORDER_ITEMS JSON Formatting Fix
Write-Host "Applying ORDER_ITEMS JSON formatting fix..." -ForegroundColor Cyan

# Load environment variables
$envPath = ".\.env"
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -match "^([^=]+)=(.*)$") {
            $key = $matches[1]
            $value = $matches[2]
            Set-Item -Path "env:$key" -Value $value -Force
        }
    }
    Write-Host "Environment variables loaded" -ForegroundColor Green
}

$SUPABASE_PROJECT_ID = $env:SUPABASE_PROJECT_ID
$SUPABASE_DB_PASSWORD = $env:SUPABASE_DB_PASSWORD

if (-not $SUPABASE_PROJECT_ID -or -not $SUPABASE_DB_PASSWORD) {
    Write-Host "ERROR: SUPABASE_PROJECT_ID or SUPABASE_DB_PASSWORD not found in .env file" -ForegroundColor Red
    Write-Host "Please ensure your .env file contains these variables" -ForegroundColor Yellow
    exit 1
}

$DB_HOST = "aws-0-us-east-1.pooler.supabase.com"
$DB_NAME = "postgres"
$DB_USER = "postgres.${SUPABASE_PROJECT_ID}"
$DB_PORT = 5432

# Read the migration SQL
$migrationFile = ".\supabase\migrations\20250828_fix_order_items_json_formatting.sql"
if (-not (Test-Path $migrationFile)) {
    Write-Host "ERROR: Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

$sql = Get-Content $migrationFile -Raw

Write-Host "`nMigration contents:" -ForegroundColor Yellow
Write-Host "- Creates validate_and_fix_order_items() function to fix concatenated arrays" -ForegroundColor Cyan
Write-Host "- Creates trigger to automatically fix ORDER_ITEMS before insert/update" -ForegroundColor Cyan
Write-Host "- Updates complete_order() function to ensure proper JSON array formatting" -ForegroundColor Cyan
Write-Host "- Adds constraint to ensure ORDER_ITEMS is always a valid JSON array" -ForegroundColor Cyan
Write-Host "- Creates function to fix existing malformed data (commented out by default)" -ForegroundColor Cyan

Write-Host "`nConnecting to database..." -ForegroundColor Yellow
Write-Host "Host: $DB_HOST" -ForegroundColor Gray
Write-Host "Database: $DB_NAME" -ForegroundColor Gray
Write-Host "User: $DB_USER" -ForegroundColor Gray

# Set PGPASSWORD environment variable for psql
$env:PGPASSWORD = $SUPABASE_DB_PASSWORD

# Execute the migration
Write-Host "`nExecuting migration..." -ForegroundColor Yellow

$psqlCommand = "psql -h `"$DB_HOST`" -p $DB_PORT -U `"$DB_USER`" -d `"$DB_NAME`" -c `"$sql`""

try {
    $result = Invoke-Expression $psqlCommand 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nMigration applied successfully!" -ForegroundColor Green
        Write-Host "`nWhat this fix does:" -ForegroundColor Yellow
        Write-Host "1. Any new orders will have their ORDER_ITEMS validated and fixed if needed" -ForegroundColor White
        Write-Host "2. If concatenated arrays are detected, they'll be merged into a single array" -ForegroundColor White
        Write-Host "3. The complete_order function now ensures proper JSON array formatting" -ForegroundColor White
        Write-Host "4. A constraint prevents invalid JSON arrays from being stored" -ForegroundColor White
        Write-Host "`nNext steps:" -ForegroundColor Yellow
        Write-Host "- Test placing new orders to verify ORDER_ITEMS are stored correctly" -ForegroundColor Cyan
        Write-Host "- Monitor for any warnings in the database logs about fixed ORDER_ITEMS" -ForegroundColor Cyan
        Write-Host "- If you need to fix existing data, uncomment and run: SELECT fix_existing_order_items();" -ForegroundColor Cyan
    } else {
        Write-Host "`nError applying migration:" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "`nError executing migration:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
} finally {
    # Clean up environment variable
    Remove-Item env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host "`nDone!" -ForegroundColor Green
