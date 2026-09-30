# Rollback Plan: Campaign Template System

## Overview

This document outlines the rollback strategy if issues occur with the smart template filtering system. It provides step-by-step procedures to revert changes while maintaining service availability.

## Risk Assessment

### Low Risk Changes
- ✅ UI enhancements (badges, indicators, toggles)
- ✅ Auto-generated template system (client-side only)
- ✅ Template fetch filtering (read-only queries)
- ✅ Error handling improvements

### Medium Risk Changes
- ⚠️ Database schema changes (supported_campaign_types column)
- ⚠️ Template count display logic
- ⚠️ Auto-selection behavior

### High Risk Changes
- ❌ None in this implementation

## Pre-Rollback Checklist

Before initiating rollback:

1. **Identify the Issue**
   - [ ] Determine which phase/component is causing problems
   - [ ] Check error logs in browser console
   - [ ] Review Supabase logs for database errors
   - [ ] Document the specific failure scenario

2. **Assess Impact**
   - [ ] How many users are affected?
   - [ ] Are campaigns still being created successfully?
   - [ ] Is the wizard completely broken or just degraded?
   - [ ] Are existing campaigns functioning normally?

3. **Communicate**
   - [ ] Notify team of issue and pending rollback
   - [ ] Prepare user-facing message if needed
   - [ ] Document timeline for resolution

## Rollback Procedures

### Phase 5 UI/UX Rollback

**Issue**: UI enhancements causing confusion or visual bugs

**Rollback Steps**:

1. Revert CampaignWizard.tsx to previous version:
```bash
git log --oneline src/components/campaigns/CampaignWizard.tsx
git checkout <previous-commit-hash> src/components/campaigns/CampaignWizard.tsx
```

2. Remove Phase 5 features:
   - Campaign type context display
   - Template count indicators
   - "Show All Templates" toggle
   - Best Match badges
   - Supported campaign types badges

3. Test basic wizard flow:
   - [ ] Can select campaign type
   - [ ] Templates load correctly
   - [ ] Can proceed through all steps
   - [ ] Campaign creates successfully

**Estimated Time**: 10 minutes  
**User Impact**: Minimal - templates still work, just less polish

---

### Phase 6 Error Handling Rollback

**Issue**: Retry mechanism or error states causing problems

**Rollback Steps**:

1. Remove error handling additions:
   - Remove `templateFetchError` state
   - Remove `retryCount` state
   - Remove `retryFetchTemplates` function
   - Restore simple try/catch in useEffect

2. Original error handling:
```typescript
catch (error) {
  console.error('Error fetching templates:', error);
  toast.error('Failed to load templates');
  setTemplates([]);
}
```

3. Test error scenarios:
   - [ ] Network failure shows generic error
   - [ ] Templates still load when available
   - [ ] Wizard doesn't crash

**Estimated Time**: 15 minutes  
**User Impact**: Low - users lose retry button but templates still load

---

### Database Schema Rollback

**Issue**: supported_campaign_types column causing query failures

**Critical Path**: This is the highest priority rollback

**Rollback Steps**:

1. **Option A: Disable Filtering** (Fastest - 5 minutes)
```typescript
// In CampaignWizard.tsx useEffect
// Comment out the filtering logic:
// if (campaignData.type && !showAllTemplates) {
//   query = query.contains('supported_campaign_types', [campaignData.type]);
// }

// All templates always shown
```

2. **Option B: Revert Column** (Slower - 30 minutes)
```sql
-- Remove the supported_campaign_types column
ALTER TABLE marketplace_templates 
DROP COLUMN IF EXISTS supported_campaign_types;

-- Drop the index
DROP INDEX IF EXISTS idx_marketplace_templates_campaign_types;
```

Then update code to not use column:
```typescript
// Fetch all templates without filtering
const { data, error } = await supabase
  .from('marketplace_templates')
  .select('*')
  .eq('is_public', true)
  .order('priority', { ascending: false })
  .limit(50);
```

3. **Verify**:
```sql
-- Test basic template fetch
SELECT id, name, priority, download_count
FROM marketplace_templates
WHERE is_public = true
ORDER BY priority DESC
LIMIT 10;
```

**Estimated Time**: 5-30 minutes depending on option  
**User Impact**: Medium - users see all templates regardless of campaign type

---

### Auto-Generator Rollback

**Issue**: generateDefaultTemplateForCampaignType causing errors

**Rollback Steps**:

1. Wrap generator calls in try/catch:
```typescript
try {
  const fallbackTemplate = generateDefaultTemplateForCampaignType(campaignData.type);
  if (fallbackTemplate) {
    setTemplates([fallbackTemplate]);
    setSelectedTemplate(fallbackTemplate);
  }
} catch (error) {
  console.error('Generator failed:', error);
  // Just show empty state, user can skip to design editor
  toast.info('No templates available. Create custom design in next step.');
}
```

