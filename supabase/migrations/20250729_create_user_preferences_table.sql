-- Create user_preferences table for storing user-specific settings
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    account_number VARCHAR(50) NOT NULL,
    font_size VARCHAR(20) DEFAULT 'standard' CHECK (font_size IN ('smaller', 'standard', 'larger')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(account_number)
);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read their own preferences
CREATE POLICY "Users can view their own preferences" ON user_preferences
    FOR SELECT USING (account_number = current_setting('app.current_user_account', true));

-- Policy to allow users to insert their own preferences
CREATE POLICY "Users can insert their own preferences" ON user_preferences
    FOR INSERT WITH CHECK (account_number = current_setting('app.current_user_account', true));

-- Policy to allow users to update their own preferences
CREATE POLICY "Users can update their own preferences" ON user_preferences
    FOR UPDATE USING (account_number = current_setting('app.current_user_account', true));

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_preferences_updated_at();

-- Function to get user font preference with fallback
CREATE OR REPLACE FUNCTION get_user_font_preference(user_account VARCHAR(50))
RETURNS VARCHAR(20) AS $$
DECLARE
    user_font_size VARCHAR(20);
BEGIN
    SELECT font_size INTO user_font_size
    FROM user_preferences
    WHERE account_number = user_account;
    
    -- Return standard if no preference found
    RETURN COALESCE(user_font_size, 'standard');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to save user font preference (upsert)
CREATE OR REPLACE FUNCTION save_user_font_preference(user_account VARCHAR(50), font_preference VARCHAR(20))
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_preferences (account_number, font_size)
    VALUES (user_account, font_preference)
    ON CONFLICT (account_number)
    DO UPDATE SET 
        font_size = EXCLUDED.font_size,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
