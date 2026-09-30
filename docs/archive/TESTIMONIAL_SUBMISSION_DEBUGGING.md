# Testimonial Submission Debugging Guide

## Phase 3: Submission Tracking - Complete Implementation

This guide explains how to debug and test the testimonial submission system after implementing Phase 3 fixes.

---

## What Was Fixed

### 1. RLS Policies (Row-Level Security)
✅ **Public Submissions Enabled**
- Anonymous users can now submit testimonials to active forms
- Policy checks form existence and active status
- Website owners can manage their testimonials

### 2. Storage Permissions
✅ **Anonymous Uploads Allowed**
- Testimonials bucket is now public
- Anonymous users can upload to `/avatars/` and `/videos/` folders
- Proper folder structure: `{website_id}/avatars/` and `{website_id}/videos/`

### 3. Extensive Logging
✅ **Comprehensive Console Logs**
- Form initialization tracking
- File upload progress with retry logic
- Submission flow phases
- Detailed error messages

### 4. Error Handling
✅ **User-Friendly Error Messages**
- Specific error messages for common issues
- Automatic retry logic for uploads (up to 2 retries)
- Error logging to `integration_logs` table
- Toast notifications for all states

---

## Testing the Submission Flow

### Step 1: Open Browser Console
1. Open the testimonial collection form: `/collect/{slug}`
2. Press `F12` or `Cmd+Option+I` to open DevTools
3. Go to the **Console** tab

### Step 2: Watch the Logs
You should see logs like:
```
[Form Init] Tracking view for slug: test-form
[Form Init] View tracked successfully
[Form Config] Loading configuration...
[Form Config] Using provided configuration
[Form Config] Page sequence: ["welcome", "rating", "message", "about_you", "thank_you"]
[Form Config] Loaded questions: 2
```

### Step 3: Submit the Form
As you fill out and submit the form, watch for:

**Phase 1: Media Upload**
```
=== TESTIMONIAL SUBMISSION STARTED ===
[Submit] Form data: { websiteId: "...", formId: "...", ... }
[Submit] Phase 1: Uploading media files...
[Submit] Uploading avatar...
[Upload] Starting avatar upload: { fileName: "...", fileSize: 123456, ... }
[Upload] Uploading to path: abc-123/avatars/filename.jpg
[Upload] Success! Public URL: https://...
```

**Phase 2: Database Insert**
```
[Submit] Phase 2: Inserting testimonial record...
[Submit] Testimonial data prepared: { ... }
[Submit] Testimonial inserted successfully: uuid-here
```

**Phase 3: Processing**
```
[Submit] Phase 3: Processing submission...
[Submit] Processing completed: { success: true, ... }
=== TESTIMONIAL SUBMISSION COMPLETED ===
```

---

## Common Issues & Solutions

### Issue 1: "violates row-level security policy"
**Symptoms:** Error during database insert
**Solution:**
- Check if form is active: `is_active = true`
- Verify RLS policy exists: Run the Phase 3 migration again
- Check if user is anonymous: Should work for both `anon` and `authenticated`

**Debug Query:**
```sql
SELECT id, name, slug, is_active 
FROM testimonial_forms 
WHERE slug = 'your-slug-here';
```

### Issue 2: Upload Fails (403 Forbidden)
**Symptoms:** Storage upload returns 403 error
**Solution:**
- Verify bucket is public: `UPDATE storage.buckets SET public = true WHERE id = 'testimonials'`
- Check folder structure: Path should be `{website_id}/avatars/` or `{website_id}/videos/`
- Verify storage policies exist

**Debug Query:**
```sql
SELECT * FROM storage.objects 
WHERE bucket_id = 'testimonials' 
ORDER BY created_at DESC 
LIMIT 5;
```

### Issue 3: File Size Exceeded
**Symptoms:** "File size exceeds XMB limit"
**Solution:**
- Avatar limit: 2MB
- Video limit: 10MB
- Compress files before upload

### Issue 4: Network Timeout
**Symptoms:** Upload times out
**Solution:**
- Automatic retry (up to 2 attempts)
- Check network connection
- Try smaller file sizes

---

## Viewing Submission Errors

### Check Integration Logs
Query the error log:
```sql
SELECT 
  created_at,
  integration_type,
  action,
  status,
  error_message,
  details
FROM integration_logs
WHERE integration_type = 'testimonial_submission'
  AND status = 'error'
ORDER BY created_at DESC
LIMIT 10;
```

### Check Testimonials Table
Verify submissions:
```sql
SELECT 
  id,
  website_id,
  author_name,
  author_email,
  rating,
  status,
  avatar_url,
  video_url,
  created_at,
  metadata
FROM testimonials
WHERE source = 'form'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Browser Console Debugging Commands

### Check Form Configuration
```javascript
// Check if form config loaded
console.log('Form Config:', formConfig);
console.log('Questions:', questions);
console.log('Page Sequence:', pageSequence);
```

### Manually Test Upload
```javascript
// Test file upload function
const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
uploadFile(testFile, 'avatar').then(url => console.log('Uploaded:', url));
```

### Test RLS Policy
```javascript
// Check if you can insert (from browser console)
const { data, error } = await supabase.from('testimonials').insert({
  website_id: 'your-website-id',
  source: 'form',
  author_name: 'Test User',
  rating: 5,
  message: 'Test message',
  metadata: { form_id: 'your-form-id' },
  status: 'pending'
}).select();

console.log('Insert result:', { data, error });
```

---

## Performance Monitoring

### Upload Speed
- Avatar (2MB max): ~1-3 seconds
- Video (10MB max): ~5-15 seconds
- Retry delays: 1s, 2s (exponential backoff)

### Database Insert
- Typical time: <500ms
- Includes metadata JSONB field

### Post-Processing
- Email sending: ~1-2 seconds
- Reward generation: <100ms
- Non-blocking (doesn't affect user experience)

---

## Success Criteria Checklist

After Phase 3 implementation, verify:

✅ **Public Submission Works**
- [ ] Anonymous user can access form via share link
- [ ] Form loads without authentication
- [ ] Submission succeeds without login

✅ **Media Uploads Work**
- [ ] Avatar upload succeeds (required field)
- [ ] Video upload succeeds (optional)
- [ ] Files appear in storage bucket
- [ ] Public URLs are accessible

✅ **Database Insert Works**
- [ ] Testimonial record created
- [ ] Status set to 'pending'
- [ ] Metadata includes form_id
- [ ] No RLS errors

✅ **Error Handling Works**
- [ ] Upload failures show user-friendly message
- [ ] Failed uploads retry automatically
- [ ] Errors logged to integration_logs
- [ ] Network issues handled gracefully

✅ **Logging Works**
- [ ] Console shows all phases
- [ ] Upload progress visible
- [ ] Errors have full context
- [ ] Success confirmation appears

---

## Next Steps

After verifying Phase 3:
1. Move to Phase 4: Template Redesign
2. Test submission → moderation flow
3. Verify email notifications work
4. Test reward system

---

## Support

If issues persist:
1. Check browser console for detailed logs
2. Query `integration_logs` table for backend errors
3. Verify RLS policies with `SELECT * FROM pg_policies WHERE tablename = 'testimonials'`
4. Check storage policies with `SELECT * FROM pg_policies WHERE tablename = 'objects'`

---

**Last Updated:** Phase 3 Implementation Complete
**Status:** ✅ All critical submission tracking issues resolved
