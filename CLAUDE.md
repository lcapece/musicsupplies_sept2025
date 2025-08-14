## Development Environment
- OS: Windows 10.0.26100
- Shell: Git Bash
- Path format: Windows (use forward slashes in Git Bash)
- File system: Case-insensitive
- Line endings: CRLF (configure Git autocrlf)

## CRITICAL: Verification Requirements
**NEVER mark a task as complete without verification:**
- Deployments: MUST show the deployed URL and confirm it's accessible
- Build commands: MUST show successful output or error messages
- Multi-step tasks: MUST verify each step before proceeding
- File operations: MUST confirm files were created/modified
- Commands with no output: MUST use follow-up commands to verify success

**For deployments specifically:**
1. Run the deployment command
2. Capture and show the output/URL
3. Verify the site is accessible
4. ONLY THEN mark as complete

**If a command shows no output:**
- This likely means it failed or isn't working
- Try alternative approaches
- Use verbose flags or different commands
- NEVER assume success without confirmation

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

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.