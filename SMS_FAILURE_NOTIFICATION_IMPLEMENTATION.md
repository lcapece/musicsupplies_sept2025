# SMS Failure Notification Implementation

## Overview
This feature tracks SMS notification failures during order placement and automatically notifies the admin (account 999) when they log in, without showing error popups to customers.

## Implementation Details

### 1. Database Schema
Created a new table `sms_notification_failures` to track failed SMS notifications:
- `id`: UUID primary key
- `order_number`: The order number for which SMS failed
- `customer_phone`: Customer's phone number
- `customer_name`: Customer's name
- `customer_account_number`: Customer's account number
- `error_message`: The error message from the SMS service
- `created_at`: Timestamp when the failure occurred
- `acknowledged_at`: Timestamp when admin acknowledged the failure
- `acknowledged_by`: User ID of the admin who acknowledged

### 2. RLS Policies
- Only admin (account 999) can view and update SMS failures
- Service role can insert new failures
- Includes functions for getting unacknowledged failures and acknowledging them

### 3. Frontend Components

#### ShoppingCart.tsx
- Modified to capture SMS sending failures silently
- When SMS fails, it logs the failure to the database
- No error popup is shown to the customer
- Order placement continues normally

#### SmsFailureNotificationModal.tsx
- New modal component to display unacknowledged SMS failures
- Shows order number, customer details, and error message
- Allows admin to acknowledge all failures at once
- Displays "No SMS failures to report!" when there are none

#### AdminDashboard.tsx
- Checks for unacknowledged SMS failures when admin logs in
- Automatically shows the modal if there are any failures
- Only checks once per session to avoid repeated popups

## How It Works

1. **When an order is placed:**
   - If SMS notification fails, the error is captured
   - Failure details are saved to `sms_notification_failures` table
   - Customer sees no error popup - order continues normally

2. **When admin (999) logs in:**
   - System checks for unacknowledged SMS failures
   - If any exist, modal automatically appears
   - Admin can review all failures and acknowledge them
   - Once acknowledged, they won't appear again

## Files Modified/Created
1. `supabase/migrations/20250728_create_sms_notification_failures_table.sql` - Database migration
2. `src/components/ShoppingCart.tsx` - Updated to log SMS failures
3. `src/components/SmsFailureNotificationModal.tsx` - New modal component
4. `src/pages/AdminDashboard.tsx` - Updated to show notifications on login

## Testing
1. Place an order with an invalid phone number or when SMS service is down
2. Log out and log back in as account 999
3. The SMS failure notification modal should appear automatically
4. Acknowledge the failures and they should not appear again

## Benefits
- Customers are not disrupted by technical SMS failures
- Admin is automatically notified of all SMS failures
- Admin can manually follow up with affected customers
- All failures are tracked for audit purposes
