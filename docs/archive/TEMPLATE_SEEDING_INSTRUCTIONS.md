# Template Seeding Implementation Guide

## Overview
This guide explains how to seed all 28 marketplace templates for the 39 campaign types in NotiProof.

## Files Created
- `MARKETPLACE_TEMPLATES_SEED.sql` - Complete SQL seed file with all templates

## Templates Included

### E-Commerce (8 templates)
1. ✅ Recent Purchase - `recent-purchase`
2. ✅ Cart Additions - `cart-additions`
3. ✅ Product Reviews - `product-reviews`
4. ✅ Low Stock Alert - `low-stock`
5. ✅ Visitor Counter - `visitor-counter`
6. ✅ Recently Viewed - `recently-viewed`
7. ✅ Wishlist Additions - `wishlist-additions`
8. ✅ Flash Sale Timer - `flash-sale`

### SaaS (5 templates)
9. ✅ New Signup - `new-signup`
10. ✅ Trial Start - `trial-starts`
11. ✅ Upgrade Event - `upgrade-events`
12. ✅ Feature Release - `feature-releases`
13. ✅ User Milestone - `user-milestones`

### Services (4 templates)
14. ✅ New Booking - `new-bookings`
15. ✅ Service Request - `service-requests`
16. ✅ Appointment - `appointments`
17. ✅ Contact Form - `contact-form`

### Content/Education (6 templates)
18. ✅ Newsletter - `newsletter-signups`
19. ✅ Content Download - `content-downloads`
20. ✅ Blog Comment - `blog-comments`
21. ✅ Course Enrollment - `course-enrollment`
22. ✅ Course Completion - `completion-milestone`
23. ✅ Social Share - `social-shares`

### Social/Community (3 templates)
24. ✅ Community Join - `community-joins`
25. ✅ Custom Event - `custom-event`

### Non-Profit (3 templates)
26. ✅ Donation - `donation-notification`
27. ✅ Impact Milestone - `impact-milestone`
28. ✅ Volunteer Signup - `volunteer-signup`

## Implementation Steps

### 1. Execute SQL Seed File
Open Supabase SQL Editor and run `MARKETPLACE_TEMPLATES_SEED.sql`:
```bash
# Copy the entire file content and paste into Supabase SQL Editor
# Then click "Run"
```

### 2. Verify Templates
Check that templates were created:
```sql
SELECT name, category, priority, 
       array_length(supported_campaign_types, 1) as campaign_count
FROM marketplace_templates
ORDER BY priority DESC;
```

### 3. Test Template Auto-Selection
The CampaignWizard will now:
- Auto-select templates when 1 match exists
- Show selection UI when multiple matches exist  
- Use fallback generator when 0 matches exist

## What Each Template Includes

Every template has:
- ✅ `template_config` - Position, animation, message template
- ✅ `style_config` - Colors, borders, shadows, typography
- ✅ `display_rules` - Display duration, frequency, triggers
- ✅ `supported_campaign_types` - Array of applicable campaign types
- ✅ `business_types` - Compatible business types
- ✅ `tags` - Searchable keywords
- ✅ `priority` - Ranking (higher = shown first)

## Coverage Map

All 39 campaign types from `campaignTemplates.ts` are covered either directly or through the `custom-event` template which supports all types.

## Next Steps

After seeding:
1. ✅ Templates appear in CampaignWizard Step 4
2. ✅ Templates auto-apply to campaigns
3. ✅ Users can browse in Templates page
4. ✅ Download counts tracked automatically

## Troubleshooting

**No templates showing?**
- Check `is_public = true` in database
- Verify `supported_campaign_types` array format
- Check browser console for errors

**Template not auto-selecting?**
- Ensure campaign type matches exactly
- Check `showAllTemplates` toggle state
- Review console logs for template fetch

**Styles not applying?**
- Verify JSONB format in style_config
- Check that DesignEditor reads configs correctly
- Ensure semantic color tokens exist in index.css
