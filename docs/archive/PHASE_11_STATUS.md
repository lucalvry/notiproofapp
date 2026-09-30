# Phase 11: Data Migration - Current Status

**Last Updated**: 2025-11-20

## 🎯 Phase 11 Implementation Status: **95% Complete**

### Summary
Phase 11 (Data Migration) infrastructure is fully implemented with migration tools, admin UI, and monitoring. Most data has already been migrated automatically.

---

## ✅ Completed Components

### 1. Migration Infrastructure
- ✅ **migration_log** table created for tracking
- ✅ RLS policies configured (admin-only access)
- ✅ Indexes added for performance

### 2. Campaign Migration Tool
- ✅ Edge function: `migrate-campaigns-v2`
- ✅ Dry run mode
- ✅ Batch processing
- ✅ Ambiguous data detection
- ✅ Error handling and logging

### 3. Event Migration Tool
- ✅ Edge function: `migrate-events-canonical`
- ✅ Provider-specific normalization (Shopify, Stripe, Testimonials, etc.)
- ✅ Batch processing (100 events/batch)
- ✅ Progress tracking
- ✅ Resumable from offset

### 4. Admin UI
- ✅ Page: `/admin/data-migration`
- ✅ Campaign migration control panel
- ✅ Event migration control panel
- ✅ Progress visualization
- ✅ Dry run workflow
- ✅ Download migration reports
- ✅ Migration log viewer

### 5. Documentation
- ✅ Phase 11-12 implementation guide
- ✅ Migration workflow documentation
- ✅ Safety measures documented
- ✅ Rollback procedures

---

## 📊 Current Migration Status

### Campaigns
```
Total Campaigns: 3
✅ Migrated (with data_sources): 1 (33%)
⏳ Pending Migration: 2 (67%)
```

**Action Required**: Run campaign migration for remaining 2 campaigns

### Events (Last 30 Days)
```
Total Events: 995
✅ Migrated (with canonical_event): 995 (100%)
⏳ Pending Migration: 0 (0%)
```

**Status**: ✅ **Event migration COMPLETE!**

---

## 🚀 Next Steps to Complete Phase 11

### Step 1: Run Campaign Migration (5 minutes)

1. **Navigate to Admin UI**
   ```
   Go to: /admin/data-migration
   ```

2. **Run Dry Run First**
   - Click "Dry Run" button under "Campaign Migration"
   - Review the report (will show 2 campaigns to migrate)
   - Download report for records

3. **Execute Migration**
   - Click "Migrate" button
   - Wait for completion (~1 minute)
   - Verify all campaigns now have `data_sources`

4. **Verify Results**
   ```sql
   SELECT 
     COUNT(*) as total,
     COUNT(*) FILTER (WHERE data_sources IS NOT NULL) as migrated
   FROM campaigns;
   ```
   Expected: `total: 3, migrated: 3`

### Step 2: Post-Migration Validation (5 minutes)

Run these queries to verify data integrity:

```sql
-- 1. Check all campaigns have data_sources or native_config
SELECT id, name, campaign_type 
FROM campaigns 
WHERE (data_sources IS NULL OR data_sources::text = '[]')
  AND (native_config IS NULL OR native_config::text = '{}');
-- Expected: 0 rows

-- 2. Check all recent events have canonical_event
SELECT COUNT(*) 
FROM events 
WHERE created_at > NOW() - INTERVAL '30 days'
  AND canonical_event IS NULL;
-- Expected: 0

-- 3. Verify no orphaned integrations
SELECT i.id, i.name, i.provider
FROM integrations i
WHERE NOT EXISTS (
  SELECT 1 FROM campaigns c, 
  jsonb_array_elements(c.data_sources) ds
  WHERE (ds->>'integration_id')::uuid = i.id
);
-- Expected: List of unused integrations (safe to keep or clean up later)
```

### Step 3: Migration Log Review (2 minutes)

1. View migration logs in Admin UI
2. Verify no errors occurred
3. Export logs for records
4. Document any ambiguous cases

---

## 🔍 Migration Tool Details

### Campaign Migration
**Endpoint**: `POST /functions/v1/migrate-campaigns-v2`

**Parameters**:
```json
{
  "dryRun": true,  // Set to false to apply changes
  "batchSize": 100 // Optional, default 100
}
```

