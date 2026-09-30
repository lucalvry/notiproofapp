# Admin Guide: Managing Campaign Templates

## Overview

This guide explains how to add, update, and manage templates in the NotiProof marketplace_templates system. It covers database structure, template mapping, quality guidelines, and best practices.

## Database Schema

### `marketplace_templates` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Template display name |
| `description` | TEXT | What the template is for |
| `template_config` | JSONB | Notification structure & variables |
| `style_config` | JSONB | Colors, fonts, animations |
| `display_rules` | JSONB | Default targeting rules |
| `supported_campaign_types` | TEXT[] | **IMPORTANT**: Array of campaign type IDs this template supports |
| `business_types` | TEXT[] | Business categories (optional) |
| `priority` | INTEGER | Ranking order (higher = better) |
| `is_public` | BOOLEAN | Visibility flag |
| `is_auto_generated` | BOOLEAN | System-generated vs manually created |
| `download_count` | INTEGER | Usage statistics |
| `rating_average` | DECIMAL | User rating (0-5) |
| `created_at` | TIMESTAMP | Creation date |
| `updated_at` | TIMESTAMP | Last modified |

### Index Configuration

```sql
-- Performance optimization for campaign type filtering
CREATE INDEX idx_marketplace_templates_campaign_types 
ON marketplace_templates USING GIN(supported_campaign_types);

-- Priority ordering
CREATE INDEX idx_marketplace_templates_priority 
ON marketplace_templates(priority DESC, download_count DESC);
```

## Adding New Templates

### Step 1: Determine Campaign Type Support

Review available campaign types in `src/lib/campaignTemplates.ts`:

```typescript
// Examples:
"recent-purchase"        // E-commerce
"course-enrollment"      // Education
"donation-notification"  // NGO
"account-signup"         // Finance/SaaS
// ... 39 total types
```

### Step 2: Create Template Configuration

#### Template Config Structure
```json
{
  "notificationType": "popup",
  "messageTemplate": "{{userName}} just {{action}} {{item}}",
  "variables": {
    "userName": "Customer name",
    "action": "purchased",
    "item": "product name"
  },
  "requiredDataFields": ["user_name", "action", "product_name"],
  "displayDuration": 5000,
  "position": "bottom-left"
}
```

#### Style Config Structure
```json
{
  "backgroundColor": "#10B981",
  "textColor": "#FFFFFF",
  "borderRadius": "8px",
  "fontSize": "14px",
  "fontWeight": "500",
  "animation": "slide-in",
  "icon": "🎉",
  "shadow": "lg"
}
```

#### Display Rules Structure
```json
{
  "urlRules": {
    "includedPages": ["/product/*"],
    "excludedPages": ["/checkout"]
  },
  "deviceTargeting": ["desktop", "mobile"],
  "geoTargeting": {
    "countries": []
  },
  "scheduleTargeting": {
    "daysOfWeek": [1,2,3,4,5,6,0],
    "timeRanges": []
  }
}
```

### Step 3: Insert Template via SQL

```sql
INSERT INTO marketplace_templates (
  name,
  description,
  template_config,
  style_config,
  display_rules,
  supported_campaign_types,
  business_types,
  priority,
  is_public,
  is_auto_generated,
  download_count,
  rating_average
) VALUES (
  'Shopify Sales Alert',
  'Show recent purchases to build trust and create urgency for e-commerce stores',
  '{"notificationType": "popup", "messageTemplate": "{{userName}} from {{location}} just purchased {{productName}}", ...}',
  '{"backgroundColor": "#10B981", "textColor": "#FFFFFF", ...}',
  '{"urlRules": {...}, "deviceTargeting": ["desktop", "mobile"]}',
  ARRAY['recent-purchase', 'low-stock', 'trending-item'],
  ARRAY['ecommerce', 'retail'],
  100,
  true,
  false,
  0,
  5.0
);
```

### Step 4: Verify Template

```sql
-- Check template exists and is queryable
SELECT id, name, supported_campaign_types, priority
FROM marketplace_templates
WHERE name = 'Shopify Sales Alert';

-- Test campaign type filtering (as the app does)
SELECT name, supported_campaign_types
FROM marketplace_templates
WHERE 'recent-purchase' = ANY(supported_campaign_types)
ORDER BY priority DESC, download_count DESC;
```

## Mapping Templates to Campaign Types

### Campaign Type Coverage Matrix

| Campaign Type | Template Count | Priority Template | Status |
|--------------|----------------|-------------------|--------|
| recent-purchase | 3 | Shopify Sales Alert | ✅ Complete |
| course-enrollment | 2 | Student Enrollment Alert | ✅ Complete |
| donation-notification | 1 | Donation Alert | ✅ Complete |
| live-counter | 0 | *Auto-generated* | ⚠️ Needs template |

