-- Create function to truncate the stg_update_skus table
CREATE OR REPLACE FUNCTION public.truncate_stg_update_skus()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Truncate the staging table
  TRUNCATE TABLE public.stg_update_skus;
END;
$$;

-- Ensure execute permission is granted
GRANT EXECUTE ON FUNCTION public.truncate_stg_update_skus() TO anon, authenticated;

-- Ensure the function is owned by postgres (important for SECURITY DEFINER)
ALTER FUNCTION public.truncate_stg_update_skus() OWNER TO postgres;
