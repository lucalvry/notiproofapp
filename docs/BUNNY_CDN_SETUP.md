# Bunny CDN Integration Guide

This document explains how NotiProof uses Bunny CDN for asset delivery and storage.

## Overview

NotiProof uses Bunny CDN for:
- **Widget script delivery** - Fast global CDN for widget.js
- **Image assets** - Campaign images, testimonial avatars, logos
- **Video testimonials** - Video content storage and streaming
- **Screenshot assets** - Automated screenshots
- **White-label assets** - Custom logos and branding

## Architecture

```
User Upload → Frontend → bunny-upload Edge Function → Bunny Storage Zones → Bunny CDN → Global Distribution
```

### Two-Zone Storage Architecture

NotiProof uses **two separate storage zones** for optimal organization and performance:

#### 1. **Media Zone** (`notiproof-media` / `BUNNY_MEDIA_ZONE`)
   - **Purpose**: User-generated content that changes frequently
   - **Contents**:
     - `/testimonial-avatars/{websiteId}/` - User avatar photos
     - `/testimonial-videos/{websiteId}/` - Video testimonials
     - `/campaign-assets/` - Campaign images
     - `/screenshots/` - Automated screenshots
   - **Default zone** for testimonial uploads

#### 2. **Assets Zone** (`notiproof-assets` / `BUNNY_ASSETS_ZONE`)
   - **Purpose**: Static application files that rarely change
   - **Contents**:
     - `/widget/widget.js` - NotiProof widget script
     - `/icons/` - Application icons
     - `/fonts/` - Web fonts
     - `/white-label-logos/` - Custom brand logos
   - **Cache**: 1-year immutable caching

### Legacy Single-Zone Support

For backwards compatibility, the system falls back to:
- `BUNNY_STORAGE_ZONE` if zone-specific variables aren't set
- `BUNNY_STORAGE_PASSWORD` as fallback password

### Components

1. **Bunny Pull Zone (CDN)** (`notiproof-cdn`)
   - Global CDN network
   - Hostname: `cdn.notiproof.com` (or `notiproof-cdn.b-cdn.net`)
   - Edge caching enabled
   - Brotli compression
   - WebP/AVIF optimization

2. **Edge Function** (`bunny-upload`)
   - Handles authenticated uploads to Bunny Storage
   - Supports zone selection ('media' or 'assets')
   - Validates file types and sizes
   - Returns CDN URLs
   - Location: `supabase/functions/bunny-upload/index.ts`

3. **Frontend Hook** (`useBunnyUpload`)
   - React hook for easy uploads
   - Location: `src/hooks/useBunnyUpload.tsx`
   - Usage example:
     ```tsx
     const { uploadToBunny } = useBunnyUpload();
     
     // Upload to media zone (default - for testimonials, avatars)
     const result = await uploadToBunny(file, 'testimonial-avatars');
     
     // Upload to assets zone (for static files)
     const result = await uploadToBunny(file, 'widget', 'assets');
     ```

## Configuration

### Required Secrets

Configure these in Supabase Edge Function secrets:

#### Two-Zone Setup (Recommended)

1. **BUNNY_MEDIA_ZONE**
   - Media storage zone name (user-generated content)
   - Example: `notiproof-media`

2. **BUNNY_MEDIA_PASSWORD**
   - Media storage zone access key
   - Found in: Storage → Media Zone → Password

3. **BUNNY_ASSETS_ZONE**
   - Assets storage zone name (static files)
   - Example: `notiproof-assets`

4. **BUNNY_ASSETS_PASSWORD**
   - Assets storage zone access key
   - Found in: Storage → Assets Zone → Password

5. **BUNNY_CDN_HOSTNAME**
   - CDN hostname (pull zone URL)
   - Example: `cdn.notiproof.com` or `notiproof-cdn.b-cdn.net`

#### Legacy Single-Zone Setup (Backwards Compatible)

1. **BUNNY_STORAGE_ZONE**
   - Single storage zone name (fallback)
   - Example: `notiproof-storage`

2. **BUNNY_STORAGE_PASSWORD**
   - Single storage zone access key (fallback)
   - Found in: Storage → Your Zone → Password

3. **BUNNY_CDN_HOSTNAME**
   - CDN hostname (pull zone URL)
   - Example: `cdn.notiproof.com`

**Note**: The system will use zone-specific variables if available, otherwise falls back to legacy single-zone configuration.

### DNS Configuration (Optional Custom Domain)

To use `cdn.notiproof.com`:

```
Type: CNAME
Name: cdn
Value: notiproof-cdn.b-cdn.net
TTL: 3600
```

