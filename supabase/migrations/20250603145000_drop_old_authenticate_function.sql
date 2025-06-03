/*
  # Drop old authenticate_user_lcmd function
  
  Remove the old version of authenticate_user_lcmd that uses integer parameter
  to resolve function overloading conflict
*/

-- Drop the old function that uses integer parameter
DROP FUNCTION IF EXISTS authenticate_user_lcmd(p_account_number integer, p_password text);
