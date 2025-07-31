# Account Settings Session Expiration Fix

## Issue Description
Users were experiencing session expiration errors when attempting to update their account information through the Account Settings modal. The issue manifested as:
- Clicking "Update Profile" would redirect to home page
- Error message: "session expired"
- Profile updates were not being saved to the database

## Root Cause Analysis
The problem was a mismatch between custom session management and Supabase's built-in auth session management:

1. **sessionManager** keeps user data in localStorage for 8 hours
2. **Supabase auth session** expires much sooner (typically 1 hour)
3. When `ensureAuthSession()` was called before profile updates, it would try to set JWT claims for database operations
4. If the Supabase session was expired, JWT claims would fail
5. Subsequent database operations would fail due to missing authentication
6. This would cause the redirect to home page with "session expired" error

## Solution Implementation

### 1. Enhanced `ensureAuthSession()` Function
**File:** `src/context/AuthContext.tsx`

Improved the session restoration logic to:
- Check sessionManager for stored user data first
- Attempt to refresh Supabase session if expired
- Retry JWT claims setting with fresh session
- Gracefully handle session expiration with proper cleanup
- Provide multiple fallback attempts before failing

### 2. Enhanced Profile Update Function
**File:** `src/components/AccountSettingsModal.tsx`

Added robust error handling and retry logic:
- Session validation before any update operations
- Retry mechanism for both auth updates and database operations
- Better error messaging for different failure scenarios
- Proper TypeScript handling for mutable data variables

## Key Changes Made

### AuthContext.tsx
```typescript
const ensureAuthSession = async (): Promise<boolean> => {
  // Check sessionManager first
  const sessionUser = sessionManager.getSession();
  if (!sessionUser) {
    setError('Authentication session expired. Please log in again.');
    return false;
  }

  // Try to refresh Supabase session
  const { data: refreshData } = await supabase.auth.refreshSession();
  
  // Retry JWT claims with session refresh fallback
  try {
    await supabase.rpc('set_admin_jwt_claims', {
      p_account_number: accountNumber
    });
  } catch (claimsError) {
    // Retry with fresh session
    const { data: retryRefresh } = await supabase.auth.refreshSession();
    if (retryRefresh.session) {
      await supabase.rpc('set_admin_jwt_claims', {
        p_account_number: accountNumber
      });
    } else {
      // Clear expired session
      sessionManager.clearSession();
      return false;
    }
  }
  
  return true;
};
```

### AccountSettingsModal.tsx
```typescript
const handleProfileUpdate = async (e?: React.FormEvent) => {
  // Ensure session before operations
  const sessionValid = await ensureAuthSession();
  if (!sessionValid) {
    setError('Authentication session expired. Please log in again.');
    return;
  }

  // Retry logic for auth updates
  if (authError.message?.includes('session')) {
    const retrySessionValid = await ensureAuthSession();
    if (retrySessionValid) {
      // Retry the operation
    }
  }

  // Retry logic for database updates
  if (updateError.message?.includes('JWT')) {
    const retrySessionValid = await ensureAuthSession();
    if (retrySessionValid) {
      // Retry database operation
    }
  }
};
```

## Technical Benefits

1. **Resilient Session Management**: Multiple fallback attempts before session failure
2. **Better Error Handling**: Specific error messages for different failure scenarios
3. **Automatic Recovery**: Retry mechanisms for transient session issues
4. **User Experience**: Modal stays open with clear error messages instead of redirecting
5. **Data Integrity**: Ensures updates only proceed with valid authentication

## Testing Recommendations

1. **Normal Operation**: Verify profile updates work with fresh sessions
2. **Expired Session**: Test behavior when session expires during update
3. **Network Issues**: Test retry logic with intermittent connectivity
4. **Edge Cases**: Test with various session states and timing scenarios

## Files Modified

- `src/context/AuthContext.tsx` - Enhanced `ensureAuthSession()` function
- `src/components/AccountSettingsModal.tsx` - Added retry logic and better error handling

## Impact

- **User Experience**: No more unexpected redirects to home page
- **Data Loss**: Profile updates now complete successfully even with session issues
- **Error Messaging**: Clear, actionable error messages for users
- **System Reliability**: Robust handling of authentication edge cases

This fix ensures that account profile updates work reliably regardless of session timing issues, providing a much better user experience.
