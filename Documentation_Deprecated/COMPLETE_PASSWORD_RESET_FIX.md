# Complete Password Reset Fix Guide

## Problem Summary

The password reset functionality fails with a 401 Unauthorized error when attempting to send emails via Mailgun. The edge function cannot authenticate with Mailgun API.

## Root Causes

1. **Missing Mailgun Secret**: The `MAILGUN_SENDING_KEY` secret is not set in the Supabase project
2. **Environment Variable Mismatch**: The edge function was looking for the wrong environment variable name

## Complete Solution

### Step 1: Verify and Set Mailgun Secrets

You need to set the Mailgun secrets in your Supabase project. There are two ways to do this:

#### Option A: Using Supabase Dashboard (Recommended)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **Edge Functions**
4. Click on **Add new secret**
5. Add these secrets:
   - Name: `MAILGUN_SENDING_KEY`
   - Value: Your Mailgun API key (starts with `key-`)
   - Name: `MAILGUN_DOMAIN` (optional)
   - Value: `mg.musicsupplies.com` (or your configured domain)

#### Option B: Using Supabase CLI

```bash
# Set the Mailgun API key
supabase secrets set MAILGUN_SENDING_KEY=your-actual-mailgun-api-key --project-ref ekklokrukxmqlahtonnc

# Optionally set the domain
supabase secrets set MAILGUN_DOMAIN=mg.musicsupplies.com --project-ref ekklokrukxmqlahtonnc

# List all secrets to verify
supabase secrets list --project-ref ekklokrukxmqlahtonnc
```

### Step 2: Edge Function Code (Already Updated)

The edge function has been updated to:
- Look for the correct environment variable name (`MAILGUN_SENDING_KEY`)
- Try multiple possible secret names as fallback
- Provide better error logging
- Handle authentication errors gracefully

### Step 3: Test the Password Reset

1. Navigate to the login page
2. Click "Forgot Password?"
3. Enter a valid email address from the database
4. Click "Send Reset Link"
5. Check the email for the reset link

### Step 4: Troubleshooting

If you still get errors:

1. **Check Mailgun Configuration**:
   - Verify your Mailgun API key is correct
   - Ensure the domain is verified in Mailgun
   - Check if the API key has permission to send emails

2. **Verify Edge Function Deployment**:
   ```bash
   supabase functions list --project-ref ekklokrukxmqlahtonnc
   ```
   Should show `send-mailgun-email` as ACTIVE

3. **Check Edge Function Logs**:
   - Go to Supabase Dashboard → Functions → send-mailgun-email → Logs
   - Look for error messages about missing environment variables

4. **Test Mailgun Directly**:
   ```bash
   curl -s --user 'api:YOUR_MAILGUN_API_KEY' \
     https://api.mailgun.net/v3/mg.musicsupplies.com/messages \
     -F from='Test <noreply@mg.musicsupplies.com>' \
     -F to='your-email@example.com' \
     -F subject='Test Email' \
     -F text='Testing Mailgun API'
   ```

## What Was Fixed

1. ✅ Updated edge function to use correct environment variable name
2. ✅ Added fallback checks for multiple possible secret names
3. ✅ Improved error logging and debugging capabilities
4. ⚠️ You still need to set the Mailgun secrets in Supabase

## Next Steps

**IMPORTANT**: The main issue is that the Mailgun API key is not set in your Supabase project. You must:

1. Get your Mailgun API key from [Mailgun Dashboard](https://app.mailgun.com/app/account/security/api_keys)
2. Set it in Supabase using one of the methods above
3. Test the password reset functionality again

Once the secret is properly set, the password reset emails will work correctly.
