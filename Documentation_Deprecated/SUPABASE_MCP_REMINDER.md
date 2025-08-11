# 🚨 IMPORTANT: SUPABASE MCP IS AVAILABLE! 🚨

## YOU HAVE DIRECT ACCESS TO SUPABASE MCP TOOLS!

Before creating scripts, batch files, or manual instructions, **ALWAYS CHECK FOR MCP TOOLS FIRST!**

### Available Supabase MCP Tools:

#### Database Operations:
- `execute_sql` - Execute SQL directly
- `apply_migration` - Apply database migrations
- `list_tables` - List all tables
- `list_extensions` - List database extensions

#### Edge Functions:
- `deploy_edge_function` - Deploy edge functions WITHOUT Docker/CLI! ✅
- `list_edge_functions` - List all edge functions

#### Branch Management:
- `create_branch` - Create development branches
- `list_branches` - List branches
- `merge_branch` - Merge branches
- `delete_branch` - Delete branches

#### Project Info:
- `get_project_url` - Get API URL
- `get_anon_key` - Get anonymous key
- `generate_typescript_types` - Generate TypeScript types

#### Monitoring:
- `get_logs` - Get service logs
- `get_advisors` - Get security/performance advisors

#### Documentation:
- `search_docs` - Search Supabase documentation

## HOW TO USE:

```xml
<use_mcp_tool>
<server_name>github.com/supabase-community/supabase-mcp</server_name>
<tool_name>deploy_edge_function</tool_name>
<arguments>
{
  "name": "function-name",
  "files": [...]
}
</arguments>
</use_mcp_tool>
```

## REMEMBER:
1. **CHECK MCP TOOLS FIRST** before writing scripts
2. **USE MCP TOOLS DIRECTLY** instead of CLI commands
3. **NO DOCKER NEEDED** for edge function deployment via MCP
4. **IMMEDIATE EXECUTION** - no need for user to run commands

## Common Tasks via MCP:
- Deploy edge functions: Use `deploy_edge_function`
- Run SQL migrations: Use `apply_migration`
- Execute SQL queries: Use `execute_sql`
- Check logs: Use `get_logs`

**STOP creating .bat files when MCP tools can do the job directly!**
