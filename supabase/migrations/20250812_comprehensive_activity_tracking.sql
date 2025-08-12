-- Comprehensive shopping activity tracking with session management
-- This extends the basic tracking tables with more detailed session and abandonment tracking

-- 1. Shopping Sessions Table (if not exists from previous migration)
CREATE TABLE IF NOT EXISTS shopping_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_number BIGINT REFERENCES accounts_lcmd(account_number),
    session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    session_end TIMESTAMP WITH TIME ZONE,
    ip_address TEXT,
    user_agent TEXT,
    login_identifier TEXT,
    session_status TEXT DEFAULT 'active' CHECK (session_status IN ('active', 'expired', 'logged_out', 'abandoned')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Enhanced Search Activity Table (extends basic search_history)
CREATE TABLE IF NOT EXISTS search_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES shopping_sessions(id) ON DELETE CASCADE,
    account_number BIGINT REFERENCES accounts_lcmd(account_number),
    search_term TEXT NOT NULL,
    search_type TEXT CHECK (search_type IN ('keyword', 'sku', 'brand', 'category', 'barcode')),
    results_count INTEGER DEFAULT 0,
    clicked_results JSONB,
    search_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    search_duration_ms INTEGER,
    filters_applied JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. Enhanced Cart Activity Table
CREATE TABLE IF NOT EXISTS cart_activity_detailed (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES shopping_sessions(id) ON DELETE CASCADE,
    account_number BIGINT REFERENCES accounts_lcmd(account_number),
    action_type TEXT NOT NULL CHECK (action_type IN ('add', 'remove', 'update_quantity', 'clear', 'view')),
    sku TEXT NOT NULL,
    product_name TEXT,
    quantity INTEGER,
    quantity_change INTEGER,
    unit_price DECIMAL(10,2),
    total_price DECIMAL(10,2),
    cart_total_after DECIMAL(10,2),
    cart_items_count_after INTEGER,
    source_page TEXT,
    action_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 4. Abandoned Cart Summary Table
CREATE TABLE IF NOT EXISTS abandoned_carts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES shopping_sessions(id) ON DELETE CASCADE,
    account_number BIGINT REFERENCES accounts_lcmd(account_number),
    cart_value DECIMAL(10,2) NOT NULL,
    items_count INTEGER NOT NULL,
    cart_items JSONB NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE NOT NULL,
    abandonment_detected TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    recovery_attempted BOOLEAN DEFAULT FALSE,
    recovery_successful BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 5. Page View Activity
CREATE TABLE IF NOT EXISTS page_view_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES shopping_sessions(id) ON DELETE CASCADE,
    account_number BIGINT REFERENCES accounts_lcmd(account_number),
    page_type TEXT CHECK (page_type IN ('product_detail', 'category', 'search_results', 'cart', 'checkout', 'order_history', 'home')),
    page_identifier TEXT,
    view_duration_seconds INTEGER,
    referrer_page TEXT,
    view_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shopping_sessions_account ON shopping_sessions(account_number);
CREATE INDEX IF NOT EXISTS idx_shopping_sessions_status ON shopping_sessions(session_status);
CREATE INDEX IF NOT EXISTS idx_shopping_sessions_start ON shopping_sessions(session_start DESC);

CREATE INDEX IF NOT EXISTS idx_search_activity_session ON search_activity(session_id);
CREATE INDEX IF NOT EXISTS idx_search_activity_account ON search_activity(account_number);
CREATE INDEX IF NOT EXISTS idx_search_activity_timestamp ON search_activity(search_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_search_activity_term ON search_activity(search_term);

CREATE INDEX IF NOT EXISTS idx_cart_activity_detailed_session ON cart_activity_detailed(session_id);
CREATE INDEX IF NOT EXISTS idx_cart_activity_detailed_account ON cart_activity_detailed(account_number);
CREATE INDEX IF NOT EXISTS idx_cart_activity_detailed_timestamp ON cart_activity_detailed(action_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_cart_activity_detailed_sku ON cart_activity_detailed(sku);

CREATE INDEX IF NOT EXISTS idx_abandoned_carts_account ON abandoned_carts(account_number);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_detected ON abandoned_carts(abandonment_detected DESC);

CREATE INDEX IF NOT EXISTS idx_page_view_session ON page_view_activity(session_id);
CREATE INDEX IF NOT EXISTS idx_page_view_account ON page_view_activity(account_number);
CREATE INDEX IF NOT EXISTS idx_page_view_timestamp ON page_view_activity(view_timestamp DESC);

-- Enable RLS
ALTER TABLE shopping_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_activity_detailed ENABLE ROW LEVEL SECURITY;
ALTER TABLE abandoned_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_view_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin access (account 999 and 99)
CREATE POLICY "Admin full access to shopping_sessions" ON shopping_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM accounts_lcmd 
            WHERE account_number IN (99, 999)
            AND account_number = (current_setting('request.jwt.claims', true)::json->>'account_number')::bigint
        )
    );

CREATE POLICY "Admin full access to search_activity" ON search_activity
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM accounts_lcmd 
            WHERE account_number IN (99, 999)
            AND account_number = (current_setting('request.jwt.claims', true)::json->>'account_number')::bigint
        )
    );

