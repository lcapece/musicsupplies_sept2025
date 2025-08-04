@echo off
echo Applying mobile phone migration...

rem Use the MCP to apply the migration
call supabase migration up
if %errorlevel% neq 0 (
    echo Failed to apply migration
    pause
    exit /b 1
)

echo Migration applied successfully
pause
