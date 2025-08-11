# Password Change Modal Fix Summary

## Issue
Users with `requires_password_change: true` (like account 50494) could not change their password. The password change modal was showing "Auth session missing!" error.

## Root Cause
The application uses a custom authentication system with the `accounts_lcmd` and `logon_lcmd` tables, but the PasswordChangeModal was trying to use Supabase Auth's `updateUser` method. Users who need to change their password don't have a Supabase auth session established.

## Solution
Updated the PasswordChangeModal to use the custom database function `update_user_password_lcmd` instead of Supabase Auth.

### Key Changes in `src/components/PasswordChangeModal.tsx`:

1. Replaced Supabase Auth update with custom RPC call:
```javascript
// Step 1: Update password using the custom authentication system
const { data: passwordUpdateData, error: passwordError } = await supabase.rpc('update_user_password_lcmd', {
  p_account_number: parseInt(accountData.accountNumber),
  p_new_password: newPassword
});
```

2. The `update_user_password_lcmd` function handles:
   - Updating password in `logon_lcmd` table
   - Setting `requires_password_change` to false in `accounts_lcmd` table

## Testing
To test the fix:
1. Log in with an account that has `requires_password_change: true`
2. The password change modal should appear
3. Enter a new password and other details
4. Click "Update Details"
5. The password should be updated successfully and the user should be logged in

## Technical Details
The custom authentication system consists of:
- `accounts_lcmd` table: Stores account information
- `logon_lcmd` table: Stores passwords
- `authenticate_user_lcmd` function: Handles login
- `update_user_password_lcmd` function: Handles password updates

This approach maintains consistency with the application's custom authentication architecture.
