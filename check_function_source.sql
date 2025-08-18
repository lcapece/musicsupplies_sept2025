-- Direct query to get function source code
SELECT 
    proname AS function_name,
    prosrc AS source_code
FROM pg_proc 
WHERE proname LIKE 'authenticate_user%'
ORDER BY proname;

-- Also check for any mention of Music123 in function bodies
SELECT 
    proname AS function_name,
    CASE 
        WHEN prosrc ILIKE '%music123%' THEN 'CONTAINS Music123!'
        WHEN prosrc ILIKE '%music%' THEN 'Contains music'
        ELSE 'Clean'
    END as music_check
FROM pg_proc 
WHERE proname LIKE 'authenticate_user%';