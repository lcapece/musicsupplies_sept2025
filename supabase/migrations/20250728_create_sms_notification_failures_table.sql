-- Create table to track SMS notification failures
CREATE TABLE IF NOT EXISTS sms_notification_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  customer_account_number TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by TEXT
);

-- Create index for faster queries
CREATE INDEX idx_sms_failures_acknowledged ON sms_notification_failures(acknowledged_at);
CREATE INDEX idx_sms_failures_order ON sms_notification_failures(order_number);

-- Enable RLS
ALTER TABLE sms_notification_failures ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Only admin (account 999) can view and update SMS failures
CREATE POLICY "Admin can view all SMS failures" ON sms_notification_failures
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM accounts 
      WHERE accounts.account_number = '999' 
      AND accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can update SMS failures" ON sms_notification_failures
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM accounts 
      WHERE accounts.account_number = '999' 
      AND accounts.user_id = auth.uid()
    )
  );

-- Service role can insert (for backend operations)
CREATE POLICY "Service role can insert SMS failures" ON sms_notification_failures
  FOR INSERT
  TO service_role
  USING (true);

-- Create function to get unacknowledged SMS failures
CREATE OR REPLACE FUNCTION get_unacknowledged_sms_failures()
RETURNS TABLE(
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
  -- Only allow admin to view
  IF NOT EXISTS (
    SELECT 1 FROM accounts 
    WHERE accounts.account_number = '999' 
    AND accounts.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
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

-- Create function to acknowledge SMS failures
CREATE OR REPLACE FUNCTION acknowledge_sms_failures(failure_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow admin to acknowledge
  IF NOT EXISTS (
    SELECT 1 FROM accounts 
    WHERE accounts.account_number = '999' 
    AND accounts.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  UPDATE sms_notification_failures
  SET 
    acknowledged_at = CURRENT_TIMESTAMP,
    acknowledged_by = auth.uid()
  WHERE id = ANY(failure_ids)
  AND acknowledged_at IS NULL;
END;
$$;
