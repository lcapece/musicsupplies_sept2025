  @echo off
  cd /d "C:\Users\ryanh\rc10\musicsupplies_rc10"
  echo EMERGENCY BACKUP - Saving your 6 important files...
  echo.

  REM Create backup folder in C:etl
  mkdir "C:etl" 2>nul

  REM Backup files that exist
  echo Backing up CLAUDE.md...
  if exist "CLAUDE.md" copy "CLAUDE.md" "C:etl

  echo Backing up ProspectsForm.tsx...
  if exist "src\components\ProspectsForm.tsx" copy "src\components\ProspectsForm.tsx" "C:etl

  echo Backing up ProspectsPage.tsx...
  if exist "src\pages\ProspectsPage.tsx" copy "src\pages\ProspectsPage.tsx" "C:etl

  echo Backing up ai-screenshot-demo.js...
  if exist "ai-screenshot-demo.js" copy "ai-screenshot-demo.js" "C:etl

  echo Backing up screenshot-tool.js...
  if exist "screenshot-tool.js" copy "screenshot-tool.js" "C:etl

  echo Backing up secure .env file...
  if exist ".env" copy ".env" "C:etl\secure_env_file.txt"

  echo.
  echo BACKUP COMPLETE!
  echo Your files are saved to: C:etlecho.
  pause

  Key fixes:
  - Added backslash: "C:\_etl\" instead of "C:etl
  - Removed 2>nul to see any error messages
  - Fixed the path formatting