-- This migration drops the authenticate_user_lcmd function
DROP FUNCTION IF EXISTS authenticate_user_lcmd(p_account_number integer, p_password text);
