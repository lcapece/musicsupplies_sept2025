@echo off
echo Setting up Supabase MCP for Claude Desktop...
echo.

set CLAUDE_DIR=%APPDATA%\Claude
set CONFIG_FILE=%CLAUDE_DIR%\claude_desktop_config.json

echo Claude configuration directory: %CLAUDE_DIR%
echo.

if not exist "%CLAUDE_DIR%" (
    mkdir "%CLAUDE_DIR%"
    echo Created Claude directory
)

echo Copying configuration file...
copy /Y claude_desktop_config_ready.json "%CONFIG_FILE%"

if exist "%CONFIG_FILE%" (
    echo Configuration successfully copied to: %CONFIG_FILE%
    echo.
    echo Configuration content:
    type "%CONFIG_FILE%"
) else (
    echo ERROR: Failed to copy configuration file
    exit /b 1
)

echo.
echo ============================================
echo IMPORTANT: Next steps to complete setup:
echo ============================================
echo.
echo 1. Make sure Node.js is installed
echo    - Check with: node --version
echo    - If not installed, download from https://nodejs.org/
echo    - For ARM64, use the ARM64 Windows installer
echo.
echo 2. Restart Claude Desktop completely:
echo    - File menu -^> Exit
echo    - Reopen Claude Desktop
echo.
echo 3. In Claude, run: /mcp
echo    - You should see "supabase" in the list
echo.
echo 4. If MCP still doesn't work:
echo    - Check Node.js is in PATH
echo    - Try running: npx -y @modelcontextprotocol/server-supabase --help
echo    - This will test if the MCP server can be launched
echo.
pause