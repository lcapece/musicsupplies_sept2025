-- Add management functions for security questions

-- Function to add a new security question
CREATE OR REPLACE FUNCTION add_security_question(
  p_account_id INTEGER,
  p_question_number INTEGER,
  p_question_text TEXT,
  p_primary_answer TEXT,
  p_alternate_answers TEXT[] DEFAULT NULL
)
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only allow for account 999
  IF p_account_id != 999 THEN
    RAISE EXCEPTION 'Security questions only available for account 999';
  END IF;

  -- Insert the new security question
  INSERT INTO security_questions (
    account_id, 
    question_number, 
    question_text, 
    answer_hash, 
    alternate_answers,
    created_at,
    updated_at
  ) VALUES (
    p_account_id,
    p_question_number,
    p_question_text,
    crypt(LOWER(TRIM(p_primary_answer)), gen_salt('bf')),
    p_alternate_answers,
    NOW(),
    NOW()
  );

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to add security question: %', SQLERRM;
END;
$$;

-- Function to update an existing security question
CREATE OR REPLACE FUNCTION update_security_question(
  p_question_id INTEGER,
  p_question_text TEXT,
  p_primary_answer TEXT DEFAULT NULL,
  p_alternate_answers TEXT[] DEFAULT NULL
)
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_account_id INTEGER;
BEGIN
  -- Check if this question exists and belongs to account 999
  SELECT account_id INTO v_account_id 
  FROM security_questions 
  WHERE id = p_question_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Security question not found';
  END IF;
  
  IF v_account_id != 999 THEN
    RAISE EXCEPTION 'Security questions only available for account 999';
  END IF;

  -- Update the security question
  UPDATE security_questions SET
    question_text = p_question_text,
    answer_hash = CASE 
      WHEN p_primary_answer IS NOT NULL 
      THEN crypt(LOWER(TRIM(p_primary_answer)), gen_salt('bf'))
      ELSE answer_hash
    END,
    alternate_answers = p_alternate_answers,
    updated_at = NOW()
  WHERE id = p_question_id;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to update security question: %', SQLERRM;
END;
$$;

-- Function to get security questions for management (without showing encrypted answers)
CREATE OR REPLACE FUNCTION get_security_questions_for_management(p_account_id INTEGER)
RETURNS TABLE(
  id INTEGER,
  account_id INTEGER,
  question_number INTEGER,
  question_text TEXT,
  alternate_answers TEXT[],
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  has_primary_answer BOOLEAN
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
    sq.account_id,
    sq.question_number,
    sq.question_text,
    sq.alternate_answers,
    sq.created_at,
    sq.updated_at,
    (sq.answer_hash IS NOT NULL AND sq.answer_hash != '') as has_primary_answer
  FROM security_questions sq
  WHERE sq.account_id = p_account_id
  ORDER BY sq.question_number;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION add_security_question(INTEGER, INTEGER, TEXT, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION update_security_question(INTEGER, TEXT, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_security_questions_for_management(INTEGER) TO authenticated;