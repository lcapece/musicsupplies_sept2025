# CRITICAL SMS FIX FOR SOUTH AFRICA - URGENT

## Issue
Ad hoc SMS sending is not working, which is critical for children in South Africa.

## Root Cause
The ClickSend authentication credentials may not be properly set in the Supabase edge function environment variables.

## Solution

### 1. Verify Authentication Format
The authentication is correctly implemented in the edge functions:
```javascript
const auth = btoa(`${username}:${apiKey}`);
```
This concatenates username:apikey and base64 encodes it, which is the correct format.

### 2. Update Supabase Edge Function Environment Variables

**CRITICAL: These must be set in the Supabase Dashboard:**

1. Go to Supabase Dashboard > Edge Functions
2. Click on both `send-admin-sms` and `send-customer-sms` functions
3. Add/Update these environment variables:
   - `CLICKSEND_USERNAME` = `lcapece@optonline.net`
   - `CLICKSEND_API_KEY` = `EE8B20BD-7C92-2FB1-3AE0-16C2AB80B814`

### 3. Test the Authentication
Run the provided test script:
```powershell
.\test_clicksend_auth.ps1
```

### 4. Phone Number Format
Ensure South African phone numbers include the country code:
- Format: `+27XXXXXXXXX` (where +27 is South Africa's country code)
- Example: `+27123456789`

### 5. Debug Steps
1. Check Supabase edge function logs for any errors
2. Verify the credentials are correct with ClickSend
3. Ensure the ClickSend account has SMS credits
4. Check if the sender ID "MusicSupplies" is approved for South Africa

## Emergency Contact
If SMS still fails after these steps:
1. Check ClickSend dashboard for any account issues
2. Contact ClickSend support regarding South Africa SMS delivery
3. Consider using an alternative SMS gateway for South Africa if needed

## Code Verification
The authentication code in both edge functions is correct:
- `supabase/functions/send-admin-sms/index.ts` - ✓ Correct
- `supabase/functions/send-customer-sms/index.ts` - ✓ Correct

The issue is likely with the environment variables not being set in Supabase.
