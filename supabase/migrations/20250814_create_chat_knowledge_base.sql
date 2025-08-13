-- Enable pgvector extension for similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create chat knowledge base table with vector embeddings
CREATE TABLE IF NOT EXISTS chat_knowledge_base (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT[], -- Array of keywords for matching
  embedding vector(1536), -- OpenAI embeddings are 1536 dimensions
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for vector similarity search
CREATE INDEX ON chat_knowledge_base USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create index for keyword search
CREATE INDEX ON chat_knowledge_base USING GIN (keywords);

-- Create table for chat conversations (for context and learning)
CREATE TABLE IF NOT EXISTS chat_conversations (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_identifier TEXT, -- Could be account number or anonymous ID
  message_type TEXT CHECK (message_type IN ('user', 'assistant', 'system')),
  message TEXT NOT NULL,
  mode TEXT CHECK (mode IN ('live', 'ai')),
  timestamp TIMESTAMP DEFAULT NOW(),
  metadata JSONB -- Store additional context
);

-- Create table for business hours and staff availability
CREATE TABLE IF NOT EXISTS chat_availability (
  id SERIAL PRIMARY KEY,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
  open_time TIME,
  close_time TIME,
  is_holiday BOOLEAN DEFAULT FALSE,
  holiday_name TEXT,
  staff_available INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default business hours
INSERT INTO chat_availability (day_of_week, open_time, close_time) VALUES
  (1, '09:00', '18:00'), -- Monday
  (2, '09:00', '18:00'), -- Tuesday
  (3, '09:00', '18:00'), -- Wednesday
  (4, '09:00', '18:00'), -- Thursday
  (5, '09:00', '18:00'), -- Friday
  (6, '10:00', '16:00'), -- Saturday
  (0, NULL, NULL); -- Sunday (closed)

-- Initial knowledge base entries
INSERT INTO chat_knowledge_base (category, question, answer, keywords) VALUES
  ('products', 'What guitars do you carry?', 'We carry Yamaha, Ibanez, and Epiphone guitars. We have acoustic, electric, bass, and classical guitars in stock.', ARRAY['guitar', 'guitars', 'acoustic', 'electric', 'bass', 'yamaha', 'ibanez', 'epiphone']),
  
  ('products', 'Do you have Fender guitars?', 'We don''t currently stock Fender guitars, but our Yamaha and Ibanez lines offer comparable quality at better prices. Our staff can help you find the perfect alternative!', ARRAY['fender', 'guitar']),
  
  ('products', 'What drum brands do you sell?', 'We stock Pearl, Tama, Ludwig, and Zildjian. We have complete drum sets, electronic kits, and all accessories.', ARRAY['drum', 'drums', 'pearl', 'tama', 'ludwig', 'zildjian', 'percussion']),
  
  ('products', 'Do you sell keyboards?', 'Yes! We carry Roland, Korg, Yamaha, and Casio keyboards. From beginner models to professional synthesizers and digital pianos.', ARRAY['keyboard', 'piano', 'synthesizer', 'synth', 'roland', 'korg', 'yamaha', 'casio']),
  
  ('services', 'Do you offer instrument repairs?', 'Yes, we have certified technicians for all instrument repairs. Guitar setups, drum tuning, keyboard repairs, and more. Typical turnaround is 3-5 business days.', ARRAY['repair', 'fix', 'broken', 'maintenance', 'setup', 'service']),
  
  ('services', 'Do you give music lessons?', 'We offer lessons for all skill levels! Guitar, drums, piano, and more. $30 for 30 minutes or $50 for an hour. First trial lesson is free!', ARRAY['lesson', 'lessons', 'teacher', 'learn', 'instruction', 'teach', 'class']),
  
  ('services', 'Do you have financing?', 'Yes! We offer 12-month interest-free financing on purchases over $500. We also have layaway programs. Apply online or in-store.', ARRAY['financing', 'payment', 'credit', 'layaway', 'pay', 'installment']),
  
  ('policies', 'What is your return policy?', '30-day returns on most items in original condition. Electronics have 14-day returns. All instruments include manufacturer warranties.', ARRAY['return', 'refund', 'exchange', 'warranty', 'policy']),
  
  ('policies', 'How much is shipping?', 'Free shipping on orders over $99! Standard shipping (3-5 days) is $9.99. Express (1-2 days) is $24.99. Local delivery available for large items.', ARRAY['shipping', 'delivery', 'ship', 'deliver', 'cost']),
  
  ('policies', 'Do you price match?', 'Yes! We match any authorized dealer''s advertised price. Show us the competitor''s current ad or website. Some exclusions for clearance items.', ARRAY['price', 'match', 'competitor', 'cheaper', 'best', 'deal']),
  
  ('store', 'What are your hours?', 'Monday-Friday: 9am-6pm, Saturday: 10am-4pm, Sunday: Closed. Holiday hours may vary.', ARRAY['hours', 'open', 'closed', 'time', 'when']),
  
  ('store', 'Where are you located?', 'We''re on Main Street. Visit us in-store for the full experience and to try instruments in our sound-proof testing rooms!', ARRAY['location', 'address', 'where', 'directions', 'store']),
  
  ('store', 'Do you buy used instruments?', 'Yes! We buy and trade used instruments. Free appraisals in-store. Cash or store credit (20% more value with credit).', ARRAY['buy', 'sell', 'used', 'trade', 'appraisal']),
  
  ('store', 'Do you rent instruments?', 'Yes, rent-to-own starting at $25/month for band instruments. Perfect for students! Rental payments can apply toward purchase.', ARRAY['rent', 'rental', 'lease', 'student']),
  
  ('general', 'Are you hiring?', 'We''re always looking for passionate music enthusiasts! Check our website or drop off a resume in-store. Sales experience and instrument knowledge are a plus!', ARRAY['hiring', 'job', 'employment', 'work', 'career']);

-- Function to search knowledge base
CREATE OR REPLACE FUNCTION search_knowledge_base(
  query_text TEXT,
  limit_results INTEGER DEFAULT 5
)
RETURNS TABLE (
  id INTEGER,
  category TEXT,
  question TEXT,
  answer TEXT,
  relevance_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ckb.id,
    ckb.category,
    ckb.question,
    ckb.answer,
    (
      -- Keyword match score
      CASE 
        WHEN query_text ILIKE '%' || ANY(ckb.keywords) || '%' THEN 1.0
        ELSE 0.0
      END +
      -- Question similarity score
      similarity(LOWER(query_text), LOWER(ckb.question)) * 0.5
    ) AS relevance_score
  FROM chat_knowledge_base ckb
  WHERE 
    -- Must have some keyword match or similarity
    query_text ILIKE '%' || ANY(ckb.keywords) || '%'
    OR similarity(LOWER(query_text), LOWER(ckb.question)) > 0.3
  ORDER BY relevance_score DESC
  LIMIT limit_results;
  
  -- Update usage count for top result
  UPDATE chat_knowledge_base 
  SET usage_count = usage_count + 1, last_used = NOW()
  WHERE chat_knowledge_base.id = (
    SELECT ckb.id 
    FROM chat_knowledge_base ckb
    WHERE query_text ILIKE '%' || ANY(ckb.keywords) || '%'
    OR similarity(LOWER(query_text), LOWER(ckb.question)) > 0.3
    ORDER BY (
      CASE 
        WHEN query_text ILIKE '%' || ANY(ckb.keywords) || '%' THEN 1.0
        ELSE 0.0
      END +
      similarity(LOWER(query_text), LOWER(ckb.question)) * 0.5
    ) DESC
    LIMIT 1
  );
END;
$$;

-- Function to check if staff is available
CREATE OR REPLACE FUNCTION is_chat_staff_available()
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  current_day INTEGER;
  current_time TIME;
  is_available BOOLEAN;
BEGIN
  current_day := EXTRACT(DOW FROM NOW());
  current_time := CURRENT_TIME;
  
  SELECT 
    CASE 
      WHEN ca.open_time IS NULL OR ca.close_time IS NULL THEN FALSE
      WHEN ca.is_holiday THEN FALSE
      WHEN current_time BETWEEN ca.open_time AND ca.close_time AND ca.staff_available > 0 THEN TRUE
      ELSE FALSE
    END INTO is_available
  FROM chat_availability ca
  WHERE ca.day_of_week = current_day;
  
  RETURN COALESCE(is_available, FALSE);
END;
$$;

-- RLS policies
ALTER TABLE chat_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_availability ENABLE ROW LEVEL SECURITY;

-- Everyone can read knowledge base
CREATE POLICY "Knowledge base is public" ON chat_knowledge_base
  FOR SELECT USING (true);

-- Only admins can modify knowledge base
CREATE POLICY "Admins can modify knowledge base" ON chat_knowledge_base
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staff s
      WHERE s.account_number = current_setting('app.account_number', true)::INTEGER
      AND s.privs >= 5
    )
  );

-- Everyone can insert conversations
CREATE POLICY "Anyone can create conversations" ON chat_conversations
  FOR INSERT WITH CHECK (true);

-- Users can only see their own conversations
CREATE POLICY "Users see own conversations" ON chat_conversations
  FOR SELECT USING (
    user_identifier = current_setting('app.account_number', true)
    OR EXISTS (
      SELECT 1 FROM staff s
      WHERE s.account_number = current_setting('app.account_number', true)::INTEGER
      AND s.privs >= 5
    )
  );

-- Public read for availability
CREATE POLICY "Availability is public" ON chat_availability
  FOR SELECT USING (true);

-- Only admins can modify availability
CREATE POLICY "Admins can modify availability" ON chat_availability
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staff s
      WHERE s.account_number = current_setting('app.account_number', true)::INTEGER
      AND s.privs >= 5
    )
  );