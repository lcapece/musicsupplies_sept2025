-- CHECK IF V6 EXISTS
SELECT proname, pronargs 
FROM pg_proc 
WHERE proname = 'authenticate_user_v6';

-- TEST IT DIRECTLY
SELECT * FROM authenticate_user_v6('999', '2750grove', 'DIRECT_TEST');

-- Also test v5
SELECT * FROM authenticate_user_v5('999', '2750grove', 'DIRECT_TEST');