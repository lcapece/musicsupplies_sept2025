# CRITICAL CONFIGURATION NOTE

## ⚠️ REMOTE SUPABASE ONLY - NO LOCAL INSTALLATION ⚠️

This project uses **REMOTE SUPABASE ONLY**. There is NO local Supabase CLI installed.

### Key Points:
- ✅ Remote Supabase instance is used for all database operations
- ✅ Edge functions are deployed to remote Supabase
- ✅ All migrations run on the remote database
- ❌ NO local Supabase CLI (`supabase` command)
- ❌ NO local database
- ❌ NO local Supabase development environment

### How to work with this project:
1. Use the Supabase MCP server for remote operations
2. Deploy edge functions through the Supabase dashboard or API
3. Run migrations through the Supabase dashboard
4. All database connections use the remote Supabase URL

### Environment Variables:
- Check `.env` file for remote Supabase configuration
- Uses remote Supabase URL and keys only

**DO NOT suggest any local Supabase CLI commands like:**
- `supabase init`
- `supabase start`
- `supabase functions deploy`
- `supabase db push`
- Any other `supabase` CLI commands

This configuration is intentional and should never be changed.
