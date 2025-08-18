-- PROPER DESIGN: ONE ROW ONLY with a CHECK constraint

-- Drop and recreate properly
DROP TABLE IF EXISTS site_status CASCADE;

CREATE TABLE site_status (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- ONLY ONE ROW ALLOWED!
  is_online BOOLEAN NOT NULL DEFAULT true,
  message TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert the ONLY row
INSERT INTO site_status (id, is_online, message) 
VALUES (1, true, 'Site is online');

-- This will FAIL if someone tries to add another row:
-- INSERT INTO site_status (id, is_online) VALUES (2, false); -- ERROR!

SELECT * FROM site_status;