-- EMERGENCY: FORCE 999 TO BE ADMIN
UPDATE accounts_lcmd 
SET acct_name = 'Backend Admin',
    email_address = 'admin@musicsupplies.com'
WHERE account_number = 999;

-- ENSURE 999 HAS ADMIN PASSWORD
DELETE FROM user_passwords WHERE account_number = '999';

-- VERIFY ADMIN PASSWORD IS SET
UPDATE admin_settings 
SET setting_value = '2750grove'
WHERE setting_key = 'admin_password';

-- TEST LOGIN
SELECT * FROM authenticate_user_v5('999', '2750grove', NULL);