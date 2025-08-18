/*
  # Enable HTTP extension for making HTTP calls from PostgreSQL
  
  This migration enables the http extension needed for calling Edge Functions
  from within database triggers and functions.
*/

-- Enable the http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Enable the net extension (Supabase's wrapper for http)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage on extensions schema to authenticated users
GRANT USAGE ON SCHEMA extensions TO authenticated;

-- Create a wrapper function for easier Edge Function calls
CREATE OR REPLACE FUNCTION call_edge_function(
  p_function_name text,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_response jsonb;
  v_url text;
  v_headers jsonb;
BEGIN
  -- Build the URL for the Edge Function
  v_url := current_setting('app.supabase_url', true) || '/functions/v1/' || p_function_name;
  
  -- Build headers with authentication
  v_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key', true)
  );
  
  -- Make the HTTP request using pg_net
  SELECT
    net.http_post(
      url := v_url,
      headers := v_headers,
      body := p_payload
    ) INTO v_response;
  
  RETURN v_response;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error as JSON
    RETURN jsonb_build_object(
      'error', true,
      'message', SQLERRM
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION call_edge_function(text, jsonb) TO authenticated;