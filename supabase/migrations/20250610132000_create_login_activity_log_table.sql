-- Create login_activity_log table
CREATE TABLE IF NOT EXISTS login_activity_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  account_number bigint NOT NULL,
  login_timestamp timestamptz DEFAULT now() NOT NULL,
  login_success boolean NOT NULL,
  ip_address text NULL, -- Store as text, can be inet if preferred and available
  user_agent text NULL,
  
  CONSTRAINT fk_account_number
    FOREIGN KEY(account_number) 
    REFERENCES accounts_lcmd(account_number)
    ON DELETE CASCADE -- Or SET NULL, depending on desired behavior
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_login_activity_log_account_number ON login_activity_log(account_number);
CREATE INDEX IF NOT EXISTS idx_login_activity_log_login_timestamp ON login_activity_log(login_timestamp);
CREATE INDEX IF NOT EXISTS idx_login_activity_log_login_success ON login_activity_log(login_success);

-- Enable Row Level Security if desired, though this table might be for admin/internal use
-- For now, keeping it simple. Add RLS policies if needed.
-- Example: ALTER TABLE login_activity_log ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow service_role to insert" ON login_activity_log FOR INSERT TO service_role WITH CHECK (true);
-- CREATE POLICY "Allow authenticated admin to read" ON login_activity_log FOR SELECT TO authenticated USING (get_my_claim('role') = '"admin"'); 
-- For simplicity, assuming service_role key will be used for inserts from backend/edge function, or direct inserts from a trusted client context if appropriate.
-- If inserts happen from AuthContext (client-side), RLS will need to allow that.
-- Let's assume for now that inserts will be done with sufficient privileges (e.g. service_role if done from an edge function, or if RLS allows user inserts into their own logs - though this is a general log).
-- For now, no RLS to keep it simple, will rely on default Supabase access or user can add RLS later.
COMMENT ON TABLE login_activity_log IS 'Logs login attempts, both successful and failed.';
COMMENT ON COLUMN login_activity_log.ip_address IS 'IP address of the user attempting login, if available.';
COMMENT ON COLUMN login_activity_log.user_agent IS 'User agent string of the client, if available.';
