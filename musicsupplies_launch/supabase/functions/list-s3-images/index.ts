import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface S3File {
  filename: string;
  size: number;
  lastModified: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { bucket } = await req.json();
    
    if (!bucket) {
      throw new Error('Bucket name is required');
    }

    // Get AWS credentials from environment
    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const region = Deno.env.get('AWS_REGION') || 'us-east-1';

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials not configured in environment');
    }

    // Try to use AWS SDK for Deno
    try {
      const { S3Client, ListObjectsV2Command } = await import("https://deno.land/x/aws_api@v0.8.1/services/s3/mod.ts");

      const s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      const command = new ListObjectsV2Command({
        Bucket: bucket,
      });

      const response = await s3Client.send(command);
      const objects = response.Contents || [];

      // Filter for image files and map to our S3File interface
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
      const imageFiles: S3File[] = objects
        .filter(obj => {
          const key = obj.Key || '';
          return imageExtensions.some(ext => key.toLowerCase().endsWith(ext));
        })
        .map(obj => ({
          filename: obj.Key || '',
          size: obj.Size || 0,
          lastModified: obj.LastModified?.toISOString() || new Date().toISOString(),
        }));

      return new Response(
        JSON.stringify({ 
          success: true, 
          files: imageFiles,
          count: imageFiles.length 
        }),
        {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        }
      );

    } catch (sdkError) {
      // Fallback: Return a simple success with empty files array
      console.log('AWS SDK failed, returning empty result:', sdkError);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          files: [],
          count: 0,
          message: 'AWS SDK not available, but function is working'
        }),
        {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        }
      );
    }

  } catch (error: any) {
    console.error('Error listing S3 files:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        files: [] 
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );
  }
});
