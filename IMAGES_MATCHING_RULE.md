# Images Matching Rule

## Overview

This document defines the canonical image resolution algorithm for the Music Supplies application. It applies to all product image display operations across the frontend, backend services, and data processing pipelines.

## Data Sources

- **Primary View**: `products_supabase` view
  - **Image Field**: `IMAGE` (string - may contain filename or path)
  - **Part Number Field**: `partnumber` (used for fallback resolution)
- **Image Storage**: S3 bucket `s3://mus86077` (authoritative source for all product images)

## Key Requirements

### Case-Insensitive Matching
All image lookups and comparisons MUST be performed case-insensitively. This includes:
- S3 key existence checks
- Filename comparisons
- Substring matching for placeholder detection

## Image Resolution Algorithm

The system follows a strict 3-step resolution order when determining which image to display for a product:

### Step 1: Check products_supabase.IMAGE

First, attempt to use the value from `products_supabase.IMAGE`. This step fails and proceeds to Step 2 if:
- `IMAGE` is NULL
- `IMAGE` is detected as a "coming soon" placeholder (see placeholder detection below)
- `IMAGE` does not exist in `s3://mus86077` (case-insensitive check)

If the image exists in S3, use it and stop.

### Step 2: Try Part Number Fallback

If Step 1 fails, construct a fallback filename:
- Format: `{partnumber}.jpg`
- Example: If `partnumber` = "ABC123", try "ABC123.jpg"
- Check for existence in S3 (case-insensitive)

If found, use it and stop. Otherwise, proceed to Step 3.

### Step 3: Normalize Slashes and Retry

This step handles cases where path separators cause mismatches:
1. Remove all forward slashes (`/`) and backslashes (`\`) from both:
   - The original `IMAGE` value
   - All S3 object keys
2. Compare the normalized strings (case-insensitive)
3. If a match is found, use the corresponding S3 object

If no match is found after all three steps, treat the product as having no available image.

## Placeholder Detection

An image is considered a "coming soon" placeholder if its filename contains the substring "comingsoon" after normalization:

1. Convert filename to lowercase
2. Remove separators: spaces, underscores, hyphens, forward slashes, backslashes
3. Check if the result contains "comingsoon"

Examples of placeholders:
- `coming-soon.png` → `comingsoon.png` → detected
- `images/Coming_Soon.jpg` → `imagescomingsoon.jpg` → detected
- `COMING SOON.gif` → `comingsoon.gif` → detected

## Implementation Examples

### Example 1: Standard Case
```
IMAGE: "Products/Strings/ABC123.JPG"
S3 has: "products/strings/abc123.jpg"
Result: Step 1 succeeds (case-insensitive match)
```

### Example 2: NULL Image
```
IMAGE: NULL
Part Number: "ABC123"
S3 has: "abc123.JPG"
Result: Step 2 succeeds with "ABC123.jpg"
```

### Example 3: Placeholder Image
```
IMAGE: "images/coming-soon.png"
Part Number: "XYZ789"
Result: Step 1 detects placeholder, Step 2 tries "XYZ789.jpg"
```

### Example 4: Path Separator Mismatch
```
IMAGE: "guitars\\Acme\\A/B\\C123.jpg"
S3 has: "guitars/acme/abc123.JPG"
Result: Step 3 normalizes to "guitarsacmeabc123.jpg" and matches
```

## Implementation Guidelines

### For Backend Services
```javascript
function resolveProductImage(product, s3Keys) {
  const { IMAGE, partnumber } = product;
  
  // Step 1: Check IMAGE
  if (IMAGE && !isComingSoonPlaceholder(IMAGE)) {
    const imageKey = findCaseInsensitive(s3Keys, IMAGE);
    if (imageKey) return imageKey;
  }
  
  // Step 2: Try part number
  const partNumberImage = `${partnumber}.jpg`;
  const partNumberKey = findCaseInsensitive(s3Keys, partNumberImage);
  if (partNumberKey) return partNumberKey;
  
  // Step 3: Normalize slashes
  if (IMAGE) {
    const normalizedImage = IMAGE.replace(/[\/\\]/g, '').toLowerCase();
    const normalizedKey = s3Keys.find(key => 
      key.replace(/[\/\\]/g, '').toLowerCase() === normalizedImage
    );
    if (normalizedKey) return normalizedKey;
  }
  
  return null; // No image available
}

function isComingSoonPlaceholder(filename) {
  const normalized = filename
    .toLowerCase()
    .replace(/[\s\-_\/\\]/g, '');
  return normalized.includes('comingsoon');
}

function findCaseInsensitive(keys, target) {
  const lowerTarget = target.toLowerCase();
  return keys.find(key => key.toLowerCase() === lowerTarget);
}
```

### For Frontend Components
```typescript
interface ImageResolutionResult {
  imageUrl: string | null;
  resolutionMethod: 'image_field' | 'part_number' | 'slash_normalized' | 'not_found';
}

async function getProductImageUrl(
  product: Product,
  s3BaseUrl: string
): Promise<ImageResolutionResult> {
  // Implementation following the same 3-step algorithm
  // Returns full URL or null if no image found
}
```

## Monitoring and Logging

### Recommended Metrics
- Count of resolutions by method (Step 1, 2, or 3)
- Count of products with no available image
- List of IMAGE values that fail Step 1 (for data quality monitoring)

### Logging Examples
```
INFO: Product ABC123 - Image resolved via Step 1 (IMAGE field)
WARN: Product XYZ789 - IMAGE "old/path/image.jpg" not found in S3, trying fallback
INFO: Product DEF456 - Image resolved via Step 3 (slash normalization)
ERROR: Product GHI789 - No image found after all resolution attempts
```

## Notes for Implementers

1. **Performance Optimization**: Consider caching S3 key listings or using a metadata table with normalized keys for efficient lookups.

2. **Batch Processing**: When processing multiple products, fetch all S3 keys once and reuse for all lookups.

3. **Error Handling**: Always gracefully handle missing images. Never crash or throw exceptions for missing images.

4. **Consistency**: This algorithm must be applied uniformly across:
   - Product listing pages
   - Product detail pages
   - Order confirmation emails
   - Admin interfaces
   - Batch export jobs
   - API responses

5. **Testing**: Ensure test coverage for all three resolution steps and edge cases like mixed-case filenames and various path separator combinations.

## Version History

- v1.0 (2025-08-12): Initial implementation of 3-step image resolution algorithm
