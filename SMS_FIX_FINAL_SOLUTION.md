# SMS Fix - 401 Unauthorized Issue

## Problem Identified
The ad hoc SMS messages are not reaching ClickSend because the Supabase edge function is returning a 401 Unauthorized error. This prevents the request from even reaching the ClickSend API.

## Root Cause
The edge function requires JWT verification, but either:
1. The anon key has changed/expired
2. The edge function needs to be configured to allow public access
3. The authentication headers aren't being sent correctly from the frontend

## Immediate Solutions

### Option 1: Check Current Supabase Keys (RECOMMENDED)
1. Go to your Supabase Dashboard
2. Navigate to Settings → API
3. Copy the current `anon` public key
4. Update it in your frontend code (`src/lib/supabase.ts`)

### Option 2: Disable JWT Verification for SMS Functions
The edge functions are currently set with `verify_jwt: true`. For ad hoc SMS, you might want to disable this:

1. In Supabase Dashboard, go to Edge Functions
2. Click on `send-admin-sms`
3. Update the function settings to set `verify_jwt: false`
4. This allows public access to the SMS endpoint

### Option 3: Use Service Role Key (More Secure)
If you want to keep JWT verification:
1. Create a secure backend service that uses the service role key
2. Have your frontend call this backend service
3. The backend service then calls the edge function with proper auth

## Testing the Fix

After implementing one of the above solutions, test with:
```powershell
.\test_sms_direct.ps1
```

## Why ClickSend Authentication Works
Your ClickSend credentials are correct (balance: 15.78), but the SMS never reaches ClickSend because Supabase blocks the request with 401 error.

## Next Steps
1. Check and update the Supabase anon key in your frontend
2. Or disable JWT verification for the SMS edge functions
3. Test again with the provided scripts
