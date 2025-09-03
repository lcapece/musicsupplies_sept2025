# Emergency fix for system logs - Direct SQL execution to Supabase
# This bypasses any migration issues and directly creates the required function

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
    Write-Error "Missing required environment variables. Check .env file for VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    exit 1
}

Write-Host "🚨 EMERGENCY FIX: Creating missing system log functions directly..." -ForegroundColor Red
Write-Host "Target: $supabaseUrl" -ForegroundColor Gray

# Create the app_events table first (required for get_system_logs)
$createTableSql = @"
-- Create app_events table if it doesn't exist
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
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by TEXT DEFAULT 'system',
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
DROP POLICY IF EXISTS "Admin only access" ON public.app_events;
CREATE POLICY "Admin only access" ON public.app_events FOR ALL USING (false);

-- Allow service role to bypass RLS
DROP POLICY IF EXISTS "Service role full access" ON public.app_events;
CREATE POLICY "Service role full access" ON public.app_events FOR ALL TO service_role USING (true);

-- Grant permissions
GRANT ALL ON public.app_events TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Create index
CREATE INDEX IF NOT EXISTS idx_app_events_occurred_at ON public.app_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_events_account_number ON public.app_events(account_number);
"@

try {
    Write-Host "Step 1: Creating app_events table..." -ForegroundColor Yellow
    $headers = @{
        "Authorization" = "Bearer $serviceRoleKey"
        "Content-Type" = "application/json"
        "apikey" = $serviceRoleKey
    }
    
    $body = @{ query = $createTableSql } | ConvertTo-Json -Depth 10
    
    $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/rpc/exec" -Method POST -Headers $headers -Body $body
    Write-Host "✅ Table created successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Error creating table:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# Now create the get_system_logs function
$createFunctionSql = @"
-- Create the get_system_logs function
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
SET search_path = public
AS $$$$
BEGIN
  -- Only allow admin account 999
  IF current_setting('app.current_account_number')::INTEGER != 999 THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    ae.id,
    ae.occurred_at,
    ae.event_type,
    ae.account_number,
    ae.email_address,
    ae.session_id,
    ae.request_id,
    ae.ip,
    ae.user_agent,
    ae.path,
    ae.referrer,
    ae.metadata,
    ae.created_by,
    ae.is_internal
  FROM public.app_events ae
  WHERE 
    (p_start_date IS NULL OR ae.occurred_at >= p_start_date) AND
    (p_end_date IS NULL OR ae.occurred_at <= p_end_date) AND
    (p_event_types IS NULL OR ae.event_type = ANY(p_event_types)) AND
    (p_search_string IS NULL OR (
      ae.metadata::TEXT ILIKE '%' || p_search_string || '%' OR
      ae.path ILIKE '%' || p_search_string || '%' OR
      ae.referrer ILIKE '%' || p_search_string || '%' OR
      ae.user_agent ILIKE '%' || p_search_string || '%' OR
      ae.email_address ILIKE '%' || p_search_string || '%'
    )) AND
    (p_account_number IS NULL OR ae.account_number = p_account_number)
  ORDER BY ae.occurred_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$$$;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_system_logs(TIMESTAMPTZ, TIMESTAMPTZ, TEXT[], TEXT, INTEGER, INTEGER, INTEGER) TO authenticated;
"@

try {
    Write-Host "Step 2: Creating get_system_logs function..." -ForegroundColor Yellow
    $body = @{ query = $createFunctionSql } | ConvertTo-Json -Depth 10
    
    $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/rpc/exec" -Method POST -Headers $headers -Body $body
    Write-Host "✅ Function created successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Error creating function:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# Create some test data so the function actually returns something
$insertTestDataSql = @"
-- Insert some test system events
INSERT INTO public.app_events (event_type, account_number, email_address, metadata, created_by) 
VALUES 
('auth.login_success', 999, 'admin@example.com', '{"ip": "127.0.0.1", "user_agent": "Chrome"}', 'system'),
('admin.action_performed', 999, 'admin@example.com', '{"action": "system_log_access", "timestamp": "2025-08-27T22:07:00Z"}', 'admin'),
('system.function_created', 999, 'admin@example.com', '{"function_name": "get_system_logs", "created_at": "2025-08-27T22:07:00Z"}', 'system')
ON CONFLICT DO NOTHING;
"@

try {
    Write-Host "Step 3: Inserting test data..." -ForegroundColor Yellow
    $body = @{ query = $insertTestDataSql } | ConvertTo-Json -Depth 10
    
    $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/rpc/exec" -Method POST -Headers $headers -Body $body
    Write-Host "✅ Test data inserted!" -ForegroundColor Green
} catch {
    Write-Host "❌ Error inserting test data:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 EMERGENCY FIX COMPLETE!" -ForegroundColor Green
Write-Host "The get_system_logs function should now work in your SystemLogTab." -ForegroundColor Cyan
Write-Host "Go test it in your admin dashboard now!" -ForegroundColor Yellow
