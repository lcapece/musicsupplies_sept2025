-- CHECK WHAT'S ACTUALLY IN THE SITE_STATUS TABLE
SELECT * FROM site_status;

-- CHECK IF THERE'S A STATUS COLUMN VS IS_ONLINE COLUMN
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'site_status';

-- CHECK FOR ANY OFFLINE RECORDS
SELECT * FROM site_status WHERE status = 'offline';
SELECT * FROM site_status WHERE is_online = false;