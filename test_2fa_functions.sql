-- Test the 2FA functions
SELECT store_2fa_code(999, '123456', '127.0.0.1') as store_result;
SELECT validate_2fa_code(999, '123456') as validate_result;