-- Add identifier_used column to login_activity_log table
ALTER TABLE login_activity_log
ADD COLUMN identifier_used text;
