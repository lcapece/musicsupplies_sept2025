-- Create tables for tracking shopping activity in customer accounts

-- Table to track product views
CREATE TABLE IF NOT EXISTS product_views (
    id SERIAL PRIMARY KEY,
    account_number INTEGER NOT NULL,
    product_code VARCHAR(50) NOT NULL,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    page_url TEXT,
    session_id VARCHAR(100),
    FOREIGN KEY (account_number) REFERENCES accounts_lcmd(account_number) ON DELETE CASCADE
);

-- Index for faster queries
CREATE INDEX idx_product_views_account ON product_views(account_number);
CREATE INDEX idx_product_views_timestamp ON product_views(viewed_at);
CREATE INDEX idx_product_views_product ON product_views(product_code);

-- Table to track search queries
CREATE TABLE IF NOT EXISTS search_history (
    id SERIAL PRIMARY KEY,
    account_number INTEGER NOT NULL,
    search_query TEXT NOT NULL,
    searched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    results_count INTEGER,
    clicked_result VARCHAR(50),
    session_id VARCHAR(100),
    FOREIGN KEY (account_number) REFERENCES accounts_lcmd(account_number) ON DELETE CASCADE
);

-- Index for faster queries
CREATE INDEX idx_search_history_account ON search_history(account_number);
CREATE INDEX idx_search_history_timestamp ON search_history(searched_at);

-- Table to track cart activity
CREATE TABLE IF NOT EXISTS cart_activity (
    id SERIAL PRIMARY KEY,
    account_number INTEGER NOT NULL,
    product_code VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('add', 'remove', 'update_quantity')),
    quantity INTEGER,
    old_quantity INTEGER,
    activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    session_id VARCHAR(100),
    FOREIGN KEY (account_number) REFERENCES accounts_lcmd(account_number) ON DELETE CASCADE
);

-- Index for faster queries
CREATE INDEX idx_cart_activity_account ON cart_activity(account_number);
CREATE INDEX idx_cart_activity_timestamp ON cart_activity(activity_at);
CREATE INDEX idx_cart_activity_product ON cart_activity(product_code);

-- Grant permissions
GRANT SELECT, INSERT ON product_views TO authenticated;
GRANT SELECT, INSERT ON search_history TO authenticated;
GRANT SELECT, INSERT ON cart_activity TO authenticated;

GRANT USAGE, SELECT ON SEQUENCE product_views_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE search_history_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE cart_activity_id_seq TO authenticated;

-- RLS policies
ALTER TABLE product_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_activity ENABLE ROW LEVEL SECURITY;

-- Users can only see their own activity
CREATE POLICY "Users can view own product views" ON product_views
    FOR SELECT
    TO authenticated
    USING (account_number = current_setting('app.current_account_number')::INTEGER);

CREATE POLICY "Users can insert own product views" ON product_views
    FOR INSERT
    TO authenticated
    WITH CHECK (account_number = current_setting('app.current_account_number')::INTEGER);

CREATE POLICY "Users can view own search history" ON search_history
    FOR SELECT
    TO authenticated
    USING (account_number = current_setting('app.current_account_number')::INTEGER);

CREATE POLICY "Users can insert own search history" ON search_history
    FOR INSERT
    TO authenticated
    WITH CHECK (account_number = current_setting('app.current_account_number')::INTEGER);

CREATE POLICY "Users can view own cart activity" ON cart_activity
    FOR SELECT
    TO authenticated
    USING (account_number = current_setting('app.current_account_number')::INTEGER);

CREATE POLICY "Users can insert own cart activity" ON cart_activity
    FOR INSERT
    TO authenticated
    WITH CHECK (account_number = current_setting('app.current_account_number')::INTEGER);

-- Admin access for account 999
CREATE POLICY "Admin can view all product views" ON product_views
    FOR ALL
    TO authenticated
    USING (current_setting('app.current_account_number')::INTEGER = 999);

CREATE POLICY "Admin can view all search history" ON search_history
    FOR ALL
    TO authenticated
    USING (current_setting('app.current_account_number')::INTEGER = 999);

CREATE POLICY "Admin can view all cart activity" ON cart_activity
    FOR ALL
    TO authenticated
    USING (current_setting('app.current_account_number')::INTEGER = 999);
