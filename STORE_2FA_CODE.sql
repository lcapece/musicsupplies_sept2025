-- Simple function to store 2FA code
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
    -- Only allow 2FA for account 999
    IF p_account_number != 999 THEN
        RETURN json_build_object('success', false, 'message', '2FA not required');
    END IF;
    
    -- Set expiration to 90 seconds from now
    v_expires_at := NOW() + INTERVAL '90 seconds';
    
    -- Store the code
    INSERT INTO two_factor_codes (account_number, code, expires_at, ip_address)
    VALUES (p_account_number, p_code, v_expires_at, p_ip_address);
    
    RETURN json_build_object(
        'success', true,
        'expires_at', v_expires_at
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION store_2fa_code TO authenticated;
GRANT EXECUTE ON FUNCTION store_2fa_code TO anon;