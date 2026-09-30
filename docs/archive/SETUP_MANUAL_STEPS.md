# 🔧 Manual Configuration Steps for Security Fixes

## ✅ Completed (Automated)
- **P0-1**: ✅ Function search paths fixed via migration
- **P0-2**: ✅ Email service implemented for team invitations

---

## 🚨 P0-3: Configure OTP Expiry (5 minutes)

**Action Required:** Configure in Supabase Dashboard

### Steps:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/ewymvxhpkswhsirdrjub/auth/providers)
2. Navigate to: **Authentication → Settings → Auth Settings**
3. Find "OTP Expiry" setting
4. Set to: **600 seconds** (10 minutes)
5. Click "Save"

**Why?** Reduces attack window for one-time passwords.

---

## 🔥 P1-1: Enable Leaked Password Protection (2 minutes)

**Action Required:** Enable in Supabase Dashboard

### Steps:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/ewymvxhpkswhsirdrjub/auth/providers)
2. Navigate to: **Authentication → Settings → Auth Settings**
3. Find "Leaked Password Protection"
4. Toggle it **ON**
5. Optional: Set minimum password strength to "Fair" or "Good"
6. Click "Save"

**Why?** Prevents users from using passwords exposed in data breaches.

---

## 👑 P1-4: Grant First Superadmin Role (10 minutes)

**Action Required:** Run SQL in Supabase SQL Editor

### Steps:
1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/ewymvxhpkswhsirdrjub/sql/new)
2. Copy and paste the SQL below
3. **IMPORTANT:** Replace `'mrolayokun@gmail.com'` with your actual admin email
4. Run the query

```sql
-- Step 1: Find admin user UUID by email
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'mrolayokun@gmail.com';  -- REPLACE THIS EMAIL!

-- Step 2: Copy the UUID from the result, then replace UUID_HERE below
-- Grant superadmin role (replace UUID_HERE with the actual UUID from Step 1)

INSERT INTO public.user_roles (user_id, role, granted_by)
VALUES (
  'UUID_HERE',  -- REPLACE WITH ACTUAL UUID FROM STEP 1
  'superadmin',
  'UUID_HERE'   -- REPLACE WITH SAME UUID
)
ON CONFLICT (user_id, role) 
DO UPDATE SET role = EXCLUDED.role;

-- Step 3: Verify the role was granted
SELECT u.email, r.role, r.granted_at 
FROM auth.users u
JOIN user_roles r ON u.id = r.user_id
WHERE u.email = 'mrolayokun@gmail.com';  -- REPLACE THIS EMAIL!
```

**Expected Result:** You should see your email with role = 'superadmin'

---

## 📧 P0-2: Configure Email Template (Optional - 15 minutes)

The email service is now implemented, but you can customize the email template:

### Steps:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/ewymvxhpkswhsirdrjub/auth/templates)
2. Navigate to: **Authentication → Email Templates → Magic Link**
3. Customize the template with NotiProof branding
4. Use these template variables:
   - `{{ .ConfirmationURL }}` - The invitation link
   - `{{ .Data.organization_name }}` - Team name
   - `{{ .Data.role }}` - User role
   - `{{ .Data.invited_by }}` - Who sent the invitation

### Example Template:
```html
<h2>You've been invited to {{ .Data.organization_name }}</h2>
<p>{{ .Data.invited_by }} has invited you to join their team as a {{ .Data.role }}.</p>
<p><a href="{{ .ConfirmationURL }}">Accept Invitation</a></p>
<p>This invitation expires in 7 days.</p>
```

---

## ✅ Verification Steps

### After completing P0-3 & P1-1:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/ewymvxhpkswhsirdrjub/database/linter)
2. Navigate to: **Database → Linter**
3. Run the linter
4. Verify these warnings are gone:
   - ✅ "Auth OTP long expiry" - should disappear after P0-3
   - ✅ "Leaked Password Protection Disabled" - should disappear after P1-1

### After completing P1-4:
Run this query in SQL Editor:
```sql
SELECT COUNT(*) as superadmin_count 
FROM user_roles 
WHERE role = 'superadmin';
```
**Expected:** Should return 1 (or more if you have multiple superadmins)

---

## 🎯 Summary

**Time Required:** ~20-30 minutes total

| Task | Time | Priority |
|------|------|----------|
| P0-3: OTP Expiry | 5 min | 🚨 Critical |
| P1-1: Leaked Passwords | 2 min | 🔥 High |
| P1-4: Grant Superadmin | 10 min | 🔥 High |
| Email Template (Optional) | 15 min | ℹ️ Optional |

---

## 🆘 Troubleshooting

**Issue:** Can't find the settings in Supabase Dashboard
- Make sure you're logged into the correct project
- Try refreshing the page
- Clear browser cache if settings don't appear

**Issue:** SQL query returns no results for user
- Double-check the email address
- Verify the user exists: `SELECT * FROM auth.users LIMIT 10;`
- Check for typos in the email

**Issue:** "Insufficient permissions" when running SQL
- Make sure you're using the SQL Editor in Supabase Dashboard
- You should have project owner permissions

---

## 📞 Need Help?

If you encounter any issues:
1. Check the [Supabase Documentation](https://supabase.com/docs)
2. Review the [Security Guide](https://supabase.com/docs/guides/platform/going-into-prod#security)
3. Check function logs in: Database → Edge Functions → Logs
