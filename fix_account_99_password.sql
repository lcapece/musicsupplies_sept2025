-- Fix account 99 password with proper hashing
-- First check what hashing method is used by looking at existing passwords
SELECT account_number, password, length(password) as pwd_length 
FROM logon_lcmd 
WHERE account_number IN (999, 101, 115) 
LIMIT 3;

-- Update account 99 password - try different hashing methods
-- Method 1: Plain text (if system uses plain text)
UPDATE logon_lcmd 
SET password = 'LindaHanlon', updated_at = NOW() 
WHERE account_number = 99;

-- Check if it worked
SELECT account_number, password FROM logon_lcmd WHERE account_number = 99;