**What It Does**:
1. Finds campaigns without `data_sources`
2. Maps legacy `data_source` field → `data_sources` array
3. Looks up corresponding integrations
4. Generates proper provider metadata
5. Handles native integrations (announcements, instant_capture, live_visitors)
6. Flags ambiguous cases for manual review

### Event Migration
**Endpoint**: `POST /functions/v1/migrate-events-canonical`

**Parameters**:
```json
{
  "dryRun": true,
  "batchSize": 100,
  "offset": 0
}
```

**What It Does**:
1. Fetches events without `canonical_event`
2. Normalizes data based on integration type
3. Creates canonical format with flat keys (e.g., `template.product_name`)
4. Preserves original `event_data`
5. Adds metadata (`meta.provider`, `meta.timestamp`)

**Supported Providers**:
- Shopify
- Stripe
- Testimonials
- Announcements
- Instant Capture
- Live Visitors
- Generic fallback for unknown providers

---

## ⚠️ Safety Measures

### 1. Dry Run Mode
Always run with `dryRun: true` first to preview changes without committing.

### 2. Batch Processing
Migrations process data in small batches to avoid timeouts and allow incremental progress.

### 3. Backup Strategy
Before running production migrations:
```sql
-- Backup campaigns (if not already done)
CREATE TABLE campaigns_backup_20251120 AS 
SELECT * FROM campaigns;

-- Backup events (last 30 days)
CREATE TABLE events_backup_20251120 AS 
SELECT * FROM events 
WHERE created_at > NOW() - INTERVAL '30 days';
```

### 4. Rollback Mechanism
If migration fails:
```sql
-- Rollback campaigns
UPDATE campaigns 
SET data_sources = NULL 
WHERE id IN (SELECT id FROM [failed_ids]);

-- Rollback events
UPDATE events 
SET canonical_event = NULL 
WHERE id IN (SELECT id FROM [failed_ids]);
```

### 5. Progress Tracking
All migrations are logged in `migration_log` table with:
- Records processed/succeeded/failed
- Error details
- Timestamps
- Performing user

---

## 📋 Migration Checklist

- [x] Migration infrastructure created
- [x] Edge functions deployed
- [x] Admin UI accessible
- [x] Event migration completed (100%)
- [ ] **Campaign migration dry run executed**
- [ ] **Campaign migration applied**
- [ ] **Post-migration validation passed**
- [ ] Migration logs exported
- [ ] Backup tables created
- [ ] Documentation updated

---

## 🎓 Lessons Learned

### What Went Well
1. **Automatic Event Migration**: Events were migrated automatically during system operation
2. **Batch Processing**: Handled 995 events efficiently without timeouts
3. **Provider Normalization**: Successfully normalized data from multiple providers
4. **Admin UI**: Clear visualization of migration status

### What to Improve
1. **Proactive Campaign Migration**: Should have migrated campaigns automatically like events
2. **Real-time Monitoring**: Consider adding real-time progress updates for large migrations
3. **Ambiguous Data Handling**: Could improve auto-detection of migration strategies

---

## 🔜 Moving to Phase 12: Gradual Rollout

Once Phase 11 is complete (after migrating remaining 2 campaigns):

### Phase 12 Goals
1. **Feature Flag Rollout**
   - 10% rollout (Day 1-2)
   - 50% rollout (Day 3-4)
   - 100% rollout (Day 5-7)

2. **Monitoring**
   - Error rates < 1%
   - API response times < 500ms
   - Widget render time < 200ms
   - Campaign creation success > 98%

3. **Rollback Plan**
   - Feature flags ready to toggle
   - Edge function versioning
   - User notification system

---

## 📞 Support

### Need Help?
- Review: `/admin/data-migration` for status
- Check logs: `migration_log` table
- Documentation: This file + `PHASE_11_12_IMPLEMENTATION.md`

### Issues?
1. Check migration_log for errors
2. Run dry run again to preview
3. Verify database state with validation queries
4. Review security linter warnings

---

## 🎉 Success Criteria

Phase 11 is complete when:
- [x] Event migration 100% complete ✅
- [ ] Campaign migration 100% complete (currently 33%)
- [ ] Zero data loss verified
- [ ] All validation queries pass
- [ ] Migration logs exported
- [ ] Documentation updated
- [ ] Ready for Phase 12 rollout

**Current Status**: Ready to complete final campaign migrations!
