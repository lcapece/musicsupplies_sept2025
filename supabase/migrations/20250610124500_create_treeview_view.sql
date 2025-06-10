-- Create a view to match the name expected by the frontend code
CREATE OR REPLACE VIEW treeview_datasource AS
SELECT * FROM tree_view_data_source;

-- Grant necessary permissions
GRANT SELECT ON treeview_datasource TO authenticated;
GRANT SELECT ON treeview_datasource TO anon;
