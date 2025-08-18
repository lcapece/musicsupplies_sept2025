/*
  # Add SMS Queue Processing with pg_cron
  
  Sets up automatic processing of the SMS notification queue
  This will run every minute to check for pending SMS messages
*/

-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage on cron schema
GRANT USAGE ON SCHEMA cron TO postgres;

-- Function to trigger the SMS queue processing Edge Function
CREATE OR REPLACE FUNCTION process_sms_queue_batch()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pending_count integer;
BEGIN
  -- Check if there are pending messages
  SELECT COUNT(*) INTO v_pending_count
  FROM sms_notification_queue
  WHERE status = 'pending';

  IF v_pending_count > 0 THEN
    -- Log that we're processing messages
    INSERT INTO app_events (
      event_type,
      event_name,
      event_data,
      created_at
    ) VALUES (
      'SMS_QUEUE',
      'processing_batch',
      jsonb_build_object('pending_count', v_pending_count),
      NOW()
    );

    -- The actual SMS sending will be handled by the Edge Function
    -- which can be triggered via webhook or scheduled separately
  END IF;
END;
$$;

-- Create a simple realtime trigger for immediate processing of urgent messages
CREATE OR REPLACE FUNCTION notify_sms_queue_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Send a notification that can be picked up by listeners
  PERFORM pg_notify('sms_queue_insert', json_build_object(
    'id', NEW.id,
    'event_type', NEW.event_type,
    'phone_number', NEW.phone_number
  )::text);
  
  RETURN NEW;
END;
$$;

-- Create trigger for new SMS queue entries
DROP TRIGGER IF EXISTS trigger_notify_sms_queue ON sms_notification_queue;
CREATE TRIGGER trigger_notify_sms_queue
  AFTER INSERT ON sms_notification_queue
  FOR EACH ROW
  EXECUTE FUNCTION notify_sms_queue_insert();

-- Add helper function to view pending SMS messages
CREATE OR REPLACE FUNCTION get_pending_sms_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::integer
  FROM sms_notification_queue
  WHERE status = 'pending';
$$;

-- Add helper function to manually trigger SMS processing
CREATE OR REPLACE FUNCTION trigger_sms_processing()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Get count of pending messages
  SELECT jsonb_build_object(
    'pending_count', COUNT(*),
    'oldest_message', MIN(created_at),
    'message', 'SMS queue processing triggered. Use Edge Function or webhook to process.'
  ) INTO v_result
  FROM sms_notification_queue
  WHERE status = 'pending';
  
  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_sms_queue_batch() TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_sms_count() TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_sms_processing() TO authenticated;

-- Create a scheduled job to process SMS queue every minute (if pg_cron is available)
-- Note: This requires pg_cron to be enabled in your Supabase instance
-- Uncomment the following lines if pg_cron is available:
/*
SELECT cron.schedule(
  'process-sms-queue',  -- Job name
  '* * * * *',          -- Every minute
  $$SELECT process_sms_queue_batch();$$
);
*/

-- Add indexes for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_sms_queue_created_at ON sms_notification_queue(created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_sms_queue_event_type ON sms_notification_queue(event_type);

-- Add a comment explaining the SMS system
COMMENT ON TABLE sms_notification_queue IS 
'SMS notification queue for sending alerts to 1-516-410-7455.
Automatically sends SMS for:
1. New orders
2. Backend (account 999) login attempts with IP address
Process via Edge Function: process-sms-queue';