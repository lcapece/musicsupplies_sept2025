-- Drop the old policy if it exists (optional cleanup)
DROP POLICY IF EXISTS "Allow public read access to tree_view_data_source" ON tree_view_data_source;

-- Create a new policy for the correct table name
CREATE POLICY "Allow public read access to treeview_datasource"
ON treeview_datasource
FOR SELECT
TO public
USING (true);
