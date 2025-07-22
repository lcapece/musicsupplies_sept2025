# Mailgun API Key Issue - Password Reset Not Working

## Problem Identified
The password reset functionality is failing because the Mailgun API key stored in Supabase is **invalid or expired**.

### Test Results
- API Key tested: `8beb887538434121e104f4134ea762096c7bb730022a` 
- Domain: `mg.musicsupplies.com` ✅ (correctly configured)
- Error: **401 Unauthorized** ❌

## What's Working
1. ✅ Password reset tokens are being created correctly
2. ✅ The edge function is deployed and running
3. ✅ The MAILGUN_DOMAIN is now correctly set to `mg.musicsupplies.com`

## What's Not Working
❌ The Mailgun API key (`MAILGUN_SENDING_KEY`) is invalid or expired

## Solution Required

### Step 1: Get a Valid Mailgun API Key
1. Log into your [Mailgun Dashboard](https://app.mailgun.com/app/account/security/api_keys)
2. Look for your API keys (they usually start with `key-` or are long alphanumeric strings)
3. If no valid keys exist, create a new one
4. Make sure the key has "Sending" permissions

### Step 2: Update the API Key in Supabase
```bash
supabase secrets set MAILGUN_SENDING_KEY=your-new-api-key --project-ref ekklokrukxmqlahtonnc
```

Or via the Supabase Dashboard:
1. Go to Settings → Edge Functions → Secrets
2. Update `MAILGUN_SENDING_KEY` with your new API key

### Step 3: Verify Domain Status
While you're in Mailgun:
1. Check that `mg.musicsupplies.com` is listed in your domains
2. Ensure it's verified (green checkmark)
3. If not verified, follow Mailgun's DNS verification steps

## Quick Test
After updating the API key, you can test it directly:

```powershell
$apiKey = "your-new-api-key"
$domain = "mg.musicsupplies.com"
$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("api:$apiKey"))

Invoke-RestMethod -Uri "https://api.mailgun.net/v3/$domain/messages" `
  -Method Post `
  -Headers @{ "Authorization" = "Basic $auth" } `
  -Body @{
    "from" = "Test <noreply@$domain>"
    "to" = "your-email@example.com"
    "subject" = "Test Email"
    "text" = "Testing Mailgun API"
  }
```

## Summary
The password reset system is fully functional except for the Mailgun API key. Once you update the `MAILGUN_SENDING_KEY` secret with a valid API key from your Mailgun account, password reset emails will start working immediately.
