-- First, check what's in the table
SELECT * FROM site_status;

-- Delete all rows and insert a fresh ONLINE status
DELETE FROM site_status;

INSERT INTO site_status (
  id,
  is_online,
  offline_message,
  offline_reason,
  updated_at
) VALUES (
  1,
  true,
  NULL,
  'Site is online',
  NOW()
);

-- Verify it worked
SELECT * FROM site_status;