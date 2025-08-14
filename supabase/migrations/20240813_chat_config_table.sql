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
INSERT INTO chat_config (config_key, config_value, description) VALUES
('elevenlabs_voice_id', 'EXAVITQu4vr4xnSDxMaL', 'Selected ElevenLabs voice ID'),
('elevenlabs_voice_name', 'Bella', 'Current voice name for display');

-- Common ElevenLabs voice options (for reference)
-- These are some popular voices, but you can add any voice ID from your ElevenLabs account
COMMENT ON TABLE chat_config IS 'Voice IDs: 
- Rachel (21m00Tcm4TlvDq8ikWAM): American, young adult female
- Domi (AZnzlk1XvdvUeBnXmlld): American, young adult female  
- Bella (EXAVITQu4vr4xnSDxMaL): American, young adult female
- Antoni (ErXwobaYiN019PkySvjV): American, adult male
- Arnold (VR6AewLTigWG4xSOukaG): American, adult male
- Adam (pNInz6obpgDQGcFmaJgB): American, middle aged male
- Sam (yoZ06aMxZJJ28mfd3POQ): American, young adult male
- Elli (MF3mGyEYCl7XYWbV9V6O): American, young adult female
- Josh (TxGEqnHWrfWFTfGW9XjX): American, young adult male
- Rachel (21m00Tcm4TlvDq8ikWAM): American, adult female
- Clyde (2EiwWnXFnvU5JabPnv8n): American, adult male';

-- Grant permissions
GRANT ALL ON chat_config TO authenticated;
GRANT SELECT ON chat_config TO anon;