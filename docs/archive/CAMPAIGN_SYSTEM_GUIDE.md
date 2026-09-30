# Canonical Campaign System Guide

## Overview

The Canonical Campaign System is NotiProof's unified architecture for creating and managing social proof campaigns. It provides a single, consistent interface for all campaign types, integrations, and data sources.

## Architecture

### Core Components

1. **Unified Integration System** (`src/lib/integrations/`)
   - Central adapter registry
   - Provider-specific adapters (Shopify, Stripe, WooCommerce, etc.)
   - Canonical event normalization
   - Template-ready field mapping

2. **Template Engine** (`src/lib/templateEngine.ts`)
   - Mustache-based rendering
   - Provider-specific templates
   - Auto-mapping capabilities
   - Field validation

3. **Campaign Wizard** (`src/components/campaigns/CampaignWizard.tsx`)
   - 5-step campaign creation flow
   - Multi-integration support
   - Template selection and mapping
   - Orchestration configuration

4. **Orchestration Layer** (`src/components/campaigns/playlist/`)
   - Playlist management
   - Priority-based sequencing
   - Frequency capping
   - Conflict resolution

## Integration Adapters

Each adapter implements the `IntegrationAdapter` interface and provides:

- **Connection**: OAuth, API key, or webhook setup
- **Available Fields**: List of normalized fields the adapter provides
- **Normalization**: Transform raw provider events to canonical format
- **Sample Events**: Test data for previews
- **Validation**: Event authenticity checks

### Available Adapters

| Adapter | Provider | Category | Description |
|---------|----------|----------|-------------|
| ShopifyAdapter | shopify | E-commerce | Product purchases, cart events |
| WooCommerceAdapter | woocommerce | E-commerce | Order completions |
| StripeAdapter | stripe | Payments | Subscriptions, payments |
| TestimonialAdapter | testimonials | Social Proof | Customer reviews |
| AnnouncementAdapter | announcements | Native | Marketing announcements |
| InstantCaptureAdapter | instant_capture | Native | Real-time actions |
| LiveVisitorsAdapter | live_visitors | Native | Visitor counts |

## Campaign Creation Flow

### Step 1: Website Gate
- Select target website
- Validates website exists
- Sets website context

### Step 2: Integration Selection
- Choose integration(s)
- Multiple integrations supported
- Connection status displayed

### Step 3: Template Selection
- Browse provider-specific templates
- Preview with sample data
- Filter by category/style

### Step 4: Field Mapping
- Auto-map adapter fields to template placeholders
- Manual override available
- Validation feedback

### Step 5: Orchestration
- Configure display rules
- Set priority and frequency caps
- Define sequencing rules

## Data Flow

```
Integration → Adapter → Canonical Event → Template Engine → Widget Display
     ↓           ↓            ↓                ↓                  ↓
  Raw Data   Normalize   Standardized      Mustache          Shadow DOM
             Fields       Format            Render            Isolated
```

### Canonical Event Structure

```typescript
{
  event_id: string;
  provider: string;
  provider_event_type: string;
  timestamp: string; // ISO 8601
  payload: Record<string, any>; // Raw data
  normalized: {
    'template.field_name': any
  }
}
```

## Template System

### Template Structure

Templates are stored in the `templates` table with:

- **provider**: Which adapter provides data
- **template_key**: Unique identifier
- **style_variant**: compact | card | toast | hero | carousel | video
- **required_fields**: Array of normalized field keys
- **html_template**: Mustache template string
- **preview_json**: Sample data for previews

### Template Rendering

```typescript
renderTemplate(template, canonicalEvent) → HTML
```

The template engine:
1. Extracts required fields from template
2. Validates event has all required fields
3. Renders Mustache template with normalized data
4. Returns HTML for widget display

## Orchestration

### Playlists

Group multiple campaigns with:
- Drag-drop ordering
- Priority weighting
- Sequencing modes (priority, sequential, random)
- Conflict resolution strategies

### Frequency Capping

