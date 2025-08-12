-- Create shopping_activity table to track user shopping behavior
-- This table was referenced in code but was missing from the database

CREATE TABLE IF NOT EXISTS shopping_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id INTEGER REFERENCES accounts_lcmd(account_number) ON DELETE CASCADE,
    session_id VARCHAR(255),
    activity_type VARCHAR(100) NOT NULL,
    activity_data JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    user_agent TEXT,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50), -- Allow NULL for users without phone numbers
    customer_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_shopping_activity_account ON shopping_activity(account_id);
CREATE INDEX idx_shopping_activity_session ON shopping_activity(session_id);
CREATE INDEX idx_shopping_activity_type ON shopping_activity(activity_type);
CREATE INDEX idx_shopping_activity_created ON shopping_activity(created_at DESC);

-- Enable RLS
ALTER TABLE shopping_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own activity
CREATE POLICY "Users can view own shopping activity" ON shopping_activity
    FOR SELECT
    TO authenticated
    USING (
        account_id = COALESCE(
            NULLIF(current_setting('request.jwt.claims', true)::json->>'account_number', '')::INTEGER,
            (SELECT account_number FROM accounts_lcmd WHERE user_id = auth.uid())
        )
    );

-- Allow inserts from authenticated users
CREATE POLICY "Users can insert shopping activity" ON shopping_activity
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Admin access (accounts 99 and 999)
CREATE POLICY "Admin can view all shopping activity" ON shopping_activity
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM accounts_lcmd 
            WHERE account_number IN (99, 999)
            AND account_number = COALESCE(
                NULLIF(current_setting('request.jwt.claims', true)::json->>'account_number', '')::INTEGER,
                (SELECT account_number FROM accounts_lcmd WHERE user_id = auth.uid())
            )
        )
    );

-- Grant permissions
GRANT SELECT, INSERT ON shopping_activity TO authenticated;

-- Add comment
COMMENT ON TABLE shopping_activity IS 'Tracks user shopping activities including searches, views, cart actions, etc.';
COMMENT ON COLUMN shopping_activity.customer_phone IS 'Customer phone number (optional - may be null for users without phone numbers)';
