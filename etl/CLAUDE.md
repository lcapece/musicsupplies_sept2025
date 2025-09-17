# Global Project Instructions

## Testing Policy
**CRITICAL: Never invoke testing automatically after completing tasks.**

- Do NOT run `npm test`, `npm run test`, or any test commands unless specifically requested
- Do NOT invoke Playwright, Puppeteer, or any automated testing tools
- Do NOT start test servers or testing processes
- Do NOT run build verification tests automatically
- Only run tests when explicitly asked by the user

## Code Completion Standards
- Complete the requested task
- Verify code compiles/builds if applicable
- Do not automatically run test suites
- Wait for user instruction before any testing activities

## Security Requirements
- Never commit API keys to version control
- All sensitive credentials must use Supabase Edge Functions vault
- Follow secure coding practices with proper input validation

## Database
- Uses Supabase with Row Level Security (RLS)
- Custom authentication via authenticate_user_lcmd function
- **ALWAYS use hosted Supabase - do NOT attempt to use local Supabase or create local databases unless specifically requested**