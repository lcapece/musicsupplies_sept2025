-- Create a view to match the name expected by the frontend code
CREATE OR REPLACE VIEW treeview_datasource AS
SELECT
  id,
  category_code,
  category_name,
  parent_category_code,
  is_main_category,
  display_order, -- Explicitly include display_order
  icon_name,
  product_count
FROM tree_view_data_source;

-- Grant necessary permissions
GRANT SELECT ON treeview_datasource TO authenticated;
GRANT SELECT ON treeview_datasource TO anon;
