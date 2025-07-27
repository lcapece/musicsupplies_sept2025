# Test Accounts for New Login System

## Test Account 99 (SKU Import Admin)
- Account Number: 99
- Account Name: SKU Import Admin
- Password: sku_import_admin
- Special: This account has access to the SKU Import functionality

## Test Account 101 (All Music)
- Account Number: 101
- Account Name: All Music
- ZIP: 11803
- Current Password: Monday123$ (stored in logon_lcmd)
- Default Password: a11803 (first letter + first 5 digits of zip, case insensitive)

## Test Account 102 (Music World Inc.)
- Account Number: 102
- Account Name: Music World Inc.
- ZIP: 60601
- Default Password: m60601 (first letter + first 5 digits of zip, case insensitive)

## How the New System Works:

1. **First Login Attempt**: User enters account number and password
2. **Database Check**: System checks `logon_lcmd` table for stored password
3. **If Found**: Validates against stored password
4. **If Not Found**: Checks if password matches default pattern (first letter of account name + first 5 digits of zip code)
5. **Default Password Match**: Sets `requires_password_change = true` and shows password change modal
6. **Password Change**: New password is stored in `logon_lcmd` table, `requires_password_change` set to false
7. **Future Logins**: Password validated against `logon_lcmd` table

## Testing Steps:

### For Account 101:
1. Try logging in with account 101 using password "Monday123$" - should work and go directly to dashboard
2. OR try logging in with account 101 using password "a11803" - should show password change modal
3. If password change modal appears, set new password and should navigate to dashboard
4. Log out and log back in with new password - should go directly to dashboard

### For Account 102:
1. Try logging in with account 102 using password "m60601"
2. Should show password change modal
3. Set new password (e.g., "newpassword123")
4. Should navigate to dashboard
5. Log out and log back in with new password
6. Should go directly to dashboard without password change modal

## Notes:
- Account 101 already has a password stored in logon_lcmd table (Monday123$)
- Account 102 will use the default password logic until a password is set
- **IMPORTANT**: Default passwords use only the first 5 digits of ZIP codes (excludes ZIP+4 extensions)
