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

-- Enable Row Level Security
ALTER TABLE login_activity_log ENABLE ROW LEVEL SECURITY;

-- Grant usage on schema public to anon and authenticated roles if not already granted (usually default)
-- GRANT USAGE ON SCHEMA public TO anon;
-- GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant insert permission to anon and authenticated roles for the table
GRANT INSERT ON TABLE login_activity_log TO anon;
GRANT INSERT ON TABLE login_activity_log TO authenticated;

-- Grant usage on the sequence for the id column if it's not gen_random_uuid() but a sequence (it's gen_random_uuid, so not strictly needed for id)
-- However, ensure roles can execute gen_random_uuid() - typically available.

-- Create a policy to allow inserts for any authenticated user or anonymous user
CREATE POLICY "Allow all inserts for login activity"
  ON login_activity_log
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Optionally, if you want to allow selection for admin roles (example)
-- CREATE POLICY "Allow admin to read login activity"
--   ON login_activity_log
--   FOR SELECT
--   TO authenticated
--   USING (get_my_claim('user_role') = '"admin"'); -- Assuming you have a custom claim 'user_role'

COMMENT ON TABLE login_activity_log IS 'Logs login attempts, both successful and failed.';
COMMENT ON COLUMN login_activity_log.ip_address IS 'IP address of the user attempting login, if available.';
COMMENT ON COLUMN login_activity_log.user_agent IS 'User agent string of the client, if available.';
