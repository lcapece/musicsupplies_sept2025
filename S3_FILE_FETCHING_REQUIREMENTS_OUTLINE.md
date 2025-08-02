# S3 File Fetching Project Requirements Outline

**Repository:** musicsupplies_launch  
**GitHub URL:** https://github.com/lcapece/musicsupplies_launch

## Project Context

The Music Supplies e-commerce platform requires a feature to list file objects stored in an AWS S3 bucket. The platform is deployed on Netlify and uses Supabase as its backend service provider. The admin dashboard needs functionality to view file metadata from the S3 bucket named "mus86077".

## Primary Objective

Implement a system that fetches and displays file metadata (names and sizes) from the AWS S3 bucket "mus86077" within the admin dashboard. This is purely a file listing feature - it does not involve downloading, displaying, or processing file contents. The system only needs to know which files exist in the bucket along with their file size and last modified date.

## Detailed Requirements

### 1. Core Functionality Requirements

**File Object Listing**
- Retrieve a complete list of all file objects in the S3 bucket "mus86077"
- Display file metadata only (no file contents):
  - File name (S3 object key)
  - File size in bytes
  - File size formatted for display (KB, MB, GB)
  - Last modified timestamp
  - Full S3 object path/key

**Real-Time Metadata**
- Fetch current file listing from the S3 bucket
- No hardcoded or mock data in production
- Changes to bucket contents (files added/removed) reflected on refresh
- This is metadata only - no file contents are retrieved or processed

### 2. User Interface Requirements

**Admin Dashboard Integration**
- Create a dedicated "File Management" tab within the existing admin dashboard
- The interface must match the existing admin UI design patterns and styling
- Responsive design that works on desktop and tablet devices

**File Metadata Display**
- Display file objects in a clean table format
- Show total file count (e.g., "10 of 10 files")
- File type indicators based on file extension only
- Pagination for large file lists
- Clear indication this shows file metadata only

**Interactive Elements**
- "Create source files" button to trigger the S3 fetch operation
- "Copy Name" button for each file to copy the filename to clipboard
- "Copy URL" button for each file to copy the full S3 URL to clipboard
- "Force Refresh" option to bypass cache and fetch fresh data

### 3. Search and Filter Requirements

**Search Functionality**
- Implement a search bar that filters files in real-time as the user types
- Search should work on file names (case-insensitive)
- Display matching results instantly without server round-trips
- Show result count (e.g., "Showing 5 of 10 images")

**Filter Options**
- Filter by file extension (jpg, png, gif, etc.)
- Filter by file size ranges
- Filter by date modified (last 7 days, last 30 days, etc.)
- Clear all filters option

### 4. Performance Requirements

**Caching System**
- Implement client-side caching to reduce API calls
- Cache duration: 5 minutes (300 seconds)
- Display cache status to users (e.g., "Last updated: 2 minutes ago")
- Manual cache refresh option
- Cache should persist during the user session

**Loading States**
- Show loading spinner during initial data fetch
- Display progress indicators for long-running operations
- Implement skeleton screens while data loads
- Graceful handling of slow network conditions

### 5. Error Handling Requirements

**Network Errors**
- Handle network timeouts gracefully
- Display user-friendly error messages
- Implement retry logic with exponential backoff
- Fallback to cached data when available

**AWS Errors**
- Handle S3 access denied errors
- Handle bucket not found errors
- Handle rate limiting responses
- Log errors for debugging while showing simplified messages to users

**Edge Function Errors**
- Handle edge function timeout (default 10 seconds)
- Handle edge function errors (500, 502, 503 status codes)
- Provide fallback behavior when edge function is unavailable

### 6. Security Requirements

**Credential Management**
- AWS credentials must never be exposed to the frontend
- Credentials must be stored securely in Supabase vault
- Use environment variables for all sensitive configuration
- Implement proper CORS headers for API calls

**Access Control**
- Feature only accessible to authenticated admin users
- Verify admin role before displaying the image management tab
- Audit log for all S3 operations

### 7. Technical Constraints

**Deployment Environment**
- Must work on Netlify hosting platform
- No server-side code or local scripts allowed
- Must use Supabase edge functions for backend operations
- Frontend must be built with React and TypeScript

**AWS Integration**
- Use AWS SDK for JavaScript (v3)
- Support for S3 operations: ListObjectsV2
- Handle AWS region configuration (bucket is in us-east-1)
- Support for large buckets (1000+ files)

**Browser Compatibility**
- Support modern browsers (Chrome, Firefox, Safari, Edge)
- Implement polyfills for older browser features if needed
- Handle browser-specific clipboard API differences

### 8. Data Structure Requirements

**S3 Response Format**
The system must handle the standard AWS S3 ListObjectsV2 response format and transform it into a usable format for the frontend.

**Frontend Data Model**
Each file object should contain:
- filename: string (the S3 key)
- size: number (file size in bytes)
- lastModified: string (ISO 8601 format)
- url: string (constructed S3 URL)
- extension: string (extracted file extension)

### 9. Configuration Requirements

**Environment Variables Needed**
- VITE_SUPABASE_URL: Supabase project URL
- VITE_SUPABASE_ANON_KEY: Supabase anonymous key
- AWS_ACCESS_KEY_ID: AWS access key (stored in Supabase vault)
- AWS_SECRET_ACCESS_KEY: AWS secret key (stored in Supabase vault)
- AWS_REGION: AWS region for S3 bucket (stored in Supabase vault)

**Bucket Configuration**
- Bucket name: mus86077
- Region: us-east-1
- Public read access not required (access via AWS SDK only)

### 10. User Experience Requirements

**Visual Feedback**
- Clear indication when data is being fetched
- Success messages when operations complete
- Error states with actionable messages
- Empty state when no files are found

**Responsive Behavior**
- Table should be scrollable on mobile devices
- Touch-friendly buttons and controls
- Proper spacing for touch targets
- Collapsible columns on small screens

## Success Criteria

The implementation will be considered successful when:

1. Admin users can view all files in the S3 bucket "mus86077"
2. The system works in the production Netlify environment
3. File listing updates reflect actual S3 bucket contents
4. Search and filter functions work as specified
5. Caching reduces unnecessary API calls
6. Error states are handled gracefully
7. AWS credentials remain secure and never exposed
8. The feature integrates seamlessly with the existing admin dashboard
9. Performance is acceptable (initial load under 3 seconds)
10. All user interactions provide appropriate feedback

## Scope Clarification

This project specifically focuses on READ-ONLY file metadata operations. The following are explicitly OUT OF SCOPE:
- Uploading files to S3
- Deleting files from S3
- Modifying file metadata
- Creating S3 buckets
- Managing S3 permissions
- Direct S3 URL generation for public access
- Downloading file contents
- Displaying file contents (images, documents, etc.)
- Processing or manipulating file contents
- Thumbnail generation
- Image preview functionality

The sole focus is fetching and displaying file object metadata (names, sizes, dates) from the specified S3 bucket. This is purely a file listing feature that shows which files exist and their basic properties.
