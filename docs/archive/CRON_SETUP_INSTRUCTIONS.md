# GA4 Polling Cron Job Setup

## Overview
Automated server-side polling for GA4 campaigns runs every minute to sync data.

## Setup Steps

### 1. Enable pg_cron Extension
In Supabase Dashboard → Database → Extensions, enable:
- `pg_cron`
- `pg_net` (if not already enabled)

### 2. Create Cron Job
Run this SQL in Supabase SQL Editor:

```sql
SELECT cron.schedule(
  'poll-ga4-campaigns-every-minute',
  '* * * * *', -- Every minute
  $$
  SELECT net.http_post(
    url:='https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/poll-ga4-campaigns',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3eW12eGhwa3N3aHNpcmRyanViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTY0NDksImV4cCI6MjA3MDU3MjQ0OX0.ToRbUm37-ZnYkmmCfLW7am38rUGgFAppNxcZ2tar9mc"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
```

### 3. Verify Cron Job
```sql
SELECT * FROM cron.job;
```

### 4. Monitor Execution
```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'poll-ga4-campaigns-every-minute')
ORDER BY start_time DESC 
LIMIT 10;
```

## How It Works

1. Cron runs every minute
2. Calls `poll-ga4-campaigns` edge function
3. Function queries campaigns due for polling via `get_campaigns_due_for_polling()`
4. For each campaign, calls `sync-ga4` edge function
5. `sync-ga4` checks quota, fetches GA4 data, creates events

## Campaign Requirements

For automatic polling to work:
- Campaign must have `status = 'active'`
- Campaign must have `data_source = 'ga4'`
- Campaign must have `polling_config.enabled = true`
- Campaign must have valid `website_id`

## Manual Sync

Users can also click "Sync GA4" button on campaign details page for immediate sync.

## Troubleshooting

Check edge function logs:
- `poll-ga4-campaigns` logs: Shows which campaigns were processed
- `sync-ga4` logs: Shows actual GA4 API calls and event creation
