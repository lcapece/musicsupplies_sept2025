-- Create lcmd_discount table for discount management
CREATE TABLE IF NOT EXISTS lcmd_discount (
    id SERIAL PRIMARY KEY,
    discount DECIMAL(5,4) NOT NULL DEFAULT 0, -- Discount rate (e.g., 0.05 for 5%)
    message TEXT,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_lcmd_discount_active ON lcmd_discount(is_active);
CREATE INDEX IF NOT EXISTS idx_lcmd_discount_dates ON lcmd_discount(start_date, end_date);

-- Insert admin account (999) if it doesn't exist
INSERT INTO accounts_lcmd (
    account_number, 
    acct_name, 
    address, 
    city, 
    state, 
    zip, 
    phone,
    requires_password_change
) VALUES (
    999, 
    'System Administrator', 
    '123 Admin Street', 
    'Admin City', 
    'AC', 
    '99999',
    '555-ADMIN',
    false
) ON CONFLICT (account_number) DO NOTHING;

-- Set admin password in logon_lcmd table
INSERT INTO logon_lcmd (
    account_number,
    password,
    requires_password_change,
    created_at
) VALUES (
    999,
    'admin123',
    false,
    NOW()
) ON CONFLICT (account_number) DO UPDATE SET
    password = EXCLUDED.password,
    requires_password_change = EXCLUDED.requires_password_change,
    updated_at = NOW();

-- Create function for login history with sales (for HistoryTab)
CREATE OR REPLACE FUNCTION get_login_history_with_sales(
    filter_date DATE DEFAULT NULL,
    filter_account TEXT DEFAULT NULL
)
RETURNS TABLE (
    account_number INTEGER,
    acct_name TEXT,
    login_date TEXT,
    login_count INTEGER,
    total_items INTEGER,
    total_sales DECIMAL,
    last_login_time TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.account_number,
        a.acct_name,
        COALESCE(filter_date::TEXT, CURRENT_DATE::TEXT) as login_date,
        CASE WHEN SUM(COALESCE(o.qty, 0)) > 0 THEN 1 ELSE 0 END as login_count,
        SUM(COALESCE(o.qty, 0))::INTEGER as total_items,
        SUM(COALESCE(o.extended, 0)) as total_sales,
        CASE WHEN SUM(COALESCE(o.qty, 0)) > 0 THEN '12:00:00' ELSE 'No activity' END as last_login_time
    FROM accounts_lcmd a
    LEFT JOIN production_ordhist o ON a.account_number = o.account_number
        AND (filter_date IS NULL OR DATE(o.inv_date) = filter_date)
    WHERE (filter_account IS NULL OR 
           a.account_number::TEXT ILIKE '%' || filter_account || '%' OR
           a.acct_name ILIKE '%' || filter_account || '%')
    GROUP BY a.account_number, a.acct_name
    HAVING (filter_date IS NULL OR SUM(COALESCE(o.qty, 0)) > 0)
    ORDER BY a.account_number;
END;
$$ LANGUAGE plpgsql;

-- Add some sample discount data
INSERT INTO lcmd_discount (discount, message, start_date, end_date, is_active) VALUES
(0.05, 'Spring Sale - 5% off all orders', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', true),
(0.10, 'Summer Clearance - 10% off select items', CURRENT_DATE + INTERVAL '31 days', CURRENT_DATE + INTERVAL '60 days', false),
(0.15, 'Holiday Special - 15% off for loyal customers', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '5 days', false)
ON CONFLICT DO NOTHING;

-- Create updated_at trigger for lcmd_discount
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_lcmd_discount ON lcmd_discount;
CREATE TRIGGER set_timestamp_lcmd_discount
    BEFORE UPDATE ON lcmd_discount
    FOR EACH ROW
    EXECUTE PROCEDURE trigger_set_timestamp();