2. Or disable completely:
```typescript
// Comment out the generator block
// else if (loadedTemplates.length === 0 && campaignData.type) {
//   const fallbackTemplate = generateDefaultTemplateForCampaignType(campaignData.type);
//   ...
// }

// Show "no templates" message instead
toast.info('No pre-made templates found. You can customize from scratch.');
```

**Estimated Time**: 10 minutes  
**User Impact**: Low - users just skip to design editor for unmapped types

---

### Full System Rollback

**Issue**: Multiple critical failures requiring complete revert

**Nuclear Option Steps**:

1. **Revert All Code Changes**:
```bash
# Find the commit before Phase 1-7 implementation
git log --oneline --graph

# Create new branch for investigation
git checkout -b rollback-investigation

# Reset to pre-implementation commit
git reset --hard <pre-phase-commit-hash>

# Force push to deploy
git push origin HEAD --force
```

2. **Revert Database**:
```sql
-- Remove new columns (if added)
ALTER TABLE marketplace_templates 
DROP COLUMN IF EXISTS supported_campaign_types,
DROP COLUMN IF EXISTS business_types,
DROP COLUMN IF EXISTS priority;

-- Remove indexes
DROP INDEX IF EXISTS idx_marketplace_templates_campaign_types;
DROP INDEX IF EXISTS idx_marketplace_templates_priority;
```

3. **Verify System Health**:
   - [ ] Users can create campaigns
   - [ ] Existing campaigns work
   - [ ] No console errors
   - [ ] Database queries functional

**Estimated Time**: 1 hour (including testing)  
**User Impact**: High - all template features removed, back to original wizard

---

## Post-Rollback Actions

After successful rollback:

### Immediate (Within 1 hour)
- [ ] Monitor error rates
- [ ] Verify campaign creation success rate
- [ ] Check user feedback/support tickets
- [ ] Document what was rolled back

### Short-term (Within 24 hours)
- [ ] Analyze root cause
- [ ] Create detailed incident report
- [ ] Plan fix for identified issues
- [ ] Test fix in staging environment

### Long-term (Within 1 week)
- [ ] Implement proper fix
- [ ] Add regression tests
- [ ] Update documentation
- [ ] Re-deploy with monitoring

## Monitoring After Rollback

### Key Metrics to Watch

```sql
-- Campaign creation rate
SELECT 
  DATE_TRUNC('hour', created_at) AS hour,
  COUNT(*) AS campaigns_created
FROM campaigns
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- Template fetch errors (check application logs)
-- Widget installation completions
SELECT 
  COUNT(*) AS completed_onboardings
FROM user_milestones
WHERE milestone = 'widget_installed'
  AND completed_at > NOW() - INTERVAL '24 hours';
```

### Success Criteria

Rollback is successful when:
- ✅ Campaign creation rate returns to baseline (>90% of normal)
- ✅ No template-related errors in logs for 4+ hours
- ✅ User support tickets decrease to baseline
- ✅ All wizard steps functional
- ✅ Database queries performing normally (< 100ms avg)

## Prevention for Future Deployments

### Pre-Deployment Checklist
- [ ] Test in staging environment with production data copy
- [ ] Verify database migrations succeed on test database
- [ ] Load test template queries (simulate 100+ concurrent users)
- [ ] Test all error scenarios (network failure, missing data, etc.)
- [ ] Review rollback plan before deploying

### Deployment Strategy
1. **Staged Rollout**: Deploy to 10% of users first
2. **Monitor**: Watch metrics for 2 hours
3. **Expand**: Deploy to 50% if stable
4. **Monitor**: Watch metrics for 4 hours  
5. **Complete**: Deploy to 100% if stable

### Automated Monitoring
```javascript
// Add monitoring to detect issues early
if (templateFetchError) {
  // Send alert to monitoring system
  logger.error('Template fetch failed', {
    campaignType: campaignData.type,
    error: templateFetchError,
    userId: user?.id
  });
}
```

## Emergency Contacts

- **Engineering Lead**: [Add contact]
- **Database Admin**: [Add contact]
- **On-Call Engineer**: [Add rotation schedule]
- **Product Manager**: [Add contact]

## Version Control

- **Current Version**: v2.0.0 (Phase 1-7 complete)
- **Rollback Target**: v1.9.0 (pre-implementation)
- **Branch**: `main`
- **Last Stable Commit**: `<commit-hash>`

---

**Last Updated**: 2025-11-02  
**Document Owner**: Engineering Team  
**Review Schedule**: After each major deployment
