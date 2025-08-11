# Master Password Override System - Complete Implementation

## Overview
A master password system has been implemented that allows authorized personnel (salespeople) to log into any customer account using an override password stored in the PWD table.

## Implementation Details

### Database Components

1. **PWD Table**
   - Contains a single column `pwd` that stores the master password
   - Current master password: `Music123`
   - This password can be used to log into ANY account, including account 999

2. **Stored Procedure: `authenticate_with_master_password`**
   - Location: Database function accessible via Supabase RPC
   - Parameters:
     - `p_account_number` (TEXT): Account number or email address
     - `p_password` (TEXT): Password to authenticate with
   - Returns: JSON object with authentication result

### Authentication Flow

1. **Regular Authentication First**
   - The system first attempts regular authentication with the provided credentials
   - If successful, returns account data with `loginType: "regular"`

2. **Master Password Fallback**
   - If regular authentication fails, checks if the password matches the master password in PWD table
   - If it matches, allows access to the specified account
   - Returns account data with `loginType: "master_password"`

## Usage

### Via Supabase RPC Call
```javascript
const { data, error } = await supabase
  .rpc('authenticate_with_master_password', {
    p_account_number: '999',  // or any account number/email
    p_password: 'Music123'     // master password from PWD table
  });

if (data.success) {
  // Authentication successful
  console.log('Account:', data.account);
  console.log('Login Type:', data.loginType); // 'master_password' or 'regular'
}
```

### Direct API Call
```bash
curl -X POST https://ekklokrukxmqlahtonnc.supabase.co/rest/v1/rpc/authenticate_with_master_password \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "p_account_number": "999",
    "p_password": "Music123"
  }'
```

## Security Considerations

1. **Master Password Storage**
   - The master password is stored in the PWD table in the database
   - Only one master password exists at a time
   - To change the master password: `UPDATE pwd SET pwd = 'NewPassword123';`

2. **Access Control**
   - The stored procedure has SECURITY DEFINER set, allowing it to access the PWD table
   - The function is granted to both `anon` and `authenticated` roles
   - Consider implementing additional access controls in production

3. **Audit Trail**
   - The response includes `loginType` field to distinguish between regular and master password logins
   - Consider implementing audit logging for master password usage

## Testing

Test scripts are available:
- `test_master_password_stored_proc.ps1` - PowerShell test script

### Test Results (Verified)
- ✅ Master password authentication for account 999
- ✅ Master password authentication for other accounts (e.g., 101)
- ✅ Rejection of incorrect passwords
- ✅ Regular password authentication still works

## Use Cases

1. **Sales Support**: Salespeople can log in on behalf of customers to assist with orders
2. **Customer Service**: Support staff can access customer accounts when needed
3. **Emergency Access**: Provides a backdoor for critical account access
4. **Account 999 Access**: Specifically allows access to the admin account (999) without knowing its regular password

## Maintenance

### To Change the Master Password
```sql
UPDATE pwd SET pwd = 'NewMasterPassword123';
```

### To Check Current Master Password (Admin Only)
```sql
SELECT pwd FROM pwd;
```

### To Disable Master Password
```sql
DELETE FROM pwd;
-- Or set to NULL
UPDATE pwd SET pwd = NULL;
```

## Integration with Application

The application can use this stored procedure instead of direct password checking:

```javascript
// In your login function
async function login(accountNumber, password) {
  const { data, error } = await supabase
    .rpc('authenticate_with_master_password', {
      p_account_number: accountNumber,
      p_password: password
    });
  
  if (error || !data.success) {
    // Handle login failure
    return { success: false, error: data?.error || 'Authentication failed' };
  }
  
  // Login successful
  // Store account data and handle based on loginType if needed
  if (data.loginType === 'master_password') {
    // Log or handle master password usage
    console.log('Master password used for account:', data.account.account_number);
  }
  
  return { success: true, account: data.account };
}
```

## Important Notes

1. The master password works for ALL accounts, including special admin accounts like 999
2. The system distinguishes between regular and master password logins via the `loginType` field
3. The master password is stored in plain text in the PWD table (consider encryption in production)
4. Regular account passwords continue to work normally
