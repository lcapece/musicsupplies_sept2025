# Mailgun Configuration Fix Required

## Issues Found

### 1. MAILGUN_DOMAIN Contains an API Key
- **Current Value**: `fc8bcfd6e383bb4b4c36d2c70e75367c2912cd502563...` ❌
- **Should Be**: `mg.musicsupplies.com` ✅

### 2. API Keys Appear Truncated
All your API keys end with `...` which suggests they might be truncated when viewing them in the Supabase dashboard.

## How to Fix

### Step 1: Update MAILGUN_DOMAIN
```bash
supabase secrets set MAILGUN_DOMAIN=mg.musicsupplies.com --project-ref ekklokrukxmqlahtonnc
```

### Step 2: Get Your Full Mailgun API Key
1. Log into [Mailgun Dashboard](https://app.mailgun.com/app/account/security/api_keys)
2. Copy the FULL API key (not truncated)
3. Look for the "Private API key" - it should be a long string without `...`

### Step 3: Update the API Key
```bash
supabase secrets set MAILGUN_SENDING_KEY=your-full-api-key-here --project-ref ekklokrukxmqlahtonnc
```

## What Your Secrets Should Look Like

| Secret Name | Correct Format | Example |
|------------|----------------|---------|
| MAILGUN_DOMAIN | Domain name | `mg.musicsupplies.com` |
| MAILGUN_SENDING_KEY | Full API key | `key-1234567890abcdef1234567890abcdef` or similar |

## Important Notes

1. **Don't use truncated keys** - The `...` at the end means the key is cut off
2. **Domain vs API Key** - Make sure MAILGUN_DOMAIN contains your domain, not an API key
3. **Private vs Public keys** - For sending emails, you need the Private API key

## Quick Test After Fixing

Once you've updated both secrets, test with:

```powershell
$apiKey = "your-full-api-key"
$domain = "mg.musicsupplies.com"
$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("api:$apiKey"))

Invoke-RestMethod -Uri "https://api.mailgun.net/v3/$domain/messages" `
  -Method Post `
  -Headers @{ "Authorization" = "Basic $auth" } `
  -Body @{
    "from" = "Test <noreply@$domain>"
    "to" = "lcapece@optonline.net"
    "subject" = "Test Email"
    "text" = "Testing Mailgun configuration"
  }
```

If this works, your password reset will work too!
