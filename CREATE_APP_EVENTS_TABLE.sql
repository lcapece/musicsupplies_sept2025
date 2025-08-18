-- ====================================================
-- CREATE APP_EVENTS TABLE FOR AUDIT LOGGING
-- ====================================================

CREATE TABLE IF NOT EXISTS app_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT CURRENT_USER,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    account_number VARCHAR(20),
    severity VARCHAR(20) DEFAULT 'INFO' CHECK (severity IN ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_app_events_event_type ON app_events(event_type);
CREATE INDEX IF NOT EXISTS idx_app_events_created_at ON app_events(created_at);
CREATE INDEX IF NOT EXISTS idx_app_events_account_number ON app_events(account_number);
CREATE INDEX IF NOT EXISTS idx_app_events_severity ON app_events(severity);
CREATE INDEX IF NOT EXISTS idx_app_events_event_data ON app_events USING GIN(event_data);

-- Grant appropriate permissions
GRANT INSERT ON app_events TO authenticated;
GRANT SELECT ON app_events TO authenticated;

-- Add comment
COMMENT ON TABLE app_events IS 'Audit log table for tracking all application events including authentication, security actions, and system changes';

-- Insert initial event
INSERT INTO app_events (event_type, event_name, event_data, severity)
VALUES (
    'SYSTEM_INIT',
    'App Events Table Created',
    jsonb_build_object(
        'timestamp', CURRENT_TIMESTAMP,
        'message', 'Application events audit log table successfully created'
    ),
    'INFO'
);