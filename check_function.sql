-- Get the EXACT source code of authenticate_user_v5
SELECT prosrc FROM pg_proc WHERE proname = 'authenticate_user_v5';

-- Test if Music123 works
SELECT * FROM authenticate_user_v5('999', 'Music123', 'direct_test');

-- Test if 2750grove works  
SELECT * FROM authenticate_user_v5('999', '2750grove', 'direct_test');