# Password Reset Troubleshooting Guide

## Issue: Browser Showing Old Code
The browser console shows errors referencing a non-existent `users` table, even though the code has been updated to use `accounts_lcmd`.

## Solution Steps:

### 1. Clear Browser Cache
**For Chrome/Edge:**
- Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
- Select "Cached images and files"
- Click "Clear data"

**Alternative - Hard Refresh:**
- Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Or hold `Shift` and click the refresh button

### 2. Check Development Server
If using a development server:
```bash
# Stop the server (Ctrl+C)
# Restart it
npm run dev
```

### 3. Verify Database Setup
Run these queries in your Supabase SQL editor:

```sql
-- 1. Check if password_reset_tokens table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'password_reset_tokens'
) as table_exists;

-- 2. If table doesn't exist, run:
-- Execute the contents of create_password_reset_tokens_table.sql

-- 3. Verify account 105 has an email
SELECT account_number, acct_name, email_address 
FROM accounts_lcmd 
WHERE account_number = 105;
```

### 4. Check for Service Workers
In Chrome DevTools:
1. Go to Application tab
2. Click on "Service Workers" 
3. Click "Unregister" for any workers
4. Check "Storage" → "Clear site data"

### 5. Verify Code Changes
The updated code should look like this:

**ForgotPasswordPage.tsx (line ~75):**
```javascript
const { data: userData, error: userError } = await supabase
  .from('accounts_lcmd')  // NOT 'users'
  .select('email_address, acct_name')  // NOT 'email'
  .eq('email_address', email)  // NOT 'email'
  .single();
```

**UpdatePasswordPage.tsx (line ~107):**
```javascript
const { error: updateError } = await supabase
  .from('accounts_lcmd')  // NOT 'users'
  .update({ password: password })
  .eq('email_address', userEmail);  // NOT 'email'
```

### 6. Check Network Tab
1. Open DevTools Network tab
2. Try the password reset again
3. Look for the request to Supabase
4. Check if it's querying the correct table

### 7. Deployment Considerations
If this is deployed:
- Ensure the latest code is deployed
- Check if there's a CDN caching old files
- Verify the build process completed successfully

## Common Issues:

### "relation 'public.users' does not exist"
- **Cause**: Code is trying to query non-existent `users` table
- **Fix**: Ensure code uses `accounts_lcmd` table

### "Token cleanup warning"
- **Cause**: Normal if password_reset_tokens table doesn't exist yet
- **Fix**: Run the create_password_reset_tokens_table.sql migration

### Email not sending
- **Cause**: Mailgun configuration or rate limiting
- **Fix**: Check Mailgun credentials and API limits

## Testing After Fixes:
1. Clear all browser data
2. Restart development server
3. Navigate to login page in incognito/private window
4. Click "Forgot Password?"
5. Enter: lcapece@optonline.net
6. Check browser console for errors
7. Check email for reset link