Then add the custom domain in Bunny Pull Zone settings.

## Performance & Caching Configuration

### Required Bunny CDN Dashboard Settings

To ensure optimal performance and caching, configure the following in your Bunny CDN Pull Zone dashboard:

1. **Enable Compression**
   - Navigate to: Pull Zone → Edge Rules → Compression
   - ✅ Enable **Brotli compression** (best compression ratio)
   - ✅ Enable **Gzip compression** (fallback for older browsers)

2. **Enable Edge Caching**
   - Navigate to: Pull Zone → Caching
   - ✅ Enable edge caching
   - Set **cache TTL**: `31536000` seconds (1 year) for static assets
   - ✅ Enable **Origin Shield** for better cache hit rates

3. **Cache Control Headers**
   - Media files are automatically served with optimal caching:
     ```
     Cache-Control: public, max-age=31536000, immutable
     ```
   - Widget script (`/widget/widget.js`) includes:
     ```
     Cache-Control: public, max-age=31536000, immutable
     X-Content-Type-Options: nosniff
     ```

4. **Optimizer Settings** (Optional but recommended)
   - Navigate to: Pull Zone → Optimizer
   - ✅ Enable **WebP optimization** (automatic image conversion)
   - ✅ Enable **AVIF optimization** (next-gen format)
   - ✅ Enable **Image manipulation** (dynamic resizing)

### Performance Benefits

With these settings enabled:
- **99%+ cache hit rate** for returning visitors
- **70-80% bandwidth savings** with Brotli compression
- **Faster load times** with edge caching and compression
- **Automatic image optimization** reduces file sizes by 30-50%

## Plan-Based Upload Limits

NotiProof enforces subscription plan limits on uploads:

| Plan | Storage Limit | Video Duration | Testimonials | Forms |
|------|--------------|----------------|--------------|-------|
| Free | 100MB | 60s | 10 | 1 |
| Starter | 5GB | 120s | Unlimited | 3 |
| Standard | 15GB | 180s | Unlimited | 5 |
| Pro | 50GB | 240s | Unlimited | Unlimited |
| Business | 200GB | 360s | Unlimited | Unlimited |

### Enforcement Points

1. **Storage Quota**: Total file size across all uploads
2. **Video Duration**: Maximum video length per upload
3. **Avatar Size**: Fixed 2MB limit (all plans)
4. **Rate Limiting**: 10 uploads per minute per user

## File Upload Flow

### 1. Frontend Component (New API)
```tsx
import { useBunnyUpload } from '@/hooks/useBunnyUpload';

const { uploadToBunny } = useBunnyUpload();

// Image upload
const handleImageUpload = async (file: File) => {
  const result = await uploadToBunny(file, {
    path: 'campaign-assets',
    zone: 'media',
    websiteId: websiteId
  });
  
  if (result.success) {
    console.log('CDN URL:', result.url);
    console.log('Storage used:', result.storageUsed);
    console.log('Storage limit:', result.storageLimit);
  } else {
    console.error('Upload failed:', result.error, result.code);
  }
};

// Video upload (requires duration)
const handleVideoUpload = async (file: File, durationSeconds: number) => {
  const result = await uploadToBunny(file, {
    path: 'testimonial-videos',
    zone: 'media',
    duration: durationSeconds,
    websiteId: websiteId
  });
  
  if (result.success) {
    console.log('Video uploaded:', result.url);
  } else if (result.code === 'VIDEO_DURATION_LIMIT') {
    alert(`Video too long! Max ${result.details?.limit}s for your plan`);
  } else if (result.code === 'STORAGE_LIMIT_EXCEEDED') {
    alert('Storage full! Upgrade or delete files');
  }
};

// Legacy API still supported (path as string)
const result = await uploadToBunny(file, 'campaign-assets');
```

### 2. Edge Function Processing
```typescript
// Validates file
// Generates unique filename
// Uploads to Bunny Storage via PUT request
// Returns CDN URL
```

### 3. CDN Delivery & Tracking
```
https://cdn.notiproof.com/campaign-assets/abc123.jpg
```

Upload is tracked in the `media` table:
- User storage usage
- File metadata (size, type, duration)
- CDN URL reference
- Associated website

## Error Codes

All upload failures return structured errors:

```json
{
  "success": false,
  "error": "Human-readable message",
  "code": "ERROR_CODE",
  "details": { "additional": "context" }
}
```

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `UNAUTHORIZED` | Missing or invalid auth token | 401 |
| `RATE_LIMIT` | Too many uploads (>10/min) | 429 |
| `INVALID_FILE_TYPE` | File type not allowed | 400 |
| `AVATAR_TOO_LARGE` | Avatar exceeds 2MB | 400 |
| `VIDEO_DURATION_LIMIT` | Video exceeds plan duration | 400 |
| `STORAGE_LIMIT_EXCEEDED` | User storage quota full | 400 |
| `INVALID_REQUEST` | Missing required parameters | 400 |
| `SERVER_ERROR` | CDN or server failure | 500 |

