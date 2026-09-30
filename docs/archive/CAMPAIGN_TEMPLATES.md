# Campaign Template System

## Overview

The NotiProof campaign wizard includes an intelligent template matching system that automatically recommends the best templates based on your selected campaign type. This ensures you get the most relevant and effective notification design for your specific use case.

## How Template Selection Works

### Step-by-Step Process

1. **Choose Campaign Type** (Step 1)
   - Select from 39+ specialized campaign types
   - Examples: Recent Purchase, Course Enrollment, Donation Notification, etc.

2. **Smart Template Matching** (Step 4)
   - System automatically filters templates that match your campaign type
   - Templates are ranked by priority and popularity (download count)
   - Only relevant templates are shown by default

3. **Auto-Selection Logic**
   - **Single Match**: If only one template perfectly matches, it's automatically selected for you
   - **Multiple Matches**: You can choose from all matching templates
   - **No Matches**: System auto-generates a template optimized for your campaign type
   - **Show All**: Toggle to see all available templates (with a warning for non-matching ones)

### Template Matching Example

```
Campaign Type: "Recent Purchase" (E-commerce)
↓
Filtered Templates:
✓ "Shopify Sales Alert" (Best Match)
✓ "E-commerce Purchase Pop"
✓ "Store Sales Tracker"
```

## Understanding Template Cards

Each template card shows:

- **Template Name**: Clear, descriptive title
- **Best Match Badge**: 🏆 Appears on the top-ranked template for your campaign type
- **Auto-Generated Badge**: Indicates templates created automatically by the system
- **Description**: What the template is designed for
- **Supported Campaign Types**: Shows which campaign types this template supports (up to 3 displayed)
- **Rating**: Average user rating (out of 5 stars)
- **Download Count**: How many times this template has been used

## Template Quality Indicators

### Best Match
Templates marked with the "Best Match" badge are:
- Specifically designed for your campaign type
- Highly rated by other users
- Proven to work well for similar use cases

### Auto-Generated
Auto-generated templates are:
- Created on-the-fly when no pre-made templates match
- Based on your campaign type's requirements
- Fully customizable in the Design Editor
- Perfect starting points that you can refine

## Using the "Show All Templates" Toggle

### When to Use It
- You want to explore templates from other campaign types
- You're looking for design inspiration
- You prefer a specific visual style over type-specific matching

### Important Warning
⚠️ When showing all templates, you'll see designs that may not match your campaign type perfectly. They might:
- Miss required data fields for your campaign
- Use incorrect messaging for your use case
- Need significant customization to work properly

### Best Practice
Start with recommended templates, then explore "Show All" only if you need different design inspiration.

## Template Customization Flow

After selecting a template:

1. **Template Selected** → Automatically populates Design Editor
2. **Design Editor** (Step 5) → Customize colors, fonts, animations
3. **Rules & Targeting** (Step 6) → Configure when/where to show
4. **Review & Activate** (Step 7) → Launch your campaign

## Template Count Indicators

The system shows helpful context:
- `"1 template available for this campaign type"` - Perfect match found
- `"Showing 3 templates optimized for Recent Purchase"` - Multiple matches
- `"Using auto-generated template"` - Custom template created for you
- `"Showing 20 templates (all)"` - Filter bypassed, all templates visible

## Campaign Type Categories

Templates are organized by business category:

### E-commerce
- Recent purchases, cart actions, inventory alerts
- **Style**: Green/urgency colors, action-oriented

### SaaS
- Signups, upgrades, feature launches
- **Style**: Blue/professional, trust-building

### Education
- Enrollments, completions, live learners
- **Style**: Purple/academic, achievement-focused

### NGO/Non-Profit
- Donations, impact milestones, volunteer signups
- **Style**: Orange/warm, community-driven

### Healthcare
- Appointments, health tips, service updates
- **Style**: Teal/trust, calm and professional

### Finance/Fintech
- Account activities, transactions, security
- **Style**: Navy/secure, confidence-building

## Troubleshooting

### "Failed to load templates" Error

**Causes:**
- Network connectivity issues
- Database query timeout
- Supabase service disruption

**Solutions:**
1. Click the "Retry" button to attempt fetching again
2. Check your internet connection
3. If issues persist, click "Skip to Design Editor" to create from scratch

### No Templates Found

**This is normal when:**
- You selected a very specific campaign type with no pre-made templates
- The auto-generator will create a custom template for you
- You can still customize everything in the Design Editor

### Template Doesn't Match My Needs

**Options:**
1. Toggle "Show All Templates" to explore other designs
2. Continue to Design Editor and customize from scratch
3. Select a different campaign type if you chose incorrectly

## Performance Tips

- Template fetch is optimized for speed (typically < 500ms)
- Templates are cached after first load
- Switching between "Recommended" and "Show All" is instant
- Auto-generated templates are created in real-time (< 100ms)

## Accessibility

- All templates meet WCAG 2.1 AA contrast requirements
- Screen reader support for template selection
- Keyboard navigation fully supported
- Focus indicators on all interactive elements

## Best Practices

### ✅ Do:
- Start with recommended templates for your campaign type
- Review multiple templates if available
- Check supported campaign types before selecting
- Customize templates in the Design Editor

### ❌ Don't:
- Skip template selection without reviewing options
- Use templates from very different campaign types without customization
- Ignore the "Best Match" indicator
- Proceed without understanding what data fields the template needs

## Need Help?

- **Templates not loading?** Try the retry button or skip to Design Editor
- **Can't find the right template?** Auto-generated templates are a great starting point
- **Want a custom design?** All templates are fully customizable in the next step
- **Need more templates?** Check back regularly - new templates are added frequently

---

**Next Steps:**
1. Select your campaign type carefully
2. Review recommended templates
3. Choose the best match or let the system auto-generate
4. Customize in the Design Editor
5. Launch your campaign!
