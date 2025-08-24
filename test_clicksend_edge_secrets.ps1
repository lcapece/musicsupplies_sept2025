# Test ClickSend SMS via Edge Function with stored secrets
Write-Host "Testing ClickSend SMS via Edge Function..." -ForegroundColor Cyan

# Read environment variables
$envContent = Get-Content .env -Raw
$supabaseUrl = if ($envContent -match 'VITE_SUPABASE_URL=(.+)') { $matches[1].Trim() } else { $null }
$supabaseAnonKey = if ($envContent -match 'VITE_SUPABASE_ANON_KEY=(.+)') { $matches[1].Trim() } else { $null }

if (-not $supabaseUrl -or -not $supabaseAnonKey) {
    Write-Host "Error: Could not read Supabase URL or Anon Key from .env file" -ForegroundColor Red
    exit 1
}

Write-Host "Supabase URL: $supabaseUrl" -ForegroundColor Green
Write-Host "Using Edge Function: test-clicksend-edge" -ForegroundColor Green

# Call the Edge function
$functionUrl = "$supabaseUrl/functions/v1/test-clicksend-edge"

$headers = @{
    "Authorization" = "Bearer $supabaseAnonKey"
    "Content-Type" = "application/json"
}

try {
    Write-Host "`nCalling Edge function..." -ForegroundColor Yellow
