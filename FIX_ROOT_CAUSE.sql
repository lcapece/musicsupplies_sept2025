-- ROOT CAUSE FIX: Delete ALL site_status records and recreate table properly

-- Drop the table completely
DROP TABLE IF EXISTS site_status CASCADE;

-- Recreate with proper structure
CREATE TABLE site_status (
  id INTEGER PRIMARY KEY DEFAULT 1,
  is_online BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'online',
  status_message TEXT,
  offline_message TEXT,
  offline_reason TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert ONLINE status
INSERT INTO site_status (id, is_online, status, status_message, updated_at)
VALUES (1, true, 'online', 'Site is operational', NOW());

-- Verify
SELECT * FROM site_status;