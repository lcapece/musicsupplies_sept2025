/*
  # Create products_supabase table

  1. New Tables
    - `products_supabase`
      - `partnumber` (text, primary key)
      - `description` (text, not null)
      - `price` (real)
      - `inventory` (integer)
      - `prdmetacat` (text)
      - `prdmaincat` (text)
      - `prdsubcat` (text)

  2. Indexes
    - GIN index on description for full-text search
    - B-tree index on price for efficient sorting
    
  3. Security
    - Enable RLS on `products_supabase` table
    - Add policy for public read access
*/

-- Create the products table
CREATE TABLE IF NOT EXISTS products_supabase (
  partnumber text PRIMARY KEY,
  description text NOT NULL,
  price real,
  inventory integer,
  prdmetacat text,
  prdmaincat text,
  prdsubcat text
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_supabase_products_description2 ON products_supabase USING gin (to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_supabase_products_pric2e ON products_supabase USING btree (price);

-- Enable Row Level Security
ALTER TABLE products_supabase ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Enable read access for all users prods" 
  ON products_supabase
  FOR SELECT 
  TO public 
  USING (true);