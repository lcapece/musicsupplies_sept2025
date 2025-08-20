import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  // CORS headers for all requests
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control, pragma',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // SERVER-SIDE VERSION CHECK - ALWAYS UP TO DATE
    // This bypasses the chicken-and-egg cache problem
    // because it's served from Supabase Edge Functions (never cached)
    
    // In production, you would read from your deployment's package.json
    // For now, we'll return the current version from environment or hardcode latest
    const currentVersion = Deno.env.get('CURRENT_VERSION') || 'RC820.1449';
    
    const versionData = {
      version: currentVersion,
      timestamp: new Date().toISOString(),
      build: Date.now(),
      source: 'server-side-edge-function'
    };

    return new Response(
      JSON.stringify(versionData),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Version check failed',
        details: error.message
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      },
    )
  }
})