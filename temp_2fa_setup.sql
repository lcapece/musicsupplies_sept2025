-- Create 2FA tables
CREATE TABLE IF NOT EXISTS public."2fa" (
    id SERIAL PRIMARY KEY,
    phonenumber TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.two_factor_codes (
    id SERIAL PRIMARY KEY,
    account_number INTEGER NOT NULL,
    code VARCHAR(6) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_2fa_codes_lookup 
ON two_factor_codes(account_number, code, used, expires_at);

-- Create store_2fa_code function
CREATE OR REPLACE FUNCTION store_2fa_code(
    p_account_number INTEGER,
    p_code VARCHAR(6),
    p_ip_address TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_expires_at TIMESTAMP;
BEGIN
    IF p_account_number != 999 THEN
        RETURN json_build_object('success', false, 'message', '2FA not required');
    END IF;
    
    v_expires_at := NOW() + INTERVAL '90 seconds';
    
    INSERT INTO two_factor_codes (account_number, code, expires_at, ip_address)
    VALUES (p_account_number, p_code, v_expires_at, p_ip_address);
    
    RETURN json_build_object('success', true, 'expires_at', v_expires_at);
END;
$$;

-- Create validate_2fa_code function
CREATE OR REPLACE FUNCTION validate_2fa_code(
    p_account_number INTEGER,
    p_code VARCHAR(6)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_valid BOOLEAN;
BEGIN
    UPDATE two_factor_codes
    SET used = TRUE
    WHERE account_number = p_account_number
      AND code = p_code
      AND used = FALSE
      AND expires_at > NOW()
    RETURNING TRUE INTO v_valid;
    
    RETURN COALESCE(v_valid, FALSE);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION store_2fa_code TO authenticated;
GRANT EXECUTE ON FUNCTION store_2fa_code TO anon;
GRANT EXECUTE ON FUNCTION validate_2fa_code TO authenticated;
GRANT EXECUTE ON FUNCTION validate_2fa_code TO anon;

-- Add phone numbers
INSERT INTO public."2fa" (phonenumber) VALUES 
  ('+15164107455'),
  ('+18003215584')
ON CONFLICT DO NOTHING;