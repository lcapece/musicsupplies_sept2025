# S3 Image Management Setup Guide

## Overview
The Image Management tab connects to AWS S3 bucket `mus86077` to fetch and display all file information. The system implements in-memory caching for fast subsequent access.

## Features
- **Real-time S3 bucket connection** to `mus86077`
- **In-memory caching** for 5-minute duration
- **Fast listbox population** with cached data
- **Search functionality** to filter files
- **Copy file name and S3 URL** to clipboard
- **Force refresh** option to bypass cache
- **Automatic cache cleanup** after 30 minutes of inactivity

## Setup Instructions

### 1. Deploy the Edge Function

```bash
# Deploy the list-s3-files edge function
supabase functions deploy list-s3-files
```

### 2. Set AWS Credentials

You need to set the following environment variables for the edge function:

```bash
# Set AWS credentials for the edge function
supabase secrets set AWS_ACCESS_KEY_ID=your-access-key-id
supabase secrets set AWS_SECRET_ACCESS_KEY=your-secret-access-key
supabase secrets set AWS_REGION=us-east-1  # or your bucket region
```

### 3. AWS IAM Permissions

Ensure your AWS IAM user has the following permissions for bucket `mus86077`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": "arn:aws:s3:::mus86077"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:GetObjectVersion"
      ],
      "Resource": "arn:aws:s3:::mus86077/*"
    }
  ]
}
```

## How It Works

1. **Button Click**: When "Create source files" is clicked, the component checks for cached data
2. **Cache Check**: If valid cached data exists (less than 5 minutes old), it's used immediately
3. **S3 Fetch**: If no cache or expired, the edge function fetches all files from S3
4. **Caching**: Fresh data is stored in memory with a timestamp
5. **Display**: Files are displayed in a scrollable listbox with search functionality

## Performance Optimizations

- **In-Memory Cache**: Data is cached using React `useRef` for 5 minutes
- **Lazy Loading**: Edge function fetches up to 1000 files at a time
- **Automatic Cleanup**: Cache is cleared after 30 minutes of inactivity
- **Force Refresh**: Users can manually refresh to get latest data

## Testing

1. Navigate to the admin backend (account 999)
2. Click on the "Image Management" tab
3. Click "Create source files" button
4. Verify files are loaded from S3 bucket `mus86077`
5. Click the button again to verify cached data is used (should be instant)
6. Use "Force Refresh" to bypass cache and fetch fresh data

## Troubleshooting

### "AWS credentials not configured" Error
- Ensure you've set the AWS credentials using `supabase secrets set` commands
- Verify the edge function has been deployed

### No files showing
- Check AWS IAM permissions for the bucket
- Verify the bucket name is correct (`mus86077`)
- Check browser console for detailed error messages

### Slow loading
- First load will take time depending on number of files
- Subsequent loads should be instant due to caching
- Consider reducing cache duration if data changes frequently

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Image Mgmt Tab │────▶│  Edge Function  │────▶│   S3 Bucket     │
│  (React + Cache)│◀────│ (list-s3-files) │◀────│   (mus86077)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                                               
        ▼                                               
┌─────────────────┐                                    
│  Memory Cache   │                                    
│  (5 min TTL)    │                                    
└─────────────────┘                                    
```

## File Structure

- `/src/components/admin/ImageManagementTab.tsx` - React component with caching
- `/supabase/functions/list-s3-files/index.ts` - Edge function for S3 access
- Cache is stored in component memory using `useRef`

## Notes

- The S3 URL generation assumes standard AWS S3 URL format
- Adjust the S3 URL pattern if using custom domains or CloudFront
- Cache duration can be adjusted by modifying `CACHE_DURATION` constant
- Consider adding pagination for buckets with thousands of files
