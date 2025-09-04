-- Create RPC function to bypass PostgREST 1000-row limit
-- This function returns ALL records from pre_products_supabase without any limits

CREATE OR REPLACE FUNCTION get_all_products()
RETURNS SETOF pre_products_supabase AS $$
  SELECT * FROM pre_products_supabase ORDER BY id ASC;
$$ LANGUAGE sql STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_products() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_products() TO anon;
