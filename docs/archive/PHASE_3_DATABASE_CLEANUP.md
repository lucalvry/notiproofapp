# Phase 3: Database Schema Cleanup ✅

**Status:** COMPLETED
**Date:** November 19, 2024

## Overview

Phase 3 focused on cleaning up the database schema by removing version suffixes and consolidating the data source columns into a single canonical `data_sources` JSONB column.

## Objectives

1. ✅ Rename `campaigns.data_sources_v2` → `campaigns.data_sources`
2. ✅ Drop deprecated `campaigns.data_source` (TEXT) column
3. ✅ Add GIN index for query performance
4. ✅ Update all code references to use new column name
5. ✅ Verify RLS policies work with new schema

## Database Changes

### Migration: Add GIN Index
```sql
-- Phase 3.2: Ensure data_sources index exists for query performance
CREATE INDEX IF NOT EXISTS idx_campaigns_data_sources 
  ON campaigns USING GIN (data_sources);
```

**Note:** The column rename from `data_sources_v2` to `data_sources` was already completed in Phases 1-2, so only the index creation was needed.

### Schema Verification

**Before Phase 3:**
- Column existed as `data_sources` (JSONB) - already migrated
- No index on the column

**After Phase 3:**
- Column: `data_sources` (JSONB) ✅
- Index: `idx_campaigns_data_sources` (GIN) ✅
- Old columns: Removed ✅

## Code Changes

### 1. Fixed TypeScript Errors in CampaignDetails.tsx

**Issue:** Undefined variables `hasGA4` and `hasAnnouncements`

**Solution:** Moved data source detection to component state level
```typescript
// Determine campaign data sources
const dataSources = Array.isArray(campaign?.data_sources) ? campaign.data_sources : [];
const hasGA4 = dataSources.some((ds: any) => ds.provider === 'ga4');
const hasAnnouncements = campaign?.campaign_type === 'announcements';
```

### 2. Updated CampaignEditor.tsx

**Changed:**
```typescript
// Before
data_source: "",

// After
data_sources: [],
```

### 3. Updated ReviewActivate.tsx

**Changed:**
```typescript
// Before
data_sources_v2: campaignData.data_sources_v2 || null,

// After
data_sources: campaignData.data_sources || null,
```

### 4. Updated campaignDataSources.ts

**Renamed functions for clarity:**
```typescript
// Before
getDataSourcesForCampaignType()
isDataSourceRelevant()

// After
getAvailableDataSourcesForCampaignType()
isDataSourceCompatible()
```

### 5. Updated Import References

**Files updated:**
- `src/components/campaigns/IntegrationSelector.tsx`
- `src/components/onboarding/IntegrationPathSelector.tsx`

All now use `getAvailableDataSourcesForCampaignType()`

## RLS Policy Verification

### Existing Policies (No Changes Needed)
All RLS policies on the `campaigns` table remain valid and do not reference the old column names:

1. ✅ `Admins can manage all campaigns`
2. ✅ `Users can delete their own campaigns`
3. ✅ `Users can insert their own campaigns`
4. ✅ `Users can update their own campaigns`
5. ✅ `Users can view campaigns in their organizations`
6. ✅ `Users can view their own campaigns`

**Verification:** All policies use `user_id` and `organization_id` for access control, not data source fields.

## Testing Checklist

- [x] Verify index exists: `idx_campaigns_data_sources`
- [x] TypeScript compilation passes
- [x] All imports updated to new function names
- [x] RLS policies verified and working
- [x] Campaign creation works with new schema
- [x] Campaign editing preserves data_sources
- [x] No references to `data_sources_v2` remain in code
- [x] No references to old `data_source` TEXT column

## Performance Impact

### GIN Index Benefits
The new GIN (Generalized Inverted Index) on `data_sources` enables:
- Fast queries filtering by provider: `WHERE data_sources @> '[{"provider": "ga4"}]'`
- Efficient multi-integration campaign lookups
- Better query planning for JSONB operations

### Query Examples
```sql
-- Find all GA4 campaigns (efficient with GIN index)
SELECT * FROM campaigns 
WHERE data_sources @> '[{"provider": "ga4"}]'::jsonb;

-- Find campaigns with multiple integrations
SELECT * FROM campaigns 
WHERE jsonb_array_length(data_sources) > 1;
```

## Migration Notes

### Data Integrity
- All existing campaigns preserved
- Legacy `data_source` values were converted to `data_sources` array format during Phases 1-2
- No data loss occurred

### Rollback (If Needed)
Not applicable - the schema is already migrated. Any rollback would require recreating the old columns and migrating data back, which is not recommended.

## Next Steps

Phase 3 is complete! Ready to proceed to **Phase 4: Documentation & Naming Cleanup**

Phase 4 will:
1. Remove all "V2" references from code comments
2. Update documentation to reflect canonical system
3. Clean up file headers and docstrings
4. Update README files

## Summary

✅ **Database schema is clean and performant**
✅ **All code references updated**
✅ **RLS policies verified**
✅ **TypeScript errors fixed**
✅ **Single canonical `data_sources` column**
✅ **Performance optimized with GIN index**

The campaigns table now has a clean, version-suffix-free schema that supports the unified integration system.
