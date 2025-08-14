-- RUN THIS IN SUPABASE SQL EDITOR IMMEDIATELY!

-- Create knowledge base table for chat system
CREATE TABLE IF NOT EXISTS chat_knowledge_base (
  id SERIAL PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT[], -- Array of keywords for better search
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_by VARCHAR(50),
  priority INTEGER DEFAULT 0 -- Higher priority items show first
);

-- Create index for faster searching
CREATE INDEX IF NOT EXISTS idx_knowledge_keywords ON chat_knowledge_base USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON chat_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_active ON chat_knowledge_base(is_active);

-- Simple text search function
CREATE OR REPLACE FUNCTION search_knowledge_base(
  query_text TEXT,
  limit_results INTEGER DEFAULT 5
)
RETURNS TABLE (
  id INTEGER,
  category VARCHAR,
  question TEXT,
  answer TEXT,
  relevance_score NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kb.id,
    kb.category,
    kb.question,
    kb.answer,
    -- Simple relevance scoring based on text similarity
    CASE 
      WHEN LOWER(kb.question) LIKE '%' || LOWER(query_text) || '%' THEN 1.0
      WHEN LOWER(kb.answer) LIKE '%' || LOWER(query_text) || '%' THEN 0.8
      WHEN array_to_string(kb.keywords, ' ') ILIKE '%' || query_text || '%' THEN 0.6
      ELSE 0.4
    END AS relevance_score
  FROM chat_knowledge_base kb
  WHERE 
    kb.is_active = true
    AND (
      LOWER(kb.question) LIKE '%' || LOWER(query_text) || '%'
      OR LOWER(kb.answer) LIKE '%' || LOWER(query_text) || '%'
      OR array_to_string(kb.keywords, ' ') ILIKE '%' || query_text || '%'
    )
  ORDER BY 
    kb.priority DESC,
    relevance_score DESC,
    kb.id
  LIMIT limit_results;
END;
$$;

-- Create chat configuration table for storing voice settings
CREATE TABLE IF NOT EXISTS chat_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_by VARCHAR(50)
);

-- Insert default ElevenLabs voices
INSERT INTO chat_config (config_key, config_value, description) 
VALUES
  ('elevenlabs_voice_id', 'EXAVITQu4vr4xnSDxMaL', 'Selected ElevenLabs voice ID'),
  ('elevenlabs_voice_name', 'Bella', 'Current voice name for display')
ON CONFLICT (config_key) DO NOTHING;

-- Insert some sample knowledge base entries
INSERT INTO chat_knowledge_base (category, question, answer, keywords, priority) VALUES
('Hours', 'What are your business hours?', 'We are open Monday-Friday 9am-5pm Eastern Time. On weekends, our AI assistant is available 24/7 to help you.', ARRAY['hours', 'open', 'closed', 'time', 'schedule'], 10),
('Shipping', 'Do you offer free shipping?', 'Yes! We offer free shipping on all orders over $99. Standard shipping for orders under $99 is $9.95.', ARRAY['shipping', 'delivery', 'free', 'cost'], 9),
('Returns', 'What is your return policy?', 'We offer a 30-day return policy on all items in original condition. Musical instruments have a 45-day return window.', ARRAY['return', 'refund', 'exchange', 'policy'], 8),
('Payment', 'What payment methods do you accept?', 'We accept all major credit cards, PayPal, and offer financing through Affirm for purchases over $500.', ARRAY['payment', 'credit card', 'paypal', 'financing', 'affirm'], 7),
('Lessons', 'Do you offer music lessons?', 'Yes! We offer both in-person and online lessons. Rates are $30 for 30 minutes or $50 for one hour.', ARRAY['lessons', 'learn', 'teacher', 'instruction', 'class'], 6),
('Repairs', 'Do you repair instruments?', 'Yes, we have certified technicians who can repair guitars, drums, keyboards, and most other instruments. Estimates are free.', ARRAY['repair', 'fix', 'broken', 'service', 'maintenance'], 5),
('Brands', 'What brands do you carry?', 'We carry top brands including Yamaha, Roland, Fender, Gibson, Pearl, Tama, Korg, and many more.', ARRAY['brand', 'manufacturer', 'yamaha', 'roland', 'fender'], 4),
('Contact', 'How can I contact you?', 'You can reach us through this chat, call us at 1-800-MUSIC-99, or email support@musicsupplies.com', ARRAY['contact', 'phone', 'email', 'call', 'reach'], 3);

-- Grant permissions
GRANT ALL ON chat_knowledge_base TO authenticated;
GRANT SELECT ON chat_knowledge_base TO anon;
GRANT ALL ON chat_config TO authenticated;
GRANT SELECT ON chat_config TO anon;
GRANT EXECUTE ON FUNCTION search_knowledge_base TO anon;
GRANT EXECUTE ON FUNCTION search_knowledge_base TO authenticated;

-- Grant sequence permissions for auto-increment IDs
GRANT USAGE, SELECT ON SEQUENCE chat_knowledge_base_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE chat_config_id_seq TO authenticated;