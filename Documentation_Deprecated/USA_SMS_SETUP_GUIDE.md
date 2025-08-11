# USA SMS Setup Guide - MusicSupplies

## SMS Configuration for USA Numbers (+1)

### Current Status
- ✓ ClickSend authentication is working (Balance: 15.78)
- ✓ SMS will be sent from: **+18338291653** (Carrier Approved)
- ⚠️ Edge functions need redeployment (401 error)

### How to Send SMS to USA Numbers

#### Option 1: Admin Dashboard (Immediate)
1. Go to Admin Dashboard → ClickSend SMS tab
2. Click "Send Ad-Hoc SMS"
3. Enter USA phone number in any of these formats:
   - `+15164550980` (with country code)
   - `15164550980` (without + sign)
   - `5164550980` (without country code - system will add +1)
   - `516-455-0980` (with dashes)
4. Type your message (max 160 characters)
5. Click Send

#### Option 2: Fix Edge Functions
If the admin dashboard doesn't work, redeploy the edge functions:

```bash
# Deploy the SMS functions
npx supabase functions deploy send-admin-sms
npx supabase functions deploy send-customer-sms
```

### USA Phone Number Formats
The system accepts USA numbers in multiple formats:
- **International**: +1XXXXXXXXXX (e.g., +15164550980)
- **National**: 1XXXXXXXXXX (e.g., 15164550980)
- **Local**: XXXXXXXXXX (e.g., 5164550980)
- **Formatted**: XXX-XXX-XXXX (e.g., 516-455-0980)

The system will automatically normalize to +1 format.

### Testing SMS
Use the test script with a USA number:
```powershell
# Edit test_sms_simple.ps1 and change the test number to your USA number
# Then run:
.\test_sms_simple.ps1
```

### Common USA Area Codes
- New York: 212, 516, 718, 917
- California: 213, 310, 415, 619
- Texas: 214, 512, 713, 817
- Florida: 305, 407, 561, 813

### Troubleshooting
1. **SMS not sending**: Check edge function logs in Supabase dashboard
2. **Invalid number**: Ensure number is 10 digits (area code + number)
3. **Delivery issues**: Check ClickSend dashboard for delivery status

### SMS Features
- Customer order notifications
- Admin notifications for new orders
- Ad-hoc messaging from admin dashboard
- Automatic SMS consent tracking

Your ClickSend account is ready to send SMS to USA numbers!