### Example Error Response

```json
{
  "success": false,
  "error": "Storage limit exceeded. Current: 95.2MB, New file: 12.5MB, Limit: 100MB",
  "code": "STORAGE_LIMIT_EXCEEDED",
  "details": {
    "currentUsage": 99876543,
    "fileSize": 13107200,
    "limit": 104857600,
    "available": 4981057
  }
}
```

## Updated Components

The following components now use Bunny CDN:

1. **ImageUploader** (`src/components/campaigns/ImageUploader.tsx`)
   - Campaign image uploads
   - Bucket: `campaign-assets`

2. **WhiteLabelSettings** (`src/components/settings/WhiteLabelSettings.tsx`)
   - Custom logo uploads
   - Bucket: `white-label-logos`

3. **MessagePage** (`src/components/testimonials/pages/MessagePage.tsx`)
   - Testimonial avatar uploads
   - Bucket: `testimonial-avatars`

## Performance Benefits

### Before (Supabase Storage)
- Single region (typically)
- Limited bandwidth
- No edge caching
- Higher latency for global users

### After (Bunny CDN)
- 114+ global edge locations
- Unlimited bandwidth (usage-based pricing)
- Automatic edge caching
- 10-50ms latency worldwide
- WebP/AVIF automatic conversion
- Brotli compression

## Cost Comparison

### Supabase Storage
- $0.021/GB storage
- $0.09/GB bandwidth (expensive!)

### Bunny CDN
- $0.01/GB storage (50% cheaper)
- $0.01/GB bandwidth (90% cheaper!)
- ~$5-20/month for typical usage

## Monitoring

### Edge Function Logs
```bash
# View bunny-upload logs
https://supabase.com/dashboard/project/{project_id}/functions/bunny-upload/logs
```

### Bunny Dashboard
- Storage usage
- Bandwidth consumption
- Request analytics
- Cache hit ratio

## Troubleshooting

### Upload Fails with 401/403
- Check `BUNNY_STORAGE_PASSWORD` is correct
- Verify storage zone exists
- Check storage zone permissions

### Files Upload but Don't Display
- Verify `BUNNY_CDN_HOSTNAME` is correct
- Check DNS propagation if using custom domain
- Verify pull zone is linked to storage zone

### Slow Upload Speed
- Check edge function timeout settings
- Consider chunked uploads for large files (>10MB)
- Verify client internet connection

## Migration from Supabase Storage

If you have existing assets in Supabase Storage:

1. **Create Migration Script**
   ```typescript
   // Download from Supabase
   const { data } = await supabase.storage.from('bucket').download(path);
   
   // Upload to Bunny
   const formData = new FormData();
   formData.append('file', data);
   await supabase.functions.invoke('bunny-upload', { body: formData });
   ```

2. **Update Database URLs**
   ```sql
   UPDATE testimonials 
   SET author_avatar_url = REPLACE(
     author_avatar_url, 
     'supabase.co/storage', 
     'cdn.notiproof.com'
   );
   ```

3. **Keep Supabase as Backup** (Optional)
   - Keep existing files for 30 days
   - Monitor CDN delivery
   - Delete after successful migration

## Security

### Access Control
- Edge function requires authentication (`verify_jwt = true`)
- File validation (type, size, extension)
- Unique filenames prevent overwrites
- No direct storage zone access from frontend

### CORS Configuration
```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

### File Size Limits
- Images: 2MB max (frontend validation)
- Videos: 50MB max (configurable)
- Edge function timeout: 60s

## Future Enhancements

1. **Video Streaming**
   - Enable Bunny Stream for video testimonials
   - Adaptive bitrate streaming
   - Video player integration

2. **Image Optimization**
   - Automatic WebP/AVIF conversion
   - Responsive image variants
   - Lazy loading integration

3. **Signed URLs**
   - Private asset delivery
   - Time-limited access
   - Token-based authentication

4. **Purge API**
   - Clear CDN cache on demand
   - Automatic purge on asset update
   - Wildcard purge support

## Support

For Bunny CDN support:
- Dashboard: https://panel.bunny.net
- Documentation: https://docs.bunny.net
- Support: support@bunny.net

For NotiProof integration issues:
- Check edge function logs
- Review this documentation
- Contact development team
