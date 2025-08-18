# Cleanup Abandoned Orders Function

This Edge Function cleans up abandoned orders that are older than 12 hours.

## Setup

1. Deploy the function:
```bash
supabase functions deploy cleanup-abandoned-orders
```

2. Set up a cron job to run this function hourly. You can do this in the Supabase dashboard:
   - Go to Database → Extensions
   - Enable pg_cron if not already enabled
   - Go to SQL Editor and run:

```sql
-- Schedule the cleanup job to run every hour
SELECT cron.schedule(
  'cleanup-abandoned-orders',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/cleanup-abandoned-orders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_ANON_KEY'
    ),
    body := jsonb_build_object('trigger', 'cron')
  );
  $$
);
```

Replace:
- `YOUR_PROJECT_ID` with your actual Supabase project ID
- `YOUR_ANON_KEY` with your project's anon key

## Manual Trigger

You can also trigger the cleanup manually:

```bash
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/cleanup-abandoned-orders \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## What it does

- Finds all orders with status 'Reserved' that are older than 12 hours
- Updates their status to 'Abandoned'
- Sets the abandoned_at timestamp
- Returns the count of abandoned orders