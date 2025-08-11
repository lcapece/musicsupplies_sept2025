# Music Supplies System - Current Architecture Documentation

**Last Updated:** August 11, 2025

## ⚠️ CRITICAL: This is the ONLY authoritative documentation. All other MD files are OUTDATED and should be ignored.

## Authentication System

### Database Tables:
- **`accounts_lcmd`**: Account information ONLY (NO password fields)
  - Contains: account_number, acct_name, address, city, state, zip, email_address, phone, mobile_phone
  - Does NOT contain: password, requires_password_change (these were removed)
  
- **`user_passwords`**: Password storage with bcrypt hashes
  - Contains: account_number, password_hash, created_at, updated_at

### Authentication Flow:
1. Check `user_passwords` table for existing password → bcrypt verification
2. If no password record exists → allow ZIP code login for first-time password setup
3. Fallback to master password if needed

### Frontend Components:
- Password modal updates accounts_lcmd (email, mobile_phone) and user_passwords (password_hash) separately
- NO references to non-existent columns like `requires_password_change`

## Current System Status:
- Version: 811.14
- Authentication: Working with proper database separation
- Password Modal: Fixed to not reference removed columns
- Database Functions: Updated to follow correct table structure

## Key Rules:
1. NEVER reference accounts_lcmd.password or accounts_lcmd.requires_password_change - these don't exist
2. Passwords are ONLY stored in user_passwords table
3. First-time users can set password using ZIP code
4. All other documentation files are OUTDATED and should be cleaned up
