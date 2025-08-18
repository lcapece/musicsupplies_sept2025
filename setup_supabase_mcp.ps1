# Setup Supabase MCP for Claude Desktop

Write-Host "Setting up Supabase MCP for Claude Desktop..." -ForegroundColor Green

# Get the AppData path
$appDataPath = [Environment]::GetFolderPath('ApplicationData')
$claudePath = Join-Path $appDataPath "Claude"
$configFile = Join-Path $claudePath "claude_desktop_config.json"

Write-Host "Claude configuration path: $claudePath" -ForegroundColor Yellow

# Create Claude directory if it doesn't exist
if (-not (Test-Path $claudePath)) {
    New-Item -ItemType Directory -Path $claudePath -Force | Out-Null
    Write-Host "Created Claude directory" -ForegroundColor Green
}

# Read the config from the ready file
$sourceConfig = Get-Content "claude_desktop_config_ready.json" -Raw

# Write the config to the Claude directory
$sourceConfig | Set-Content $configFile -Force
Write-Host "Configuration file written to: $configFile" -ForegroundColor Green

# Display the configuration
Write-Host "`nConfiguration content:" -ForegroundColor Cyan
Get-Content $configFile

# Test if npx is available
Write-Host "`nTesting npx availability..." -ForegroundColor Yellow
$npxPath = Get-Command npx -ErrorAction SilentlyContinue

if ($npxPath) {
    Write-Host "npx found at: $($npxPath.Path)" -ForegroundColor Green
    
    # Test the Supabase MCP command
    Write-Host "`nTesting Supabase MCP installation..." -ForegroundColor Yellow
    & npx -y @modelcontextprotocol/server-supabase --help 2>&1 | Select-Object -First 5
} else {
    Write-Host "npx not found! Node.js needs to be installed." -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "For ARM64 Windows, use the ARM64 installer." -ForegroundColor Yellow
}

Write-Host "`n" -ForegroundColor White
Write-Host "IMPORTANT NEXT STEPS:" -ForegroundColor Magenta
Write-Host "1. If Node.js is not installed, install it from https://nodejs.org/" -ForegroundColor White
Write-Host "2. Restart Claude Desktop completely (File -> Exit, then reopen)" -ForegroundColor White
Write-Host "3. Check MCP status with /mcp command in Claude" -ForegroundColor White
Write-Host "4. The Supabase MCP should appear in the list" -ForegroundColor White