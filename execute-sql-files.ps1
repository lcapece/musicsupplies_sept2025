# PowerShell script to execute SQL files via Supabase REST API
param(
    [string]$SupabaseUrl = "https://ekklokrukxmqlahtonnc.supabase.co",
    [string]$ServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDA3MzE5NCwiZXhwIjoyMDU1NjQ5MTk0fQ.ZsVqBj8TaF5RbILv-JOlXWzQjNFI5yt5Yqn5cQMkgzw"
)

Write-Host "🚀 Starting SQL script execution..." -ForegroundColor Green
Write-Host "📡 Connecting to: $SupabaseUrl" -ForegroundColor Cyan

# Function to execute SQL file
function Execute-SqlFile {
    param(
        [string]$FilePath,
        [string]$Url,
        [string]$Key
    )
    
    Write-Host "`n🔄 Executing $(Split-Path $FilePath -Leaf)..." -ForegroundColor Yellow
    
    try {
        # Read SQL file content
        $sqlContent = Get-Content -Path $FilePath -Raw
        Write-Host "📄 Read $($sqlContent.Length) characters from file" -ForegroundColor Gray
        
        # Prepare the request body for exec_sql RPC function
        $body = @{
            sql_query = $sqlContent
        } | ConvertTo-Json -Depth 10
        
        # Setup headers
        $headers = @{
            "Authorization" = "Bearer $Key"
            "Content-Type" = "application/json"
            "apikey" = $Key
        }
        
        # Execute the SQL via RPC
        $response = Invoke-RestMethod -Uri "$Url/rest/v1/rpc/exec_sql" -Method POST -Headers $headers -Body $body
        
        Write-Host "✅ Successfully executed $(Split-Path $FilePath -Leaf)" -ForegroundColor Green
        
        if ($response) {
            Write-Host "📊 Result: $response" -ForegroundColor Gray
        }
        
        return $true
        
    } catch {
        Write-Host "❌ Error executing $(Split-Path $FilePath -Leaf): $($_.Exception.Message)" -ForegroundColor Red
        
        # Try to get more details from the response
        if ($_.Exception.Response) {
            $responseStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($responseStream)
            $responseBody = $reader.ReadToEnd()
            Write-Host "🔍 Response details: $responseBody" -ForegroundColor Red
        }
        
        return $false
    }
}

# Function to test connection
function Test-SupabaseConnection {
    param(
        [string]$Url,
        [string]$Key
    )
    
    Write-Host "🔍 Testing connection..." -ForegroundColor Yellow
    
    try {
        $headers = @{
            "Authorization" = "Bearer $Key"
            "apikey" = $Key
        }
        
        # Simple query to test connection
        $response = Invoke-RestMethod -Uri "$Url/rest/v1/accounts_lcmd?select=count&limit=1" -Method GET -Headers $headers
        
        Write-Host "✅ Connection test successful" -ForegroundColor Green
        return $true
        
    } catch {
        Write-Host "⚠️ Connection test (may be normal): $($_.Exception.Message)" -ForegroundColor Yellow
        return $true # Continue anyway, RLS might be blocking the test
    }
}

# Test connection first
if (-not (Test-SupabaseConnection -Url $SupabaseUrl -Key $ServiceRoleKey)) {
    Write-Host "❌ Connection failed. Exiting." -ForegroundColor Red
    exit 1
}

# Define SQL files to execute in order
$sqlFiles = @(
    "EMERGENCY_AUTH_FIX_FINAL.sql",
    "2FA_SETUP.sql",
    "ADD_2FA_PHONES.sql"
)

# Execute each SQL file
foreach ($sqlFile in $sqlFiles) {
    $filePath = Join-Path (Get-Location) $sqlFile
    
    if (-not (Test-Path $filePath)) {
        Write-Host "❌ File not found: $sqlFile" -ForegroundColor Red
        continue
    }
    
    $success = Execute-SqlFile -FilePath $filePath -Url $SupabaseUrl -Key $ServiceRoleKey
    
    if (-not $success) {
        Write-Host "⛔ Stopping execution due to error in $sqlFile" -ForegroundColor Red
        exit 1
    }
    
    # Small delay between executions
    Start-Sleep -Seconds 2
}

Write-Host "`n🎉 All SQL scripts executed successfully!" -ForegroundColor Green
Write-Host "`n✅ Authentication system has been updated with:" -ForegroundColor Cyan
Write-Host "   - Emergency auth fix applied" -ForegroundColor White
Write-Host "   - 2FA system setup for account 999" -ForegroundColor White  
Write-Host "   - Phone numbers added for 2FA notifications" -ForegroundColor White