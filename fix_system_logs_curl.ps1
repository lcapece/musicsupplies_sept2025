# Fix system logs using curl to Supabase SQL editor API
# This uses the correct Supabase SQL endpoint

$ErrorActionPreference = "Stop"

# Load environment variables
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^([^#][^=]*?)=(.*)$") {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            if ($value -match "^[`"'].*[`"']$") {
                $value = $value.Substring(1, $value.Length - 2)
            }
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

$supabaseUrl = $env:VITE_SUPABASE_URL
$serviceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $supabaseUrl -or -not $serviceRoleKey) {
    Write-Error "Missing required environment variables"
    exit 1
}

Write-Host "🚨 FIXING SYSTEM LOGS with curl..." -ForegroundColor Red

# Extract project ID from URL
$projectId = ($supabaseUrl -split "//")[1].Split('.')[0]
Write-Host "Project ID: $projectId" -ForegroundColor Gray

$sql = @"
-- Create app_events table
CREATE TABLE IF NOT EXISTS public.app_events (
  id BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type TEXT NOT NULL,
  account_number INTEGER,
  email_address TEXT,
  session_id UUID,
  request_id UUID,
  ip INET,
  user_agent TEXT,
  path TEXT,
  referrer TEXT,
  metadata JSONB DEFAULT '{}',
  created_by TEXT DEFAULT 'system',
  is_internal BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Admin only access" ON public.app_events;
CREATE POLICY "Admin only access" ON public.app_events FOR ALL USING (false);

DROP POLICY IF EXISTS "Service role full access" ON public.app_events;  
CREATE POLICY "Service role full access" ON public.app_events FOR ALL TO service_role USING (true);

-- Create function
CREATE OR REPLACE FUNCTION public.get_system_logs(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_event_types TEXT[] DEFAULT NULL,
  p_search_string TEXT DEFAULT NULL,
  p_account_number INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  id BIGINT,
  occurred_at TIMESTAMPTZ,
  event_type TEXT,
  account_number INTEGER,
  email_address TEXT,
  session_id UUID,
  request_id UUID,
  ip INET,
  user_agent TEXT,
  path TEXT,
  referrer TEXT,
  metadata JSONB,
  created_by TEXT,
  is_internal BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS `$`$
BEGIN
  IF current_setting('app.current_account_number')::INTEGER != 999 THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    ae.id, ae.occurred_at, ae.event_type, ae.account_number, ae.email_address,
    ae.session_id, ae.request_id, ae.ip, ae.user_agent, ae.path, ae.referrer,
    ae.metadata, ae.created_by, ae.is_internal
  FROM public.app_events ae
  WHERE 
    (p_start_date IS NULL OR ae.occurred_at >= p_start_date) AND
    (p_end_date IS NULL OR ae.occurred_at <= p_end_date) AND
    (p_event_types IS NULL OR ae.event_type = ANY(p_event_types)) AND
    (p_search_string IS NULL OR (
      ae.metadata::TEXT ILIKE '%' || p_search_string || '%' OR
      ae.path ILIKE '%' || p_search_string || '%'
    )) AND
    (p_account_number IS NULL OR ae.account_number = p_account_number)
  ORDER BY ae.occurred_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
`$`$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_system_logs(TIMESTAMPTZ, TIMESTAMPTZ, TEXT[], TEXT, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT ALL ON public.app_events TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Insert test data
INSERT INTO public.app_events (event_type, account_number, email_address, metadata, created_by) 
VALUES 
('auth.login_success', 999, 'admin@example.com', '{"ip": "127.0.0.1"}', 'system'),
('admin.action_performed', 999, 'admin@example.com', '{"action": "system_log_access"}', 'admin'),
('system.function_created', 999, 'admin@example.com', '{"function_name": "get_system_logs"}', 'system')
ON CONFLICT DO NOTHING;
"@

# Write SQL to temp file
$sqlFile = "temp_fix_sql.sql"
$sql | Out-File -FilePath $sqlFile -Encoding UTF8

try {
    Write-Host "Executing SQL via curl..." -ForegroundColor Yellow
    
    # Use curl to execute the SQL
    $curlArgs = @(
        "-X", "POST"
        "-H", "Authorization: Bearer $serviceRoleKey"
        "-H", "Content-Type: application/json"
        "-H", "apikey: $serviceRoleKey"
        "-d", "@$sqlFile"
        "https://api.supabase.com/v1/projects/$projectId/sql"
    )
    
    $result = & curl @curlArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ SQL executed successfully!" -ForegroundColor Green
        Write-Host "Result: $result" -ForegroundColor Gray
    } else {
        Write-Host "❌ Curl failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        Write-Host "Result: $result" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error executing SQL:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
} finally {
    # Clean up temp file
    if (Test-Path $sqlFile) {
        Remove-Item $sqlFile
    }
}

Write-Host ""
Write-Host "🎉 System logs fix attempt complete!" -ForegroundColor Green
Write-Host "Test the SystemLogTab in your admin dashboard now." -ForegroundColor Yellow
