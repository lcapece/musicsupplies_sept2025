@echo off
echo.
echo ============================================
echo     CONTACT INFO FIX - CLICK THE LINK
echo ============================================
echo.
echo STEP 1: Click this link to open Supabase:
echo.
echo https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/sql
echo.
echo ============================================
echo.
echo STEP 2: Copy ALL of this SQL:
echo.
echo DROP FUNCTION IF EXISTS upsert_contact_info(INTEGER, VARCHAR(255), VARCHAR(20), VARCHAR(20));
echo.
echo CREATE OR REPLACE FUNCTION upsert_contact_info(
echo     p_account_number INTEGER,
echo     p_email_address VARCHAR(255) DEFAULT NULL,
echo     p_business_phone VARCHAR(20) DEFAULT NULL,
echo     p_mobile_phone VARCHAR(20) DEFAULT NULL
echo )
echo RETURNS TABLE(account_number INTEGER, email_address VARCHAR(255), business_phone VARCHAR(20), mobile_phone VARCHAR(20), updated_at TIMESTAMP WITH TIME ZONE)
echo LANGUAGE plpgsql
echo SECURITY DEFINER
echo AS $$
echo BEGIN
echo     INSERT INTO contactinfo (account_number, email_address, business_phone, mobile_phone)
echo     VALUES (p_account_number, p_email_address, p_business_phone, p_mobile_phone)
echo     ON CONFLICT (account_number) 
echo     DO UPDATE SET
echo         email_address = EXCLUDED.email_address,
echo         business_phone = EXCLUDED.business_phone,
echo         mobile_phone = EXCLUDED.mobile_phone,
echo         updated_at = CURRENT_TIMESTAMP;
echo     
echo     RETURN QUERY
echo     SELECT ci.account_number, ci.email_address, ci.business_phone, ci.mobile_phone, ci.updated_at
echo     FROM contactinfo ci
echo     WHERE ci.account_number = p_account_number;
echo END;
echo $$;
echo.
echo GRANT EXECUTE ON FUNCTION upsert_contact_info(INTEGER, VARCHAR(255), VARCHAR(20), VARCHAR(20)) TO anon, authenticated;
echo ALTER FUNCTION upsert_contact_info(INTEGER, VARCHAR(255), VARCHAR(20), VARCHAR(20)) OWNER TO postgres;
echo.
echo ============================================
echo.
echo STEP 3: Click the green RUN button
echo.
echo ============================================
echo.
echo Opening browser now...
start https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/sql
echo.
pause