### Adding Campaign Type Support to Existing Template

```sql
-- Add 'cart-abandonment' support to existing template
UPDATE marketplace_templates
SET 
  supported_campaign_types = array_append(supported_campaign_types, 'cart-abandonment'),
  updated_at = NOW()
WHERE name = 'Shopify Sales Alert';

-- Add multiple campaign types at once
UPDATE marketplace_templates
SET 
  supported_campaign_types = ARRAY['recent-purchase', 'cart-abandonment', 'low-stock', 'trending-item'],
  updated_at = NOW()
WHERE name = 'E-commerce Bundle Template';
```

### Removing Campaign Type Support

```sql
-- Remove specific campaign type
UPDATE marketplace_templates
SET 
  supported_campaign_types = array_remove(supported_campaign_types, 'old-campaign-type'),
  updated_at = NOW()
WHERE id = 'template-uuid';
```

## Template Quality Guidelines

### Visual Design Standards

#### Color Palettes by Category
- **E-commerce**: Primary: Green (#10B981), Accent: Orange (#F59E0B)
- **SaaS**: Primary: Blue (#3B82F6), Accent: Purple (#8B5CF6)
- **Education**: Primary: Purple (#8B5CF6), Accent: Pink (#EC4899)
- **NGO**: Primary: Orange (#F97316), Accent: Warm Yellow (#FCD34D)
- **Healthcare**: Primary: Teal (#14B8A6), Accent: Calm Blue (#06B6D4)
- **Finance**: Primary: Navy (#1E40AF), Accent: Gold (#F59E0B)

#### Typography
- **Font sizes**: 12px-16px for body, 18px-24px for headlines
- **Font weights**: 400 (regular), 500 (medium), 600 (semibold)
- **Line height**: 1.5 for readability

#### Accessibility
- **Contrast ratio**: Minimum 4.5:1 for normal text, 3:1 for large text
- **Touch targets**: Minimum 44x44px for interactive elements
- **Focus indicators**: Visible 2px outline on all focusable elements

### Content Guidelines

#### Template Names
- ✅ **Good**: "Shopify Sales Alert", "Course Completion Badge"
- ❌ **Bad**: "Template 1", "Notification Thing"

#### Descriptions
- ✅ **Good**: "Show recent purchases to build trust and create urgency for e-commerce stores"
- ❌ **Bad**: "A template for sales"

#### Variable Names
- Use camelCase: `userName`, `productName`, `actionText`
- Be descriptive: `purchaseAmount` not `amt`
- Document in template_config.variables

### Priority Scoring System

| Priority | Use Case | Example |
|----------|----------|---------|
| 100+ | Premium, high-converting templates | "Shopify Sales Alert" |
| 75-99 | Solid, proven templates | "Student Enrollment Alert" |
| 50-74 | Good templates, niche use cases | "Music Album Release" |
| 25-49 | Basic templates, needs improvement | "Generic Notification" |
| 1-24 | Experimental or draft templates | "Beta Template" |

## Auto-Generated Templates

### How They Work

When a user selects a campaign type with no matching templates:

1. System calls `generateDefaultTemplateForCampaignType(campaignTypeId)`
2. Looks up campaign type in `CAMPAIGN_TEMPLATES` constant
3. Generates template_config from campaign type's structure
4. Applies category-based style_config (colors, fonts)
5. Creates template object with `is_auto_generated: true`
6. Returns template (not saved to database)

### Auto-Generated Template Structure

```typescript
{
  id: 'auto-gen-' + campaignTypeId + '-' + Date.now(),
  name: 'Auto-Generated: ' + campaignTypeName,
  description: 'Automatically generated template optimized for ' + campaignTypeName,
  template_config: { /* from campaign type */ },
  style_config: { /* from category defaults */ },
  display_rules: { /* sensible defaults */ },
  supported_campaign_types: [campaignTypeId],
  is_auto_generated: true,
  is_public: true,
  priority: 50,
  download_count: 0,
  rating_average: null
}
```

### Converting Auto-Generated to Manual

If users love an auto-generated template, save it to the database:

```sql
INSERT INTO marketplace_templates (
  name,
  description,
  template_config,
  style_config,
  display_rules,
  supported_campaign_types,
  priority,
  is_public,
  is_auto_generated -- Set to false
) VALUES (
  'Promoted Auto-Gen Template',
  'Originally auto-generated, now manually curated',
  '{ ... }',
  '{ ... }',
  '{ ... }',
  ARRAY['campaign-type'],
  75,
  true,
  false -- Now a manual template
);
```

## Testing & Validation

### Pre-Launch Checklist

- [ ] Template renders correctly on desktop (1920x1080)
- [ ] Template renders correctly on mobile (375x667)
- [ ] All variables are populated with demo data
- [ ] Animation works smoothly (no jank)
- [ ] Colors meet accessibility contrast requirements
- [ ] Template config JSON is valid
- [ ] Style config JSON is valid
- [ ] Display rules JSON is valid
- [ ] supported_campaign_types array is not empty
- [ ] Priority is set appropriately
- [ ] Description is clear and helpful

### Testing SQL Query

```sql
-- Test the exact query used by the app
WITH campaign_type AS (
  SELECT 'recent-purchase' AS type
)
SELECT 
  m.id,
  m.name,
  m.description,
  m.supported_campaign_types,
  m.priority,
  m.download_count,
  m.rating_average
FROM marketplace_templates m, campaign_type ct
WHERE 
  m.is_public = true
  AND ct.type = ANY(m.supported_campaign_types)
ORDER BY 
  m.priority DESC,
  m.download_count DESC
LIMIT 50;
```

### Performance Testing

```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT *
FROM marketplace_templates
WHERE 'recent-purchase' = ANY(supported_campaign_types)
ORDER BY priority DESC, download_count DESC;
```

Expected performance:
- Query time: < 50ms
- Index usage: GIN index on supported_campaign_types
- Rows scanned: Only matching templates (not full table)

## Maintenance Tasks

### Weekly
- [ ] Review new templates added
- [ ] Check download counts and update priorities
- [ ] Monitor user ratings
- [ ] Fix any broken template configs

### Monthly
- [ ] Audit campaign type coverage (gaps?)
- [ ] Update style configs with new design trends
- [ ] Optimize underperforming templates
- [ ] Archive unused templates

### Quarterly
- [ ] Full template library review
- [ ] Update priority rankings based on performance
- [ ] Add templates for new campaign types
- [ ] Refresh outdated designs

## Rollback Strategy

### If Issues Occur

1. **Identify Problem Template**
```sql
-- Find recently added/modified templates
SELECT id, name, updated_at
FROM marketplace_templates
WHERE updated_at > NOW() - INTERVAL '1 day'
ORDER BY updated_at DESC;
```

2. **Disable Template Temporarily**
```sql
UPDATE marketplace_templates
SET is_public = false
WHERE id = 'problematic-template-uuid';
```

3. **Fix and Re-Enable**
```sql
-- After fixing
UPDATE marketplace_templates
SET 
  is_public = true,
  -- Fix other fields as needed
  updated_at = NOW()
WHERE id = 'fixed-template-uuid';
```

### Nuclear Option: Fallback to Auto-Generation

If the entire template system fails, the auto-generator ensures users can always create campaigns. No database templates are required.

## Common Issues & Solutions

### Issue: Template Not Showing for Campaign Type

**Check:**
```sql
-- Verify template has correct campaign type
SELECT supported_campaign_types
FROM marketplace_templates
WHERE name = 'Template Name';

-- Check if array contains expected type
SELECT 'recent-purchase' = ANY(supported_campaign_types)
FROM marketplace_templates
WHERE name = 'Template Name';
```

**Fix:**
```sql
UPDATE marketplace_templates
SET supported_campaign_types = array_append(supported_campaign_types, 'missing-type')
WHERE name = 'Template Name';
```

### Issue: Template Always Shows as "Best Match"

**Cause:** Highest priority or only template for that type

**Fix:** Adjust priority or add competing templates
```sql
UPDATE marketplace_templates
SET priority = 75
WHERE name = 'Template Name';
```

### Issue: Template Config Invalid JSON

**Check:**
```sql
-- Validate JSON
SELECT 
  name,
  template_config::jsonb AS valid_config
FROM marketplace_templates
WHERE name = 'Template Name';
```

**Fix:** Re-save with valid JSON (use online JSON validator)

## Best Practices Summary

### ✅ Do:
- Map templates to ALL relevant campaign types
- Set appropriate priority values
- Write clear descriptions
- Test on multiple devices
- Use category-appropriate colors
- Include comprehensive variable documentation
- Keep template configs consistent

### ❌ Don't:
- Leave supported_campaign_types empty
- Use generic template names
- Ignore accessibility guidelines
- Hard-code values (use variables)
- Create templates without testing
- Forget to update priority after user feedback
- Use ambiguous variable names

## Support & Resources

- **Campaign Types Reference**: `src/lib/campaignTemplates.ts`
- **Auto-Generator Code**: `generateDefaultTemplateForCampaignType()` function
- **Wizard Logic**: `src/components/campaigns/CampaignWizard.tsx`
- **Database Migrations**: `supabase/migrations/`
- **Template Filtering Logic**: Lines 133-198 in CampaignWizard.tsx

---

**Questions?** Review the code comments and check existing templates in the database for examples.
