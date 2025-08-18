-- Set MusicSupplies.com back ONLINE
UPDATE site_status 
SET 
  is_online = true,
  offline_message = NULL,
  offline_reason = 'Site restored to normal operation',
  updated_at = NOW()
WHERE id = 1;

-- Verify the change
SELECT * FROM site_status;