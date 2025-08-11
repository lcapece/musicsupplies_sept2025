# Promo Code Single-Use Enforcement Implementation
## July 24, 2025

## Overview
This implementation strengthens the enforcement of single-use promo codes to prevent exploitation and financial losses. The system now has multiple layers of protection against duplicate usage.

## Problem Statement
You identified a critical concern: some promo codes offer such deep discounts that they could cause financial losses if used multiple times by the same account. Single-use promo codes must be strictly enforced.

## Solution Implemented

### 1. Database-Level Protections
- **Unique Constraint**: Added `unique_promo_usage_per_order` constraint to prevent duplicate entries
- **Row-Level Locking**: Enhanced validation function uses `FOR UPDATE` locks to prevent race conditions
- **Double-Check Validation**: The `record_promo_code_usage` function verifies limits before recording

### 2. Enhanced Validation Function
The `check_promo_code_validity` function now:
- Locks promo code rows during validation to prevent concurrent access
- Locks usage records for the account to prevent race conditions
- Provides clearer error messages for single-use violations
- Logs all validation attempts for debugging

### 3. Admin Monitoring Tools
Created `PromoCodeManagementTab` component with:
- **Validation Testing Tool**: Test any promo code with any account/order value
- **Usage Statistics**: View total uses, unique accounts, and total discounts given
- **Account Usage Details**: See which accounts have used each promo code
- **Single-Use Indicators**: Visual badges for single-use promo codes

### 4. New Database Functions
- `get_promo_code_usage_stats()`: Returns comprehensive usage statistics
- `get_promo_code_usage_by_accounts(p_code)`: Shows per-account usage details
- `promo_code_validation_log` table: Audit trail for security monitoring

## Current Promo Codes

### Single-Use Codes
1. **WELCOME15**: 15% off, $50 minimum order, one use per account
2. **SPECIAL50**: 50% off, $100 minimum order, one use per account (test code)

### Multi-Use Codes
1. **SAVE10**: 10% off any order, unlimited uses
2. **BULK25**: $25 off orders over $200, unlimited uses

## Testing & Verification

### Manual Testing
1. Navigate to Admin Dashboard → Promo Codes tab
2. Use the "Test Promo Code Validation" tool
3. Enter a single-use code (e.g., WELCOME15), account number, and order value
4. Click "Test Validation" - should succeed first time
5. Click again with same account - should show "already been used" error

### Automated Testing
Run the test script:
```bash
node test_promo_code_single_use.js
```

This tests:
- First use validation (should pass)
- Usage recording
- Second use validation (should fail)
- Concurrent validation attempts (race condition test)
- Usage statistics retrieval

## Migration Instructions

### To Apply the Migration
```bash
# Using Supabase CLI
supabase db push

# Or direct SQL execution
psql -h db.ekklokrukxmqlahtonnc.supabase.co -U postgres -d postgres -f supabase/migrations/20250724_strengthen_promo_code_single_use.sql
```

### Rollback (if needed)
```sql
-- Remove the constraint
ALTER TABLE promo_code_usage DROP CONSTRAINT IF EXISTS unique_promo_usage_per_order;

-- Restore previous function versions
-- (Would need to be retrieved from previous migrations)
```

## Security Features

### 1. Race Condition Prevention
- Row-level locking in validation function
- Unique constraint at database level
- Transaction-level consistency

### 2. Audit Trail
- All validation attempts can be logged
- Usage records are immutable
- Admin can track suspicious patterns

### 3. Clear User Feedback
- Single-use codes show: "This promo code has already been used on your account"
- Multi-use codes show: "Maximum uses per account (X) exceeded"

## Frontend Integration
The shopping cart already integrates with these functions:
- `applyPromoCode()` calls `check_promo_code_validity`
- `placeOrder()` calls `record_promo_code_usage`
- Error messages are displayed to users

## Best Practices for Creating Promo Codes

### For Single-Use, High-Value Codes:
```sql
INSERT INTO promo_codes (
  code, name, type, value, min_order_value,
  uses_per_account_tracking, max_uses_per_account,
  is_active
) VALUES (
  'ONETIME50', '50% Off - One Time Only', 'percent_off', 50.00, 100.00,
  TRUE, 1, TRUE
);
```

### For Limited Multi-Use Codes:
```sql
INSERT INTO promo_codes (
  code, name, type, value, 
  uses_per_account_tracking, max_uses_per_account,
  is_active
) VALUES (
  'LOYALTY20', '20% Off - Up to 3 Uses', 'percent_off', 20.00,
  TRUE, 3, TRUE
);
```

## Monitoring & Alerts

### Check for Potential Abuse:
```sql
-- Find accounts that have attempted to use single-use codes multiple times
SELECT 
  account_number,
  COUNT(*) as attempts,
  COUNT(DISTINCT order_id) as successful_uses
FROM promo_code_validation_log
WHERE promo_code IN (
  SELECT code FROM promo_codes 
  WHERE uses_per_account_tracking = TRUE 
  AND max_uses_per_account = 1
)
GROUP BY account_number
HAVING COUNT(*) > COUNT(DISTINCT order_id)
ORDER BY attempts DESC;
```

## Conclusion
The promo code system now has robust protection against exploitation of single-use codes. The combination of database constraints, row-level locking, and comprehensive monitoring ensures that high-value promotional codes cannot be used multiple times by the same account, protecting your business from financial losses.
