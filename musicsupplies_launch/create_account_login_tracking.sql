-- Create table to track account login activity
CREATE TABLE IF NOT EXISTS account_login_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number INTEGER NOT NULL,
  login_timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  login_successful BOOLEAN DEFAULT TRUE,
  session_duration_minutes INTEGER,
  logout_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_account_login_tracking_account_number ON account_login_tracking(account_number);
CREATE INDEX IF NOT EXISTS idx_account_login_tracking_login_timestamp ON account_login_tracking(login_timestamp);
CREATE INDEX IF NOT EXISTS idx_account_login_tracking_successful ON account_login_tracking(login_successful);

-- Create function to get login stats for an account
CREATE OR REPLACE FUNCTION get_account_login_stats(p_account_number INTEGER)
RETURNS TABLE (
  total_logins BIGINT,
  successful_logins BIGINT,
  failed_logins BIGINT,
  last_login TIMESTAMPTZ,
  last_successful_login TIMESTAMPTZ,
  average_session_minutes NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_logins,
    COUNT(*) FILTER (WHERE login_successful = true) as successful_logins,
    COUNT(*) FILTER (WHERE login_successful = false) as failed_logins,
    MAX(login_timestamp) as last_login,
    MAX(login_timestamp) FILTER (WHERE login_successful = true) as last_successful_login,
    AVG(session_duration_minutes) FILTER (WHERE session_duration_minutes IS NOT NULL) as average_session_minutes
  FROM account_login_tracking 
  WHERE account_number = p_account_number;
END;
$$;

-- Create function to record login attempt
CREATE OR REPLACE FUNCTION record_login_attempt(
  p_account_number INTEGER,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_successful BOOLEAN DEFAULT TRUE
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  login_id UUID;
BEGIN
  INSERT INTO account_login_tracking (
    account_number, 
    ip_address, 
    user_agent, 
    login_successful
  ) VALUES (
    p_account_number,
    p_ip_address::INET,
    p_user_agent,
    p_successful
  )
  RETURNING id INTO login_id;
  
  RETURN login_id;
END;
$$;

-- Create function to update session duration on logout
CREATE OR REPLACE FUNCTION update_session_duration(
  p_account_number INTEGER,
  p_logout_timestamp TIMESTAMPTZ DEFAULT NOW()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  latest_login_id UUID;
BEGIN
  -- Find the most recent successful login for this account that doesn't have a logout timestamp
  SELECT id INTO latest_login_id
  FROM account_login_tracking
  WHERE account_number = p_account_number 
    AND login_successful = true 
    AND logout_timestamp IS NULL
  ORDER BY login_timestamp DESC
  LIMIT 1;
  
  -- Update the session duration and logout timestamp
  IF latest_login_id IS NOT NULL THEN
    UPDATE account_login_tracking
    SET 
      logout_timestamp = p_logout_timestamp,
      session_duration_minutes = EXTRACT(EPOCH FROM (p_logout_timestamp - login_timestamp)) / 60
    WHERE id = latest_login_id;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Add password status column to accounts table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accounts' AND column_name='has_custom_password') THEN
    ALTER TABLE accounts ADD COLUMN has_custom_password BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Create function to check if account has custom password
CREATE OR REPLACE FUNCTION check_account_password_status(p_account_number INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  has_custom BOOLEAN := FALSE;
BEGIN
  -- Check if the account has a custom password (not default)
  -- This assumes you have a way to identify default vs custom passwords
  -- You may need to adjust this logic based on your password storage method
  
  SELECT 
    CASE 
      WHEN password_hash IS NOT NULL AND password_hash != '' 
      AND password_hash != crypt(account_number::text, password_hash) -- not default password
      THEN TRUE 
      ELSE FALSE 
    END INTO has_custom
  FROM accounts 
  WHERE account_number = p_account_number;
  
  -- Update the has_custom_password flag
  UPDATE accounts 
  SET has_custom_password = has_custom 
  WHERE account_number = p_account_number;
  
  RETURN COALESCE(has_custom, FALSE);
END;
$$;

-- Create view for admin account management with login stats
CREATE OR REPLACE VIEW admin_account_overview AS
SELECT 
  a.account_number,
  a.acct_name,
  a.email_address,
  a.mobile_phone,
  a.requires_password_change,
  a.is_special_admin,
  a.has_custom_password,
  COALESCE(stats.total_logins, 0) as total_logins,
  COALESCE(stats.successful_logins, 0) as successful_logins,
  COALESCE(stats.failed_logins, 0) as failed_logins,
  stats.last_login,
  stats.last_successful_login,
  ROUND(COALESCE(stats.average_session_minutes, 0), 1) as avg_session_minutes
FROM accounts a
LEFT JOIN LATERAL (
  SELECT * FROM get_account_login_stats(a.account_number)
) stats ON true
ORDER BY a.account_number;

COMMENT ON TABLE account_login_tracking IS 'Tracks all login attempts and session information for accounts';
COMMENT ON FUNCTION get_account_login_stats IS 'Returns comprehensive login statistics for a specific account';
COMMENT ON FUNCTION record_login_attempt IS 'Records a login attempt (successful or failed) and returns the tracking ID';
COMMENT ON FUNCTION update_session_duration IS 'Updates session duration when user logs out';
COMMENT ON FUNCTION check_account_password_status IS 'Checks and updates whether account has custom password';
COMMENT ON VIEW admin_account_overview IS 'Comprehensive view of accounts with login statistics for admin management';
