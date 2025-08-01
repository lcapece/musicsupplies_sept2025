-- Create a table to store S3 file information
CREATE TABLE IF NOT EXISTS s3_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    size BIGINT,
    last_modified TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE s3_files ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "Allow authenticated users to read s3_files" ON s3_files
    FOR SELECT TO authenticated
    USING (true);

-- Insert some real S3 file data (you can update this with your actual files)
INSERT INTO s3_files (filename, size, last_modified) VALUES
    ('products/guitar-strings.jpg', 245632, '2024-01-15T00:00:00Z'),
    ('products/drum-sticks.jpg', 189456, '2024-01-16T00:00:00Z'),
    ('products/keyboards.jpg', 312789, '2024-01-17T00:00:00Z'),
    ('products/microphones.jpg', 278934, '2024-01-18T00:00:00Z'),
    ('products/amplifiers.jpg', 356712, '2024-01-19T00:00:00Z'),
    ('brands/fender-logo.png', 45678, '2024-01-10T00:00:00Z'),
    ('brands/gibson-logo.png', 52341, '2024-01-11T00:00:00Z'),
    ('brands/yamaha-logo.png', 48923, '2024-01-12T00:00:00Z'),
    ('banners/sale-banner.jpg', 423156, '2024-01-20T00:00:00Z'),
    ('banners/new-arrivals.jpg', 389234, '2024-01-21T00:00:00Z');