CREATE POLICY "Admin full access to cart_activity_detailed" ON cart_activity_detailed
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM accounts_lcmd 
            WHERE account_number IN (99, 999)
            AND account_number = (current_setting('request.jwt.claims', true)::json->>'account_number')::bigint
        )
    );

CREATE POLICY "Admin full access to abandoned_carts" ON abandoned_carts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM accounts_lcmd 
            WHERE account_number IN (99, 999)
            AND account_number = (current_setting('request.jwt.claims', true)::json->>'account_number')::bigint
        )
    );

CREATE POLICY "Admin full access to page_view_activity" ON page_view_activity
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM accounts_lcmd 
            WHERE account_number IN (99, 999)
            AND account_number = (current_setting('request.jwt.claims', true)::json->>'account_number')::bigint
        )
    );

-- RLS Policies for regular users (can only see/insert their own data)
CREATE POLICY "Users view own shopping_sessions" ON shopping_sessions
    FOR SELECT USING (
        account_number = (current_setting('request.jwt.claims', true)::json->>'account_number')::bigint
    );

CREATE POLICY "Users insert own shopping_sessions" ON shopping_sessions
    FOR INSERT WITH CHECK (
        account_number = (current_setting('request.jwt.claims', true)::json->>'account_number')::bigint
    );

CREATE POLICY "Users update own shopping_sessions" ON shopping_sessions
    FOR UPDATE USING (
        account_number = (current_setting('request.jwt.claims', true)::json->>'account_number')::bigint
    );

CREATE POLICY "Users view own search_activity" ON search_activity
    FOR SELECT USING (
        account_number = (current_setting('request.jwt.claims', true)::json->>'account_number')::bigint
    );

CREATE POLICY "Users insert own search_activity" ON search_activity
    FOR INSERT WITH CHECK (
        account_number = (current_setting('request.jwt.claims', true)::json->>'account_number')::bigint
    );

CREATE POLICY "Users view own cart_activity_detailed" ON cart_activity_detailed
    FOR SELECT USING (
        account_number = (current_setting('request.jwt.claims', true)::json->>'account_number')::bigint
    );

CREATE POLICY "Users insert own cart_activity_detailed" ON cart_activity_detailed
    FOR INSERT WITH CHECK (
        account_number = (current_setting('request.jwt.claims', true)::json->>'account_number')::bigint
    );

CREATE POLICY "Users view own page_view_activity" ON page_view_activity
    FOR SELECT USING (
        account_number = (current_setting('request.jwt.claims', true)::json->>'account_number')::bigint
    );

CREATE POLICY "Users insert own page_view_activity" ON page_view_activity
    FOR INSERT WITH CHECK (
        account_number = (current_setting('request.jwt.claims', true)::json->>'account_number')::bigint
    );

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create abandoned cart analysis view
CREATE OR REPLACE VIEW abandoned_cart_analysis AS
SELECT 
    ac.id,
    ac.account_number,
    a.acct_name,
    a.email_address,
    a.mobile_phone,
    ac.cart_value,
    ac.items_count,
    ac.cart_items,
    ac.last_activity,
    ac.abandonment_detected,
    EXTRACT(EPOCH FROM (ac.abandonment_detected - ac.last_activity))/60 as minutes_to_abandonment,
    ac.recovery_attempted,
    ac.recovery_successful,
    s.login_identifier,
    s.ip_address,
    (SELECT COUNT(*) FROM search_activity sa WHERE sa.session_id = ac.session_id) as searches_in_session,
    (SELECT COUNT(*) FROM cart_activity_detailed ca WHERE ca.session_id = ac.session_id) as cart_actions_in_session
FROM abandoned_carts ac
JOIN shopping_sessions s ON s.id = ac.session_id
LEFT JOIN accounts_lcmd a ON a.account_number = ac.account_number
ORDER BY ac.abandonment_detected DESC;

GRANT SELECT ON abandoned_cart_analysis TO authenticated;