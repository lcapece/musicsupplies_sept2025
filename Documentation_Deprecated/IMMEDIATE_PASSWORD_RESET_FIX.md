# IMMEDIATE PASSWORD RESET FIX - ACTION REQUIRED

## Critical Issues:
1. Browser is loading OLD cached JavaScript code
2. `password_reset_tokens` table doesn't exist in database

## STEP 1: Clear Browser Cache (DO THIS FIRST!)

### Option A - Hard Refresh:
- Windows: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

### Option B - Clear All Site Data:
1. Open DevTools (F12)
2. Go to Application tab
3. Click "Storage" in left sidebar
4. Click "Clear site data" button

### Option C - Use Incognito/Private Window:
- Chrome: `Ctrl + Shift + N`
- Firefox: `Ctrl + Shift + P`
- Safari: `Cmd + Shift + N`

## STEP 2: Create Missing Database Table

### Go to Supabase Dashboard:
1. Open your Supabase project
2. Navigate to SQL Editor
3. Copy and paste this ENTIRE SQL script:

```sql
-- Create password_reset_tokens table for custom password reset functionality
-- This table stores secure tokens for password reset requests

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token UUID NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON password_reset_tokens(email);

-- Create index on token for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);

-- Create index on expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage all tokens (for Edge Functions)
CREATE POLICY "Service role can manage password reset tokens" ON password_reset_tokens
    FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to read their own tokens (for validation)
CREATE POLICY "Users can read their own password reset tokens" ON password_reset_tokens
    FOR SELECT USING (email = auth.email());

-- Optional: Create a function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_password_reset_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM password_reset_tokens 
    WHERE expires_at < NOW() OR used = TRUE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_password_reset_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER password_reset_tokens_updated_at
    BEFORE UPDATE ON password_reset_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_password_reset_tokens_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON password_reset_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON password_reset_tokens TO service_role;
GRANT USAGE ON SEQUENCE password_reset_tokens_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE password_reset_tokens_id_seq TO service_role;
```

4. Click "Run" button

## STEP 3: Verify Everything is Working

### Run these verification queries in Supabase SQL Editor:

```sql
-- 1. Verify password_reset_tokens table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'password_reset_tokens'
) as password_reset_tokens_exists;

-- 2. Verify account 105 has an email
SELECT account_number, acct_name, email_address 
FROM accounts_lcmd 
WHERE account_number = 105;

-- 3. Check table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'password_reset_tokens'
ORDER BY ordinal_position;
```

## STEP 4: Test Password Reset Again

1. Make sure you've cleared browser cache (Step 1)
2. Make sure you've created the table (Step 2)
3. Go to login page
4. Click "Forgot Password?"
5. Enter: `lcapece@optonline.net`
6. Check browser console - you should NOT see "users" table errors anymore

## If Still Having Issues:

### Check if it's a deployment issue:
- Are you testing locally or on a deployed site?
- If deployed, the site needs to be redeployed with the new code

### Force reload in development:
```bash
# Stop dev server (Ctrl+C)
# Delete node_modules/.vite folder
rm -rf node_modules/.vite
# Restart dev server
npm run dev
```

### Last Resort - Clear Everything:
1. Close all browser tabs
2. Clear browser cache completely
3. Restart browser
4. Try in a new incognito window

## Expected Result:
- No more "relation 'public.users' does not exist" errors
- Password reset email should be sent successfully
- Console should show "Password reset email sent successfully via Mailgun"
