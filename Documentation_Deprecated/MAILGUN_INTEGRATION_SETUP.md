# Mailgun Email Integration Setup

## Overview
This implementation adds Mailgun email integration to the Music Supplies admin backend with the following features:
- **Admin Email Tab**: New "Email" tab in the admin dashboard (999 backend)
- **Test Email Function**: Button to send test emails via Mailgun
- **Sender Email**: All emails sent from `marketing@mg.musicsupplies.com`
- **HTML & Plain Text**: Supports both HTML and plain text email formats

## Components Added

### 1. EmailTab Component
- **Location**: `src/components/admin/EmailTab.tsx`
- **Features**:
  - Send test email button
  - Email history tracking
  - Configuration status display
  - Email validation

### 2. Supabase Edge Function
- **Function Name**: `send-mailgun-email`
- **Location**: `supabase/functions/send-mailgun-email/index.ts`
- **Features**:
  - Mailgun API integration
  - Email tracking enabled
  - Error handling and logging
  - CORS support

### 3. Admin Dashboard Integration
- **Updated**: `src/pages/AdminDashboard.tsx`
- **Changes**: Added "Email" tab with 📧 icon
- **Position**: Between "ClickSend SMS" and "General Settings" tabs

## Required Setup

### Mailgun Credentials in Supabase Edge Vault
You need to add the following environment variables to your Supabase project's Edge Functions secrets:

```bash
# Required Mailgun credentials
MAILGUN_API_KEY=your-mailgun-api-key-here
MAILGUN_SENDING_KEY=your-mailgun-sending-key-here
MAILGUN_DOMAIN=mg.musicsupplies.com
```

### How to Add Credentials to Supabase Edge Vault

1. **Via Supabase Dashboard**:
   - Go to your Supabase project dashboard
   - Navigate to "Edge Functions" → "Settings"
   - Add the environment variables listed above

2. **Via Supabase CLI** (if you have it set up):
   ```bash
   supabase secrets set MAILGUN_API_KEY=your-key-here
   supabase secrets set MAILGUN_SENDING_KEY=your-key-here
   supabase secrets set MAILGUN_DOMAIN=mg.musicsupplies.com
   ```

## Mailgun Account Setup

### Domain Configuration
- **Domain**: `mg.musicsupplies.com`
- **Sender**: `marketing@mg.musicsupplies.com`

### Required Mailgun Settings
1. **Domain Verification**: Ensure `mg.musicsupplies.com` is verified in Mailgun
2. **DNS Records**: Make sure all required DNS records are configured
3. **API Key**: Generate an API key with sending permissions
4. **Sending Key**: Generate a sending-specific key if available

## Features

### Email Tracking
The integration automatically enables:
- **Delivery Tracking**: Track when emails are delivered
- **Click Tracking**: Track link clicks in emails
- **Open Tracking**: Track when emails are opened

### Email Format
- **Plain Text**: Always included
- **HTML**: Automatically generated with Music Supplies branding
- **Template**: Clean, professional email template with company styling

### Error Handling
- **Validation**: Email address and content validation
- **Error Messages**: Clear error messages for troubleshooting
- **Logging**: Detailed logging for debugging issues

## Usage

### Access the Email Tab
1. Log into the admin backend (account 999)
2. Navigate to the "Email" tab in the admin dashboard
3. Click "📧 Send Test Email" button

### Send Test Email
1. Enter recipient email address
2. Customize subject line (default provided)
3. Enter message content
4. Click "Send Test Email"
5. Monitor status in the "Recent Test Emails" section

### Monitor Email History
- **Status Tracking**: See sending, sent, or failed status
- **Error Details**: View specific error messages for failed emails
- **Timestamps**: Track when emails were sent
- **Message Content**: Review what was sent

## Troubleshooting

### Common Issues

**1. Missing Credentials Error**
```
Error: Mailgun configuration is incomplete. Missing API key or sending key.
```
**Solution**: Add the required environment variables to Supabase Edge Vault

**2. Domain Not Verified**
```
Error: Mailgun API error: 400 - Domain not found
```
**Solution**: Verify the domain `mg.musicsupplies.com` in your Mailgun account

**3. Invalid API Key**
```
Error: Mailgun API error: 401 - Unauthorized
```
**Solution**: Check that your MAILGUN_API_KEY is correct and has sending permissions

### Testing the Integration

1. **Start with your own email** to test basic functionality
2. **Check Mailgun logs** in the Mailgun dashboard for delivery status
3. **Verify DNS setup** if emails are not being delivered
4. **Review Edge Function logs** in Supabase for detailed error information

## Security Notes

- **Credentials**: All Mailgun credentials are stored securely in Supabase Edge Vault
- **Validation**: Email addresses are validated before sending
- **Rate Limiting**: Consider implementing rate limiting for production use
- **Audit Trail**: All email sending activity is logged for audit purposes

## Next Steps

1. **Add Mailgun credentials** to Supabase Edge Vault
2. **Test the integration** with a test email
3. **Verify email delivery** in your inbox
4. **Check Mailgun dashboard** for delivery confirmation
5. **Configure any additional Mailgun settings** as needed

## Files Modified/Created

- ✅ `src/components/admin/EmailTab.tsx` (new)
- ✅ `supabase/functions/send-mailgun-email/index.ts` (new)
- ✅ `src/pages/AdminDashboard.tsx` (updated)
- ✅ Edge function deployed to Supabase

The integration is now ready for use once the Mailgun credentials are configured!