Control notification frequency per user:
```typescript
frequency_cap: {
  per_user: number;      // Max per user
  per_session: number;   // Max per session
  time_window: number;   // Minutes
}
```

### Targeting Rules

Fine-tune campaign display with:
- URL rules (contains, starts_with, matches)
- Geographic targeting
- Device targeting
- Behavior targeting
- Schedule targeting

## Database Schema

### Key Tables

**campaigns**
- `data_sources`: JSONB array of integration sources
- `template_id`: FK to templates
- `template_mapping`: Field mapping configuration
- `priority`: Display priority (0-100)
- `frequency_cap`: Frequency control settings
- `native_config`: Native integration settings

**integrations**
- `provider`: Integration type
- `credentials`: Encrypted connection data
- `is_active`: Connection status

**templates**
- `provider`: Target integration
- `html_template`: Mustache template
- `required_fields`: Template dependencies

**campaign_playlists**
- `campaign_order`: Array of campaign IDs
- `rules`: Orchestration rules

## Widget Integration

### Widget Script (`public/noti.js`)

Features:
- Shadow DOM isolation
- Multi-campaign support
- Playlist orchestration
- Frequency cap enforcement
- Visitor state tracking
- Testimonial rendering (text, image, video, carousel)

### Widget API (`supabase/functions/widget-api/`)

Endpoints:
- `GET /widget-api?website_id={id}` - Single campaign mode
- `GET /widget-api?website_id={id}&playlist_mode=true` - Playlist mode

Returns:
- Active campaigns
- Events for each campaign
- Orchestration rules
- Frequency cap settings

## Testing

### Unit Tests
- Adapter normalization
- Template rendering
- Field mapping logic

### Integration Tests
- Campaign creation flow
- Multi-integration campaigns
- Template system

### E2E Tests
- Complete campaign lifecycle
- Widget display
- Orchestration rules

## Best Practices

1. **Use Adapters**: Always go through adapters, never bypass
2. **Normalize Early**: Convert to canonical format immediately
3. **Validate Templates**: Check required fields before rendering
4. **Test Orchestration**: Verify priority and frequency logic
5. **Monitor Performance**: Track widget load times

## Migration Guide

### From Legacy System

1. Campaigns with old `data_source` (TEXT) are auto-migrated
2. Template mapping is preserved
3. Orchestration settings are compatible
4. Widget automatically supports both formats

### Feature Flags

- `v2_canonical_system`: Master toggle for canonical system
- `testimonial_system`: Testimonial collection and moderation

## Troubleshooting

### Common Issues

**Template not rendering**
- Check required_fields match adapter output
- Validate field mapping configuration
- Verify event has normalized data

**Events not showing**
- Check integration connection status
- Verify campaign status is "active"
- Check frequency cap limits
- Review targeting rules

**Orchestration conflicts**
- Review playlist priorities
- Check frequency caps
- Verify sequencing mode

## API Reference

### AdapterRegistry

```typescript
adapterRegistry.get(provider: string) → IntegrationAdapter
adapterRegistry.getAll() → IntegrationAdapter[]
adapterRegistry.has(provider: string) → boolean
adapterRegistry.getByCategory(category) → IntegrationAdapter[]
```

### Template Engine

```typescript
renderTemplate(template, event) → string
validateEventForTemplate(event, template) → boolean
renderTemplatePreview(template) → string
buildTemplateMapping(adapter, template) → object
```

## Future Enhancements

- [ ] AI-powered template generation
- [ ] Advanced A/B testing
- [ ] Multi-language support
- [ ] Video testimonials with transcription
- [ ] Advanced analytics dashboard
- [ ] Conversion attribution modeling

## Resources

- [Phase 0-8 Implementation Docs](./PHASE_0_12_AUDIT.md)
- [Template System Guide](./TEMPLATE_SYSTEM_IMPLEMENTATION.md)
- [Testing Guide](./TESTING.md)
- [Rollback Plan](./ROLLBACK_PLAN.md)

---

*Last Updated: November 19, 2024*
*Status: Production Ready*
