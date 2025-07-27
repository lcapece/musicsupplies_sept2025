-- Fix Tree View Data Source table access
GRANT SELECT ON tree_view_data_source TO authenticated;
GRANT SELECT ON tree_view_data_source TO anon;

-- Update security policy to ensure proper access
ALTER TABLE tree_view_data_source ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to tree_view_data_source"
ON tree_view_data_source
FOR SELECT
TO public
USING (true);
