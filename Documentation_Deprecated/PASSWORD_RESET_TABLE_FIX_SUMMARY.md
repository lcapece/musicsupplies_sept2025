# Password Reset Table Fix Summary

## Issue Description
Account 105 with email address `lcapece@optonline.net` was unable to reset their password. The console showed an error:
- **Error Code**: 42P01
- **Error Message**: "relation 'public.users' does not exist"

## Root Cause
The password reset system was trying to query a non-existent `users` table instead of the actual `accounts_lcmd` table where user data is stored.

## Files Fixed

### 1. src/pages/ForgotPasswordPage.tsx
**Line 83 - User lookup query**

**Before:**
```javascript
const { data: userData, error: userError } = await supabase
  .from('users')
  .select('email, acct_name')
  .eq('email', email)
  .single();
```

**After:**
```javascript
const { data: userData, error: userError } = await supabase
  .from('accounts_lcmd')
  .select('email_address, acct_name')
  .eq('email_address', email)
  .single();
```

### 2. src/pages/UpdatePasswordPage.tsx
**Line 107 - Password update query**

**Before:**
```javascript
const { error: updateError } = await supabase
  .from('users')
  .update({ password: password })
  .eq('email', userEmail);
```

**After:**
```javascript
const { error: updateError } = await supabase
  .from('accounts_lcmd')
  .update({ password: password })
  .eq('email_address', userEmail);
```

## Key Changes
1. Changed table name from `users` to `accounts_lcmd`
2. Changed email column name from `email` to `email_address`
3. Ensured consistency across both password reset pages

## Testing Instructions
1. Navigate to the login page
2. Click "Forgot Password?"
3. Enter `lcapece@optonline.net` (or any valid email from accounts_lcmd table)
4. Check email for reset link
5. Click the reset link
6. Enter new password and confirm
7. Verify password update succeeds
8. Test login with new password

## Impact
This fix resolves the password reset functionality for all users with email addresses in the system, including account 105. The system now correctly queries the `accounts_lcmd` table where user account information is actually stored.
