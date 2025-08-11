# Manual S3 Edge Function Setup (No Docker Required)

If you can't use Docker Desktop, you can create the edge function directly in the Supabase Dashboard.

## Steps:

### 1. Go to Supabase Dashboard
- Navigate to your project at https://app.supabase.com
- Go to "Functions" in the left sidebar

### 2. Create New Function
- Click "Create a new function"
- Name it: `list-s3-files`
- Click "Create function"

### 3. Copy the Edge Function Code
Copy this entire code block and paste it into the function editor:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { S3Client, ListObjectsV2Command } from 'https://esm.sh/@aws-sdk/client-s3@3.245.0'

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
    // Get AWS credentials from environment variables
    const AWS_ACCESS_KEY_ID = Deno.env.get('AWS_ACCESS_KEY_ID')
    const AWS_SECRET_ACCESS_KEY = Deno.env.get('AWS_SECRET_ACCESS_KEY')
    const AWS_REGION = Deno.env.get('AWS_REGION') || 'us-east-1'
    const S3_BUCKET_NAME = 'mus86077'

    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS credentials not configured')
    }

    // Create S3 client
    const s3Client = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    })

    // List all objects in the bucket
    const files = []
    let continuationToken = undefined

    do {
      const command = new ListObjectsV2Command({
        Bucket: S3_BUCKET_NAME,
        ContinuationToken: continuationToken,
        MaxKeys: 1000, // Fetch up to 1000 at a time
      })

      const response = await s3Client.send(command)
      
      if (response.Contents) {
        for (const object of response.Contents) {
          if (object.Key && object.Size !== undefined && object.LastModified) {
            files.push({
              filename: object.Key,
              size: object.Size,
              lastModified: object.LastModified.toISOString(),
            })
          }
        }
      }

      continuationToken = response.NextContinuationToken
    } while (continuationToken)

    console.log(`Successfully fetched ${files.length} files from S3 bucket ${S3_BUCKET_NAME}`)

    return new Response(
      JSON.stringify({
        files,
        bucket: S3_BUCKET_NAME,
        count: files.length,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        },
      }
    )
  } catch (error) {
    console.error('Error listing S3 files:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to list S3 files',
      }),
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
```

### 4. Save and Deploy
- Click "Save"
- Click "Deploy"

### 5. Add Environment Variables
In the function settings, add these secrets:
- `AWS_ACCESS_KEY_ID` = your AWS access key
- `AWS_SECRET_ACCESS_KEY` = your AWS secret key
- `AWS_REGION` = us-east-1 (or your bucket region)

### 6. Test
Go back to your admin dashboard and click "Create source files" - it should now work!

## Alternative: Use Supabase CLI Remote Deploy

If you prefer command line but don't want Docker:

```bash
# Link to your remote project
supabase link --project-ref your-project-ref

# Deploy directly to remote (bypasses Docker)
supabase functions deploy list-s3-files --no-verify-jwt

# Set secrets on remote
supabase secrets set AWS_ACCESS_KEY_ID=your-key --project-ref your-project-ref
supabase secrets set AWS_SECRET_ACCESS_KEY=your-secret --project-ref your-project-ref
supabase secrets set AWS_REGION=us-east-1 --project-ref your-project-ref
