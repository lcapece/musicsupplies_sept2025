# Emergency deployment script for Windows
Write-Host "=== EMERGENCY DEPLOYMENT ===" -ForegroundColor Red
Write-Host ""

# 1. Clean everything
Write-Host "1. Cleaning old build..." -ForegroundColor Yellow
Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "node_modules/.vite" -Recurse -Force -ErrorAction SilentlyContinue

# 2. Build
Write-Host "2. Building application..." -ForegroundColor Yellow
npx vite build

# 3. Verify NUCLEAR BLOCK is in build
Write-Host "3. Verifying NUCLEAR BLOCK is in build..." -ForegroundColor Yellow
$found = Select-String -Path "dist/assets/*.js" -Pattern "NUCLEAR BLOCK" -Quiet
if ($found) {
    Write-Host "   ✓ NUCLEAR BLOCK found in build!" -ForegroundColor Green
} else {
    Write-Host "   ✗ WARNING: NUCLEAR BLOCK NOT FOUND IN BUILD!" -ForegroundColor Red
}

# 4. Deploy
Write-Host "4. Deploying to Netlify..." -ForegroundColor Yellow
netlify deploy --prod --dir=dist

Write-Host ""
Write-Host "=== DEPLOYMENT COMPLETE ===" -ForegroundColor Green
Write-Host "Site: https://musicsupplies.com/5150" -ForegroundColor Cyan
Write-Host ""
Write-Host "CRITICAL: Test immediately!" -ForegroundColor Red
Write-Host "- Try 999/Music123 - should be BLOCKED" -ForegroundColor Yellow
Write-Host "- Try 999/2750grove - should WORK" -ForegroundColor Yellow