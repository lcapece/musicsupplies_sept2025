-- Fix SMS Failure Notification System
-- Create the missing functions that the frontend expects

-- First, ensure we have the sms_notification_failures table
CREATE TABLE IF NOT EXISTS sms_notification_failures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL,
  customer_phone TEXT,
  customer_name TEXT,
  customer_account_number TEXT,
  error_message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by TEXT
);

-- Create index for unacknowledged failures
CREATE INDEX IF NOT EXISTS idx_sms_failures_unacknowledged 
ON sms_notification_failures(acknowledged_at) 
WHERE acknowledged_at IS NULL;

-- Function to get unacknowledged SMS failures
CREATE OR REPLACE FUNCTION get_unacknowledged_sms_failures()
RETURNS TABLE (
  id UUID,
  order_number TEXT,
  customer_phone TEXT,
  customer_name TEXT,
  customer_account_number TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    snf.id,
    snf.order_number,
    snf.customer_phone,
    snf.customer_name,
    snf.customer_account_number,
    snf.error_message,
    snf.created_at
  FROM sms_notification_failures snf
  WHERE snf.acknowledged_at IS NULL
  ORDER BY snf.created_at DESC;
END;
$$;

-- Function to acknowledge SMS failures
CREATE OR REPLACE FUNCTION acknowledge_sms_failures(failure_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE sms_notification_failures
  SET 
    acknowledged_at = NOW(),
    acknowledged_by = current_setting('app.account_number', true)
  WHERE id = ANY(failure_ids)
    AND acknowledged_at IS NULL;
END;
$$;

-- Function to log SMS failure (called by edge functions)
CREATE OR REPLACE FUNCTION log_sms_failure(
  p_order_number TEXT,
  p_customer_phone TEXT,
  p_customer_name TEXT,
  p_customer_account_number TEXT,
  p_error_message TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_failure_id UUID;
BEGIN
  INSERT INTO sms_notification_failures (
    order_number,
    customer_phone,
    customer_name,
    customer_account_number,
    error_message
  ) VALUES (
    p_order_number,
    p_customer_phone,
    p_customer_name,
    p_customer_account_number,
    p_error_message
  ) RETURNING id INTO v_failure_id;
  
  RETURN v_failure_id;
END;
$$;

-- RLS Policies
ALTER TABLE sms_notification_failures ENABLE ROW LEVEL SECURITY;

-- Admin (999) can view all SMS failures
CREATE POLICY "Admin view all SMS failures" ON sms_notification_failures
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM accounts_lcmd 
    WHERE account_no = current_setting('app.account_number', true)
    AND account_no = '999'
  )
);

-- Admin can acknowledge failures
CREATE POLICY "Admin acknowledge SMS failures" ON sms_notification_failures
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM accounts_lcmd 
    WHERE account_no = current_setting('app.account_number', true)
    AND account_no = '999'
  )
);

-- Service role can insert failures
CREATE POLICY "Service insert SMS failures" ON sms_notification_failures
FOR INSERT TO service_role
WITH CHECK (true);

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_unacknowledged_sms_failures TO authenticated;
GRANT EXECUTE ON FUNCTION acknowledge_sms_failures TO authenticated;
GRANT EXECUTE ON FUNCTION log_sms_failure TO service_role;
GRANT EXECUTE ON FUNCTION log_sms_failure TO authenticated;

-- Add some test data to verify the system works
INSERT INTO sms_notification_failures (
  order_number,
  customer_phone,
  customer_name,
  customer_account_number,
  error_message
) VALUES 
  ('WB750123', '555-1234', 'Test Customer', '101', 'ClickSend API Error: Invalid phone number format'),
  ('WB750124', '555-5678', 'Another Test', '102', 'ClickSend API Error: Insufficient credits')
ON CONFLICT DO NOTHING;
