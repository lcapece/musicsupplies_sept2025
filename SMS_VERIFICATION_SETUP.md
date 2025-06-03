# SMS Verification Setup for New User Password Changes

## Overview
This feature adds SMS verification to the new user password change process, allowing users to optionally provide their mobile phone number and verify it through a code sent via Twilio SMS.

## Files Created/Modified

### 1. Database Migration
- **File**: `supabase/migrations/20250601061500_create_sms_verification_table.sql`
- **Purpose**: Creates SMS verification table and functions
- **Tables**: 
  - `sms_verification_codes` - stores verification codes
  - Adds `sms_consent` and `sms_consent_date` columns to `accounts_lcmd`
- **Functions**:
  - `verify_sms_code_lcmd()` - verifies SMS codes
  - `cleanup_expired_sms_codes()` - cleans up expired codes

### 2. Supabase Edge Functions
- **File**: `supabase/functions/send-sms-verification/index.ts`
- **Purpose**: Sends SMS verification codes via Twilio
- **Endpoint**: `/functions/v1/send-sms-verification`

- **File**: `supabase/functions/verify-sms-code/index.ts`
- **Purpose**: Verifies SMS codes and updates consent
- **Endpoint**: `/functions/v1/verify-sms-code`

### 3. Frontend Components
- **File**: `src/components/PasswordChangeModal.tsx`
- **Purpose**: Updated to include SMS verification flow
- **Features**:
  - Optional mobile phone number input
  - SMS consent checkbox
  - Send verification code button
  - Code verification input
  - Complete verification workflow

- **File**: `src/types/index.ts`
- **Purpose**: Added SMS-related fields to User interface

## Environment Variables Required

### Supabase Secrets (set via Supabase Dashboard or CLI)
```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Supabase (auto-provided)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Local .env File (for development)
```bash
# Already added according to user
TWILIO_KEY=your_twilio_key
```

## Deployment Steps

### 1. Run Database Migration
```bash
# Run the migration to create SMS verification table
supabase db push
```

### 2. Deploy Edge Functions
```bash
# Deploy SMS verification functions
supabase functions deploy send-sms-verification
supabase functions deploy verify-sms-code
```

### 3. Set Supabase Secrets
```bash
# Set Twilio secrets
supabase secrets set TWILIO_ACCOUNT_SID=your_account_sid
supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token
supabase secrets set TWILIO_PHONE_NUMBER=your_phone_number
```

### 4. Test the Implementation
1. Login with a new user account (using default password)
2. Password change modal should appear
3. Enter mobile phone number
4. Check SMS consent checkbox
5. Click "Send Verification Code"
6. Enter received code and verify
7. Complete password change

## User Flow

### First-Time Login Process (Updated)
1. **Login**: User enters account number and default password (case-insensitive)
2. **Password Change Modal**: Opens automatically for first-time users
3. **Required Fields**:
   - New password (minimum 6 characters)
   - Confirm password
   - Email address
4. **Optional SMS Verification**:
   - User can enter mobile phone number
   - Must check SMS consent checkbox
   - Click "Send Verification Code"
   - Enter 6-digit code received via SMS
   - Click "Verify" to confirm
5. **Submit**: Complete account setup

### SMS Verification Details
- **Code Expiration**: 5 minutes
- **Code Length**: 6 digits
- **Phone Format**: Automatically formats to +1XXXXXXXXXX for US numbers
- **Consent Tracking**: Records SMS consent and date in database
- **Verification Status**: Tracks verification status in database

## Security Features
- Codes expire after 5 minutes
- One code per account (upsert behavior)
- Phone number format validation
- RLS (Row Level Security) enabled on verification table
- Consent explicitly tracked with timestamp

## Error Handling
- Invalid phone number format
- Missing Twilio configuration
- SMS sending failures
- Invalid/expired verification codes
- Database operation failures

## Database Schema

### sms_verification_codes Table
```sql
CREATE TABLE sms_verification_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  account_number bigint UNIQUE NOT NULL,
  phone_number text NOT NULL,
  verification_code text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

### accounts_lcmd Table (Added Columns)
```sql
ALTER TABLE accounts_lcmd 
ADD COLUMN sms_consent boolean DEFAULT false,
ADD COLUMN sms_consent_date timestamptz;
```

## Next Steps
1. Test with real Twilio credentials
2. Monitor SMS delivery and verification rates
3. Consider adding rate limiting for SMS sends
4. Add cleanup job for expired verification codes
5. Consider adding SMS notifications for other account activities

## Troubleshooting
- **SMS not received**: Check Twilio phone number and account balance
- **Function errors**: Check Supabase function logs
- **TypeScript errors**: These are expected in VSCode for Deno edge functions
- **Verification fails**: Check code expiration and format
