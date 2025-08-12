## Development Environment
- OS: Windows 10.0.26100
- Shell: Git Bash
- Path format: Windows (use forward slashes in Git Bash)
- File system: Case-insensitive
- Line endings: CRLF (configure Git autocrlf)

## Playwright MCP Guide

File paths:
- Screenshots: `./CCimages/screenshots/`
- PDFs: `./CCimages/pdfs/`

Browser error fix: `npx playwright install`

## Version Update & PWA Cache Busting

When updating the version before deployment:
1. Run `npm run update-version` to update package.json version
2. This automatically writes version to .env file as VITE_APP_VERSION
3. The PWA plugin uses this version for cache busting
4. Users will automatically get the latest version without cache issues

The version format is: RC[month][day].[hour][minute]
Example: RC812.1357 (August 12, 13:57)
