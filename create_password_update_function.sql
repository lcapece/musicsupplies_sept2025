-- Create function to update user password
-- This allows the admin to change passwords through the UI

CREATE OR REPLACE FUNCTION update_user_password(
    p_account_number INTEGER,
    p_new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate inputs
    IF p_account_number IS NULL OR p_new_password IS NULL THEN
        RAISE EXCEPTION 'Account number and password are required';
    END IF;
    
    IF LENGTH(p_new_password) < 8 THEN
        RAISE EXCEPTION 'Password must be at least 8 characters';
    END IF;
    
    -- Update the password
    UPDATE user_passwords
    SET 
        password_hash = crypt(p_new_password, gen_salt('bf')),
        updated_at = CURRENT_TIMESTAMP
    WHERE account_number = p_account_number;
    
    -- If no row was updated, insert a new one
    IF NOT FOUND THEN
        INSERT INTO user_passwords (account_number, password_hash, created_at, updated_at)
        VALUES (
            p_account_number,
            crypt(p_new_password, gen_salt('bf')),
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        );
    END IF;
    
    RETURN TRUE;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to update password: %', SQLERRM;
        RETURN FALSE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_user_password TO authenticated;

-- Create a more secure version that requires current password
CREATE OR REPLACE FUNCTION change_user_password(
    p_account_number INTEGER,
    p_current_password TEXT,
    p_new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_hash TEXT;
BEGIN
    -- Validate inputs
    IF p_account_number IS NULL OR p_current_password IS NULL OR p_new_password IS NULL THEN
        RAISE EXCEPTION 'All fields are required';
    END IF;
    
    IF LENGTH(p_new_password) < 8 THEN
        RAISE EXCEPTION 'New password must be at least 8 characters';
    END IF;
    
    -- Get current password hash
    SELECT password_hash INTO v_current_hash
    FROM user_passwords
    WHERE account_number = p_account_number;
    
    IF v_current_hash IS NULL THEN
        RAISE EXCEPTION 'Account not found';
    END IF;
    
    -- Verify current password
    IF v_current_hash != crypt(p_current_password, v_current_hash) THEN
        RAISE EXCEPTION 'Current password is incorrect';
    END IF;
    
    -- Update to new password
    UPDATE user_passwords
    SET 
        password_hash = crypt(p_new_password, gen_salt('bf')),
        updated_at = CURRENT_TIMESTAMP
    WHERE account_number = p_account_number;
    
    RETURN TRUE;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to change password: %', SQLERRM;
        RETURN FALSE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION change_user_password TO authenticated;