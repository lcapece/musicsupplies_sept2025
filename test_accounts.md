# Test Accounts for New Login System

## Test Account 101 (Joe's Music Store)
- Account Number: 101
- Account Name: Joe's Music Store
- ZIP: 62701
- Default Password: j62701 (first letter + zip, case insensitive)

## Test Account 102 (Music World Inc.)
- Account Number: 102
- Account Name: Music World Inc.
- ZIP: 60601
- Default Password: m60601 (first letter + zip, case insensitive)

## How the New System Works:

1. **First Login Attempt**: User enters account number and password
2. **Database Check**: System checks `logon_lcmd` table for stored password
3. **If Found**: Validates against stored password
4. **If Not Found**: Checks if password matches default pattern (first letter of account name + zip code)
5. **Default Password Match**: Sets `requires_password_change = true` and shows password change modal
6. **Password Change**: New password is stored in `logon_lcmd` table, `requires_password_change` set to false
7. **Future Logins**: Password validated against `logon_lcmd` table

## Testing Steps:
1. Try logging in with account 101 using password "j62701"
2. Should show password change modal
3. Set new password (e.g., "newpassword123")
4. Should navigate to dashboard
5. Log out and log back in with new password
6. Should go directly to dashboard without password change modal
