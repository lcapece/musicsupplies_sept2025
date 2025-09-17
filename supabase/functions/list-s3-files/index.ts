import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { S3Client, ListObjectsV2Command } from 'https://esm.sh/@aws-sdk/client-s3@3.550.0'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get AWS credentials from Supabase Edge Vault
    const AWS_ACCESS_KEY_ID = Deno.env.get('AWS_ACCESS_KEY_ID')
    const AWS_SECRET_ACCESS_KEY = Deno.env.get('AWS_SECRET_ACCESS_KEY')
    const AWS_REGION = Deno.env.get('AWS_REGION') || 'us-east-1'
    
    // Log credential status (without exposing actual values)
    console.log('AWS credential check:', {
      hasAccessKey: !!AWS_ACCESS_KEY_ID,
      hasSecretKey: !!AWS_SECRET_ACCESS_KEY,
      region: AWS_REGION,
      accessKeyLength: AWS_ACCESS_KEY_ID?.length || 0,
      secretKeyLength: AWS_SECRET_ACCESS_KEY?.length || 0,
    })
    
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS credentials not found in Edge Vault. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.')
    }

    // Create S3 client
    const s3Client = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    })

    // List objects in the mus86077 bucket
    const command = new ListObjectsV2Command({
      Bucket: 'mus86077',
      MaxKeys: 1000, // Get up to 1000 files at a time
    })

    console.log('Attempting to list S3 objects...')
    const response = await s3Client.send(command)
    
    // Transform S3 response to our format
    const files = (response.Contents || []).map(obj => ({
      filename: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified?.toISOString(),
    }))

    console.log(`Listed ${files.length} files from S3 bucket mus86077`)

    return new Response(
      JSON.stringify({
        files: files,
        bucket: 'mus86077',
        count: files.length,
        region: AWS_REGION,
        message: `Successfully retrieved ${files.length} files from S3`,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60', // Cache for 1 minute
        },
      }
    )
  } catch (error) {
    console.error('Error in list-s3-files function:', error)
    
    // Provide detailed error information
    const errorDetails = {
      error: error.message || 'Failed to list S3 files',
      errorType: error.constructor.name,
      hint: 'Make sure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set in Supabase Edge Function secrets',
      credentialCheck: {
        hasAccessKey: !!Deno.env.get('AWS_ACCESS_KEY_ID'),
        hasSecretKey: !!Deno.env.get('AWS_SECRET_ACCESS_KEY'),
        hasRegion: !!Deno.env.get('AWS_REGION'),
      },
    }
    
    // Add S3-specific error details if available
    if (error.$metadata) {
      errorDetails.s3Error = {
        statusCode: error.$metadata.httpStatusCode,
        requestId: error.$metadata.requestId,
        cfId: error.$metadata.cfId,
      }
    }
    
    return new Response(
      JSON.stringify(errorDetails),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  }
})
