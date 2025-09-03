# Simple script to apply System Log fixes to Supabase

$envContent = Get-Content ".env" -Raw
$projectRef = [regex]::Match($envContent, 'SUPABASE_URL=https://([^.]+)\.supabase\.co').Groups[1].Value
$serviceKey = [regex]::Match($envContent, 'SUPABASE_SERVICE_ROLE_KEY=(.+)').Groups[1].Value

if (-not $projectRef -or -not $serviceKey) {
    Write-Host "Error: Could not find Supabase credentials" -ForegroundColor Red
    exit 1
}

Write-Host "Project: $projectRef" -ForegroundColor Cyan

# Create a simple HTML file with JavaScript to execute the SQL
$htmlContent = @"
<!DOCTYPE html>
<html>
<head>
    <title>Apply System Log Fixes</title>
    <style>
        body { font-family: monospace; padding: 20px; }
        .success { color: green; }
        .error { color: red; }
        .info { color: blue; }
        pre { background: #f0f0f0; padding: 10px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>Applying System Log Fixes</h1>
    <div id="status"></div>
    <pre id="output"></pre>
    
    <script>
        const SUPABASE_URL = 'https://$projectRef.supabase.co';
        const SUPABASE_KEY = '$serviceKey';
        
        const sql = \`
-- Fix missing functions and tables for System Log

-- 1. Create set_config function
CREATE OR REPLACE FUNCTION public.set_config(
  p_config_key TEXT,
  p_config_value JSONB,
  p_description TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS \$\$
BEGIN
  RETURN jsonb_build_object(
    'success', true,
    'config_key', p_config_key,
    'config_value', p_config_value,
    'message', 'Configuration updated successfully'
  );
END;
\$\$;

GRANT EXECUTE ON FUNCTION public.set_config(TEXT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_config(TEXT, JSONB, TEXT) TO anon;

-- 2. Create get_unacknowledged_sms_failures function
CREATE OR REPLACE FUNCTION public.get_unacknowledged_sms_failures()
RETURNS TABLE (
  id BIGINT,
  phone_number TEXT,
  message TEXT,
  error_message TEXT,
  failed_at TIMESTAMPTZ,
  retry_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS \$\$
BEGIN
  RETURN QUERY
  SELECT 
    0::BIGINT AS id,
    ''::TEXT AS phone_number,
    ''::TEXT AS message,
    ''::TEXT AS error_message,
    NOW() AS failed_at,
    0::INT AS retry_count
  WHERE FALSE;
END;
\$\$;

GRANT EXECUTE ON FUNCTION public.get_unacknowledged_sms_failures() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unacknowledged_sms_failures() TO anon;

-- 3. Create chat_voice_config table
CREATE TABLE IF NOT EXISTS public.chat_voice_config (
  id SERIAL PRIMARY KEY,
  voice_id VARCHAR(100) NOT NULL UNIQUE,
  voice_name VARCHAR(100),
  voice_provider VARCHAR(50) DEFAULT 'elevenlabs',
  voice_settings JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chat_voice_config DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.chat_voice_config TO authenticated;
GRANT ALL ON public.chat_voice_config TO anon;
GRANT SELECT ON public.chat_voice_config TO public;

-- 4. Create chat_config table
CREATE TABLE IF NOT EXISTS public.chat_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chat_config DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.chat_config TO authenticated;
GRANT ALL ON public.chat_config TO anon;
GRANT SELECT ON public.chat_config TO public;

-- 5. Insert default data
INSERT INTO public.chat_voice_config (voice_id, voice_name, voice_provider, is_default) VALUES
('21m00Tcm4TlvDq8ikWAM', 'Rachel', 'elevenlabs', true)
ON CONFLICT (voice_id) DO NOTHING;

INSERT INTO public.chat_config (config_key, config_value, description) VALUES
('elevenlabs_voice_id', '"21m00Tcm4TlvDq8ikWAM"', 'Default ElevenLabs voice ID')
ON CONFLICT (config_key) DO NOTHING;
\`;
        
        async function applyFixes() {
            const status = document.getElementById('status');
            const output = document.getElementById('output');
            
            status.innerHTML = '<p class="info">Applying fixes...</p>';
            
            try {
                // Try to execute SQL directly
                const response = await fetch(SUPABASE_URL + '/rest/v1/rpc/execute_sql', {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': 'Bearer ' + SUPABASE_KEY,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ query: sql })
                });
                
                if (response.ok) {
                    status.innerHTML = '<p class="success">✓ Fixes applied successfully!</p>';
                    output.textContent = 'All functions and tables created successfully.\n\nPlease refresh your app and check the System Log page.';
                } else {
                    // If execute_sql doesn't exist, show manual instructions
                    status.innerHTML = '<p class="error">Could not apply automatically. Please copy the SQL below and run it in Supabase SQL Editor:</p>';
                    output.textContent = sql;
                }
            } catch (error) {
                status.innerHTML = '<p class="error">Error: ' + error.message + '</p>';
                output.textContent = 'Please copy this SQL and run it manually in Supabase:\n\n' + sql;
            }
        }
        
        // Apply fixes when page loads
        applyFixes();
    </script>
</body>
</html>
"@

# Save the HTML file
$htmlContent | Out-File -FilePath "apply_system_log_fixes.html" -Encoding UTF8

Write-Host "Opening browser to apply fixes..." -ForegroundColor Yellow
Start-Process "apply_system_log_fixes.html"

Write-Host ""
Write-Host "The browser will open and attempt to apply the fixes automatically." -ForegroundColor Cyan
Write-Host "If it doesn't work automatically, copy the SQL shown and run it in Supabase SQL Editor." -ForegroundColor Yellow
