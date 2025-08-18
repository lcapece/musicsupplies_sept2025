-- CHECK WHAT COLUMNS ACTUALLY EXIST IN accounts_lcmd
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'accounts_lcmd'
ORDER BY ordinal_position;