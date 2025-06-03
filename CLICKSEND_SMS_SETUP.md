# ClickSend SMS Integration Setup Guide

## 🚀 SMS Notification System Overview

The system now automatically sends SMS notifications to +15164550980 whenever a customer places an order.

## 📱 SMS Message Format

When an order is placed, the SMS will contain:
```
New Order Alert!
Account: [Account Number] - [Company Name]
Order #: [Web Order Number]
Total: $[Total Amount]
```

## 🔧 Implementation Details

### 1. Edge Function Created
- **Location:** `supabase/functions/send-order-sms/index.ts`
- **Purpose:** Sends SMS via ClickSend API when orders are placed
- **Integration:** Called automatically from OrderConfirmationModal

### 2. Frontend Integration
- **Component:** OrderConfirmationModal.tsx
- **Trigger:** Automatically sends SMS when order confirmation modal opens
- **Status Display:** Shows real-time SMS sending status with visual indicators

## 🛠 Deployment Steps

### 1. Deploy the Edge Function
```bash
# Navigate to your project directory
cd /path/to/your/project

# Deploy the function to Supabase
supabase functions deploy send-order-sms
```

### 2. Verify Environment Variables
The function requires these environment variables in Supabase:
- `CLICKSEND_USERNAME` - Your ClickSend username
- `CLICKSEND_API_KEY` - Your ClickSend API key

## 🧪 Testing the SMS Integration

### 1. Test Order Flow
1. Login to the application (any customer account)
2. Add items to cart
3. Place an order
4. Watch the order confirmation modal for SMS status
5. Check +15164550980 for the SMS notification

### 2. SMS Status Indicators
The order confirmation modal shows:
- ⏳ **Preparing...** - Initial state
- 🔄 **Sending SMS notification...** - API call in progress
- ✅ **SMS notification sent to +15164550980** - Success
- ❌ **Failed to send SMS notification** - Error occurred

### 3. Admin Testing
- Login as admin (Account 999)
- Check the logs in Supabase Dashboard → Edge Functions → send-order-sms
- Monitor function invocations and any errors

## 🔍 Troubleshooting

### Common Issues:

1. **Function Not Found Error**
   - Ensure the function is deployed: `supabase functions deploy send-order-sms`
   - Check Supabase Dashboard → Edge Functions

2. **SMS Not Sending**
   - Verify ClickSend credentials in Supabase secrets
   - Check ClickSend account balance and permissions
   - Review function logs in Supabase Dashboard

3. **Environment Variables**
   - Ensure variables are set in Supabase (not just local .env)
   - Variables should be accessible to Edge Functions

### Debug Commands:
```bash
# Check function logs
supabase functions logs send-order-sms

# Test function locally (if needed)
supabase functions serve send-order-sms
```

## 📋 Features Implemented

### ✅ Customer Account Self-Service
- Account information editing (company, address, phone, email)
- Password change functionality
- Automatic `is_dirty` flag for data warehouse sync
- "Account Settings" button in customer header

### ✅ Admin Data Warehouse Sync
- 5-tab admin interface (Management, Order History, Accounts, History, Data Sync)
- Track accounts marked as `is_dirty = true`
- CSV export for modified accounts
- Bulk sync management tools

### ✅ SMS Order Notifications
- Automatic SMS to +15164550980 on order placement
- Real-time status display in order confirmation
- Complete order details in SMS (account, order number, total)
- Error handling and retry logic

## 🎯 Next Steps for Production

1. **Deploy Edge Function**: Run deployment command
2. **Test SMS Flow**: Place test orders and verify SMS delivery
3. **Monitor Logs**: Check Supabase function logs for any issues
4. **Verify Integration**: Ensure all components work together

## 🔗 Access Information

- **Customer Account Settings**: Available via header button for all customers
- **Admin Dashboard**: Account 999, Password: admin123
- **SMS Notifications**: Automatic on order placement
- **Data Sync**: Admin → Data Sync tab for warehouse integration

The complete system now provides customer self-service, admin management, and real-time SMS notifications for order tracking.
