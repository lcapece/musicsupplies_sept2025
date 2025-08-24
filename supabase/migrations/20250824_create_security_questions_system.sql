-- Create security questions system for user 999
-- This replaces the problematic 2FA SMS system

-- Create table for security questions
CREATE TABLE IF NOT EXISTS security_questions (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES accounts_lcmd(account_id),
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  answer_hash TEXT NOT NULL,
  alternate_answers TEXT[], -- For cases like "levi" or "levy"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policy
ALTER TABLE security_questions ENABLE ROW LEVEL SECURITY;

-- Policy to allow admins and the account owner to access
CREATE POLICY security_questions_policy ON security_questions
  FOR ALL USING (
    account_id = 999 -- Only for account 999 for now
  );

-- Insert the 4 security questions for account 999
INSERT INTO security_questions (account_id, question_number, question_text, answer_hash, alternate_answers) VALUES
(999, 1, 'Fill in the missing word: Tiny red 1987 Turbo XXXXX', crypt('sprint', gen_salt('bf')), NULL),
(999, 2, 'The man who stole the aluminum ladder was Mister XXXX', crypt('levi', gen_salt('bf')), ARRAY['levi', 'levy']),
(999, 3, 'The last name of the twins that were on our block: XXXXXXX', crypt('wallace', gen_salt('bf')), NULL),
(999, 4, 'Elementary school was: XXXXXXX', crypt('parkway', gen_salt('bf')), NULL);

-- Create function to get a random security question for account 999
CREATE OR REPLACE FUNCTION get_random_security_question(p_account_id INTEGER)
RETURNS TABLE(
  question_id INTEGER,
  question_text TEXT
) 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only work for account 999
  IF p_account_id != 999 THEN
    RAISE EXCEPTION 'Security questions only available for account 999';
  END IF;

  RETURN QUERY
  SELECT 
    sq.id,
    sq.question_text
  FROM security_questions sq
  WHERE sq.account_id = p_account_id
  ORDER BY RANDOM()
  LIMIT 1;
END;
$$;

-- Create function to verify security question answer
CREATE OR REPLACE FUNCTION verify_security_answer(
  p_question_id INTEGER,
  p_answer TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_stored_hash TEXT;
  v_alternate_answers TEXT[];
  v_answer TEXT;
BEGIN
  -- Clean the answer (lowercase, trim)
  v_answer := LOWER(TRIM(p_answer));
  
  -- Get the stored hash and alternate answers
  SELECT answer_hash, alternate_answers 
  INTO v_stored_hash, v_alternate_answers
  FROM security_questions 
  WHERE id = p_question_id AND account_id = 999;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check against primary answer
  IF crypt(v_answer, v_stored_hash) = v_stored_hash THEN
    RETURN TRUE;
  END IF;
  
  -- Check against alternate answers if they exist
  IF v_alternate_answers IS NOT NULL THEN
    FOR i IN 1..array_length(v_alternate_answers, 1) LOOP
      IF LOWER(v_alternate_answers[i]) = v_answer THEN
        RETURN TRUE;
      END IF;
    END LOOP;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Create updated authenticate function that uses security questions instead of 2FA
CREATE OR REPLACE FUNCTION authenticate_user_with_security_question(
  p_identifier TEXT,
  p_password TEXT,
  p_question_id INTEGER DEFAULT NULL,
  p_security_answer TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  account_id INTEGER,
  requires_security_question BOOLEAN,
  security_question_id INTEGER,
  security_question_text TEXT,
  session_token TEXT
) 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_account accounts_lcmd%ROWTYPE;
  v_stored_password_hash TEXT;
  v_requires_password_change BOOLEAN;
  v_session_token TEXT;
  v_question_id INTEGER;
  v_question_text TEXT;
BEGIN
  -- First, authenticate with username/password
  SELECT a.*, ap.password_hash, ap.requires_password_change 
  INTO v_account, v_stored_password_hash, v_requires_password_change
  FROM accounts_lcmd a
  LEFT JOIN admin_passwords ap ON a.account_id = ap.account_id
  WHERE (a.account_id::TEXT = p_identifier OR a.email = p_identifier)
  AND a.account_id = 999; -- Only for account 999
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invalid credentials', NULL::INTEGER, FALSE, NULL::INTEGER, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Check password
  IF v_stored_password_hash IS NULL OR crypt(p_password, v_stored_password_hash) != v_stored_password_hash THEN
    RETURN QUERY SELECT FALSE, 'Invalid credentials', NULL::INTEGER, FALSE, NULL::INTEGER, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;
  
  -- If no security question provided, return a random question
  IF p_question_id IS NULL OR p_security_answer IS NULL THEN
    SELECT question_id, question_text 
    INTO v_question_id, v_question_text
    FROM get_random_security_question(v_account.account_id);
    
    RETURN QUERY SELECT 
      FALSE, 
      'Security question required', 
      v_account.account_id,
      TRUE,
      v_question_id,
      v_question_text,
      NULL::TEXT;
    RETURN;
  END IF;
  
  -- Verify security question answer
  IF NOT verify_security_answer(p_question_id, p_security_answer) THEN
    RETURN QUERY SELECT FALSE, 'Incorrect security answer', NULL::INTEGER, FALSE, NULL::INTEGER, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Generate session token
  v_session_token := encode(gen_random_bytes(32), 'base64');
  
  -- Log successful login
  INSERT INTO login_activity_log (account_id, identifier_used, success, ip_address, user_agent)
  VALUES (v_account.account_id, p_identifier, TRUE, NULL, NULL);
  
  -- Return success
  RETURN QUERY SELECT 
    TRUE, 
    'Login successful', 
    v_account.account_id,
    FALSE,
    NULL::INTEGER,
    NULL::TEXT,
    v_session_token;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SEQUENCE security_questions_id_seq TO authenticated;
GRANT SELECT, INSERT, UPDATE ON security_questions TO authenticated;
GRANT EXECUTE ON FUNCTION get_random_security_question(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_security_answer(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION authenticate_user_with_security_question(TEXT, TEXT, INTEGER, TEXT) TO authenticated;