-- ====================================================
-- EMERGENCY SQL TO SET SITE ONLINE
-- ====================================================

-- 1. CHECK AND UPDATE site_settings TABLE
UPDATE site_settings 
SET setting_value = 'online', 
    updated_at = NOW()
WHERE setting_key = 'site_status' 
   OR setting_key = 'maintenance_mode' 
   OR setting_key = 'site_online';

-- 2. CHECK AND UPDATE config TABLE
UPDATE config 
SET value = 'online',
    updated_at = NOW()
WHERE key = 'site_status' 
   OR key = 'maintenance_mode'
   OR key = 'site_online';

-- 3. CHECK AND UPDATE system_settings TABLE
UPDATE system_settings 
SET value = 'true',
    updated_at = NOW()
WHERE name = 'site_online' 
   OR name = 'is_online';

UPDATE system_settings 
SET value = 'false',
    updated_at = NOW()  
WHERE name = 'maintenance_mode'
   OR name = 'is_maintenance';

-- 4. CHECK admin_settings TABLE
UPDATE admin_settings
SET setting_value = 'online',
    last_updated = NOW()
WHERE setting_key = 'site_status';

-- 5. IF NONE OF ABOVE EXIST, CREATE IT
INSERT INTO admin_settings (setting_key, setting_value, description)
VALUES ('site_status', 'online', 'Site operational status')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = 'online';

-- 6. FORCE CLEAR ANY MAINTENANCE FLAGS
DELETE FROM maintenance_mode WHERE active = true;

-- 7. LOG THE CHANGE
INSERT INTO app_events (
    event_type,
    event_name, 
    event_data,
    severity,
    created_at
) VALUES (
    'EMERGENCY',
    'Site Set Online',
    jsonb_build_object(
        'action', 'EMERGENCY SITE ACTIVATION',
        'timestamp', NOW(),
        'reason', 'Critical business loss - manual override'
    ),
    'CRITICAL',
    NOW()
);

-- 8. CHECK WHAT TABLES EXIST
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (
    table_name LIKE '%setting%' 
    OR table_name LIKE '%config%' 
    OR table_name LIKE '%maintenance%'
    OR table_name LIKE '%status%'
);

-- ====================================================
-- VERIFICATION
-- ====================================================
SELECT 'SITE STATUS SET TO ONLINE - CHECK ALL SETTINGS TABLES' as status;