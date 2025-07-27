/*
  # Create product subgroups table

  1. New Tables
    - `lcmd_product_subgroups`
      - `prdmetagrp` (text)
      - `prdmaingrp` (text)
      - `prdsubgrp` (text)
      - `created_at` (timestamp with time zone)

  2. Security
    - Enable RLS on `lcmd_product_subgroups` table
    - Add policy for public read access
*/

CREATE TABLE IF NOT EXISTS lcmd_product_subgroups (
  prdmetagrp text,
  prdmaingrp text,
  prdsubgrp text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_product_subgroups_metagrp ON lcmd_product_subgroups(prdmetagrp);
CREATE INDEX IF NOT EXISTS idx_product_subgroups_maingrp ON lcmd_product_subgroups(prdmaingrp);
CREATE INDEX IF NOT EXISTS idx_product_subgroups_subgrp ON lcmd_product_subgroups(prdsubgrp);

-- Enable Row Level Security
ALTER TABLE lcmd_product_subgroups ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Enable read access for all users"
  ON lcmd_product_subgroups
  FOR SELECT
  TO public
  USING (true);