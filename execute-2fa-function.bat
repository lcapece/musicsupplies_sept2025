@echo off
echo Executing STORE_2FA_CODE.sql...

curl -X POST "https://ekklokrukxmqlahtonnc.supabase.co/rest/v1/rpc/exec_sql" ^
-H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDA3MzE5NCwiZXhwIjoyMDU1NjQ5MTk0fQ.VzPGNEdJY6_VvEUTcdcyIUbmSFyJ-xoUOrSPcSlQPCU" ^
-H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDA3MzE5NCwiZXhwIjoyMDU1NjQ5MTk0fQ.VzPGNEdJY6_VvEUTcdcyIUbmSFyJ-xoUOrSPcSlQPCU" ^
-H "Content-Type: application/json" ^
-d "{\"sql_query\": \"CREATE OR REPLACE FUNCTION store_2fa_code(p_account_number INTEGER, p_code VARCHAR(6), p_ip_address TEXT DEFAULT NULL) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_expires_at TIMESTAMP; BEGIN IF p_account_number != 999 THEN RETURN json_build_object('success', false, 'message', '2FA not required'); END IF; v_expires_at := NOW() + INTERVAL '90 seconds'; INSERT INTO two_factor_codes (account_number, code, expires_at, ip_address) VALUES (p_account_number, p_code, v_expires_at, p_ip_address); RETURN json_build_object('success', true, 'expires_at', v_expires_at); END; $$; GRANT EXECUTE ON FUNCTION store_2fa_code TO authenticated; GRANT EXECUTE ON FUNCTION store_2fa_code TO anon;\"}"

echo.
echo Function creation attempted. Testing if it exists...

curl -X POST "https://ekklokrukxmqlahtonnc.supabase.co/rest/v1/rpc/store_2fa_code" ^
-H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDA3MzE5NCwiZXhwIjoyMDU1NjQ5MTk0fQ.VzPGNEdJY6_VvEUTcdcyIUbmSFyJ-xoUOrSPcSlQPCU" ^
-H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDA3MzE5NCwiZXhwIjoyMDU1NjQ5MTk0fQ.VzPGNEdJY6_VvEUTcdcyIUbmSFyJ-xoUOrSPcSlQPCU" ^
-H "Content-Type: application/json" ^
-d "{\"p_account_number\": 999, \"p_code\": \"123456\", \"p_ip_address\": \"127.0.0.1\"}"

echo.
echo Execution complete!