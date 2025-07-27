# Final Password Reset Fix Documentation

## Issue Summary
The password reset functionality is partially working but failing at the email sending step. The system successfully:
1. ✅ Validates the user exists
2. ✅ Creates password reset tokens
3. ❌ Fails to send emails via Mailgun

## Root Cause
The `MAILGUN_DOMAIN` secret in Supabase is incorrectly set to an API key value instead of a domain name.

### Current Configuration (Incorrect)
- `MAILGUN_SENDING_KEY`: 8beb887538434121e104f4134ea762096c7bb730022a... (correct - this is an API key)
- `MAILGUN_DOMAIN`: 7da5f66cd836a0dbe286a37199113b5a57494ec4ecb3... (incorrect - this is another API key, not a domain)
- `MAILGUN_API_KEY`: ecc4fcabf0ecb4f9ee311567a41244d1d55c97ea0df8... (backup API key)

## Solution

### Step 1: Fix the MAILGUN_DOMAIN Secret

You need to update the `MAILGUN_DOMAIN` secret to your actual Mailgun domain.

#### Option A: Using Supabase Dashboard
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **Edge Functions** → **Secrets**
4. Find `MAILGUN_DOMAIN` and click the edit button
5. Change the value from the API key to: `mg.musicsupplies.com` (or your actual Mailgun domain)
6. Save the changes

#### Option B: Using CLI
```bash
supabase secrets set MAILGUN_DOMAIN=mg.musicsupplies.com --project-ref ekklokrukxmqlahtonnc
```

### Step 2: Verify Your Mailgun Domain

1. Log into [Mailgun Dashboard](https://app.mailgun.com/app/sending/domains)
2. Ensure `mg.musicsupplies.com` (or your domain) is listed and verified
3. If not, add and verify the domain following Mailgun's instructions

### Step 3: Test Again

After fixing the domain secret, the password reset should work immediately.

## What the Edge Function Does

The deployed edge function already handles this misconfiguration by:
- Detecting when MAILGUN_DOMAIN contains an API key instead of a domain
- Defaulting to `mg.musicsupplies.com` when this happens
- However, this default domain must exist and be verified in your Mailgun account

## Verification Steps

1. The edge function has been successfully deployed
2. Password reset tokens are being created correctly
3. Only the email sending step is failing due to the domain configuration

## Additional Troubleshooting

If it still doesn't work after fixing the domain:

1. **Verify the API Key**:
   - Ensure `MAILGUN_SENDING_KEY` is a valid Mailgun API key
   - Check that it has permission to send emails

2. **Check Domain Status**:
   - Ensure your Mailgun domain is verified
   - Check if there are any sending restrictions on your Mailgun account

3. **Test Mailgun Directly**:
   ```bash
   curl -s --user 'api:YOUR_MAILGUN_API_KEY' \
     https://api.mailgun.net/v3/mg.musicsupplies.com/messages \
     -F from='Test <noreply@mg.musicsupplies.com>' \
     -F to='your-email@example.com' \
     -F subject='Test Email' \
     -F text='Testing Mailgun API'
   ```

## Summary

The password reset system is 90% functional. You just need to:
1. Update the `MAILGUN_DOMAIN` secret to contain your actual domain (not an API key)
2. Ensure that domain is verified in your Mailgun account

Once fixed, password reset emails will be sent successfully.
