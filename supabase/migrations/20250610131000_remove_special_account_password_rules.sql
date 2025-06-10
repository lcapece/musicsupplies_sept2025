-- This migration removes special case handling for accounts 101 and 999
-- All accounts will now use the password stored in the accounts_lcmd table

-- Modify the authenticate_user_lcmd function to remove special case handling
CREATE OR REPLACE FUNCTION authenticate_user_lcmd(p_account_number integer, p_password text)
RETURNS TABLE (
  authenticated boolean,
  account_number integer,
  acct_name text,
  address text,
  city text,
  state text,
  zip text,
  requires_password_change boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_password_hash text;
  v_stored_password text;
  v_account_exists boolean;
BEGIN
  -- Check if the account exists
  SELECT EXISTS(SELECT 1 FROM accounts_lcmd WHERE account_number = p_account_number) 
  INTO v_account_exists;
  
  IF NOT v_account_exists THEN
    RETURN QUERY SELECT false, NULL, NULL, NULL, NULL, NULL, NULL, NULL;
    RETURN;
  END IF;
  
  -- Get the stored password
  SELECT password INTO v_stored_password
  FROM accounts_lcmd
  WHERE account_number = p_account_number;
  
  -- Check if the provided password matches the stored password
  IF v_stored_password IS NOT NULL AND v_stored_password = p_password THEN
    -- Return authentication success with account details
    RETURN QUERY 
    SELECT 
      true AS authenticated,
      a.account_number,
      a.acct_name,
      a.address,
      a.city,
      a.state,
      a.zip,
      a.requires_password_change -- Return the existing flag
    FROM 
      accounts_lcmd a
    WHERE 
      a.account_number = p_account_number;
    RETURN;
  ELSE
    -- Invalid password or no password set
    RETURN QUERY SELECT false, NULL, NULL, NULL, NULL, NULL, NULL, NULL;
    RETURN;
  END IF;
END;
$$;
