-- TEST IF 999/2750grove WORKS IN DATABASE
SELECT * FROM authenticate_user_v6('999', '2750grove', 'TEST');

-- Check what functions exist
SELECT proname FROM pg_proc WHERE proname LIKE 'authenticate%';

-- Test if Music123 is blocked
SELECT * FROM authenticate_user_v6('999', 'Music123', 'TEST');