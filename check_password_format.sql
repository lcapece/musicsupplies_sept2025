-- Check if passwords are hashed or plain text

-- Look at existing passwords in user_passwords table
SELECT 
    account_number,
    LEFT(password_hash, 20) as password_preview,
    LENGTH(password_hash) as password_length,
    CASE 
        WHEN password_hash LIKE '$2%' THEN 'BCrypt Hash'
        WHEN password_hash LIKE '$argon%' THEN 'Argon2 Hash'
        WHEN LENGTH(password_hash) = 60 THEN 'Possible BCrypt'
        WHEN LENGTH(password_hash) < 20 THEN 'Plain Text'
        ELSE 'Unknown Format'
    END as password_format
FROM user_passwords
WHERE account_number IN (101, 999, 99, 1)
ORDER BY account_number;

-- Check if there's a working example
SELECT 
    account_number,
    LEFT(password_hash, 20) as password_preview,
    LENGTH(password_hash) as password_length
FROM user_passwords
WHERE password_hash IS NOT NULL
LIMIT 5;