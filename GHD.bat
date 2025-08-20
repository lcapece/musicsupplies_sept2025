@echo off
setlocal enabledelayedexpansion

REM GitHub Repository Bulk Delete Script for Windows
REM WARNING: This will permanently delete repositories!

REM Replace with your GitHub username
set GITHUB_USERNAME=YOUR_USERNAME_HERE

echo WARNING: This will permanently delete repositories!
echo Make sure you have:
echo 1. Backed up any important code
echo 2. Revoked/rotated all exposed API keys
echo 3. Updated GITHUB_USERNAME in this script
echo.

set /p confirmation="Are you absolutely sure you want to continue? (type DELETE to confirm): "

if not "%confirmation%"=="DELETE" (
    echo Aborted.
    exit /b 1
)

echo Starting deletion process...

REM Check if user is logged in
gh auth status >nul 2>&1
if errorlevel 1 (
    echo Error: Not logged into GitHub CLI.
    echo Run: gh auth login
    exit /b 1
)

set deleted_count=0
set failed_count=0

REM Delete each repository
call :delete_repo "musicsupplies_rc12"
call :delete_repo "musicsupplies_rc11"
call :delete_repo "musicsupplies_prod"
call :delete_repo "musicsupplies_rc10"
call :delete_repo "skincare"
call :delete_repo "music-supplies"
call :delete_repo "music-supplies-v4"
call :delete_repo "breanne-skincare"
call :delete_repo "iq-maker"
call :delete_repo "music-supplies-0527"
call :delete_repo "movie-maker-0514"
call :delete_repo "breanne2"
call :delete_repo "musicsupplies-v9"
call :delete_repo "redshift-outopost-0225"
call :delete_repo "dice-football-"
call :delete_repo "skincare-2025"
call :delete_repo "facewash"
call :delete_repo "breanne"
call :delete_repo "frameshift"
call :delete_repo "git_musicsupplies_v4"
call :delete_repo "musicsupplies_0519"
call :delete_repo "softscraper"
call :delete_repo "louiscapece"
call :delete_repo "redshift-tools2"
call :delete_repo "redshift-tools-prod"
call :delete_repo "redshift-tools"
call :delete_repo "rstools"
call :delete_repo "redshift-hub"
call :delete_repo "liveworms"
call :delete_repo "da"
call :delete_repo "gemini-af"
call :delete_repo "netlify"
call :delete_repo "sb1"
call :delete_repo "sparkle-start-project"
call :delete_repo "open-sky-whisper"
call :delete_repo "greet-with-gusto"
call :delete_repo "lcmd_rc11"
call :delete_repo "musicsupplies_rc2"
call :delete_repo "music_supplies_prod"
call :delete_repo "musicsupplies_0603"
call :delete_repo "ms-0529"
call :delete_repo "musicsupplies_v4"
call :delete_repo "music-suppl