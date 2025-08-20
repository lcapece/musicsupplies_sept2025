-- Emergency fix for account 999 login
-- Set admin password and ensure login works

-- Ensure admin_config table exists
CREATE TABLE IF NOT EXISTS admin_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(255) UNIQUE NOT NULL,
  config_value TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Set a working password for admin account 999
INSERT INTO admin_config (config_key, config_value, updated_at)
VALUES ('admin_999_password', 'admin999', NOW())
ON CONFLICT (config_key) 
DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  updated_at = NOW();

-- Ensure account 999 exists in accounts_lcmd
INSERT INTO accounts_lcmd (
  account_number, 
  acct_name, 
  address, 
  city, 
  state, 
  zip,
  email_address,
  phone,
  mobile_phone,
  user_id
) VALUES (
  999, 
  'Admin Account', 
  '123 Admin St', 
  'Admin City', 
  'NY', 
  '10001',
  'admin@musicsupplies.com',
  '8003215584',
  '8003215584',
  gen_random_uuid()
)
ON CONFLICT (account_number) DO UPDATE SET
  acct_name = EXCLUDED.acct_name,
  email_address = EXCLUDED.email_address;

-- Grant necessary permissions
GRANT SELECT ON admin_config TO authenticated, anon;
GRANT SELECT ON accounts_lcmd TO authenticated, anon;

-- Test the login function
SELECT 'Testing 999 login...' as message;
SELECT * FROM authenticate_user('999', 'admin999', '127.0.0.1', null);