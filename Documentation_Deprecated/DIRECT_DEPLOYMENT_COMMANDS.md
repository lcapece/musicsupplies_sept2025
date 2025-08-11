# Direct Commands to Deploy the Edge Function

Since the batch scripts had issues, here are the direct commands to run:

## Step 1: Link to your project (if not already linked)
```bash
supabase link --project-ref=ekklokrukxmqlahtonnc
```

## Step 2: Deploy the edge function
```bash
supabase functions deploy list-s3-files --no-verify-jwt --project-ref=ekklokrukxmqlahtonnc
```

## If you get errors about Docker:
Add the `--legacy-bundle` flag to bypass Docker:
```bash
supabase functions deploy list-s3-files --no-verify-jwt --project-ref=ekklokrukxmqlahtonnc --legacy-bundle
```

## Alternative: Manual Dashboard Deployment

1. Go to https://app.supabase.com/project/ekklokrukxmqlahtonnc/functions
2. Click "Create a new function"
3. Name it: `list-s3-files`
4. Copy ALL the code from `supabase/functions/list-s3-files/index.ts`
5. Paste it in the editor
6. Click "Deploy"

Once deployed, the CORS error will be resolved and the Image Management tab will work.
