# NotiProof Testing Checklist
## Comprehensive Test Suite for Sprint 3: Bug Fixes & Edge Cases

---

## 1. FREQUENCY CAPPING TESTS

### Test 1.1: Max Per Page
**Steps:**
1. Set max_per_page = 3 in Settings → Limits
2. Visit a website page
3. Count notifications shown before stopping

**Expected:** Exactly 3 notifications, then stops
**Edge Cases:**
- [ ] Refresh page → Counter resets, shows 3 more
- [ ] Navigate to new page → Counter resets
- [ ] Close tab and reopen → Counter resets (new session)

### Test 1.2: Max Per Session
**Steps:**
1. Set max_per_session = 10 in Settings → Limits
2. Navigate across 5 different pages
3. Count total notifications across all pages

**Expected:** Maximum 10 notifications total, regardless of page count
**Edge Cases:**
- [ ] Open new tab (same session) → Shares same counter
- [ ] Close browser, reopen immediately → New session, resets counter
- [ ] Leave tab idle for 30 mins → Session expires, resets counter

### Test 1.3: Pause After Click
**Steps:**
1. Enable "Pause After Click" in Settings → Actions
2. Click on a notification
3. Wait for next notification

**Expected:** No more notifications appear after clicking one
**Edge Cases:**
- [ ] Refresh page after clicking → Notifications resume (new page view)
- [ ] Click multiple notifications quickly → All future notifications paused
- [ ] Hover without clicking → Notifications continue

### Test 1.4: Pause After Close
**Steps:**
1. Enable "Pause After Close" in Settings → Actions
2. Manually close a notification (X button)
3. Wait for next notification

**Expected:** No more notifications appear after closing one
**Edge Cases:**
- [ ] Auto-hide (timeout) → Notifications continue (not manually closed)
- [ ] Close and refresh → Notifications resume
- [ ] Close on mobile vs desktop → Both work correctly

---

## 2. GEO-TARGETING TESTS

### Test 2.1: Include Countries Only
**Steps:**
1. Go to Rules → Geography
2. Set Include Countries: United States, Canada
3. Visit website from US IP
4. Visit website from UK IP (use VPN)

**Expected:**
- US/Canada → Notifications show ✅
- UK → No notifications ❌

**Edge Cases:**
- [ ] Unknown country (IP lookup fails) → Default behavior: show notifications
- [ ] Multiple countries in session → Use first detected country
- [ ] VPN detection → Treat as unknown, show notifications

### Test 2.2: Exclude Countries Only
**Steps:**
1. Set Exclude Countries: China, Russia
2. Visit from excluded country (use VPN)

**Expected:**
- Excluded countries → No notifications ❌
- All other countries → Notifications show ✅

**Edge Cases:**
- [ ] No geo rules set → Show to all countries
- [ ] Both include AND exclude conflict → Exclude takes priority
- [ ] Private/localhost IP → Show notifications (dev environment)

### Test 2.3: Geo API Failure
**Steps:**
1. Block network request to geo-lookup API
2. Visit website

**Expected:** Notifications show (fallback behavior: assume allowed)
**Edge Cases:**
- [ ] API timeout (>5s) → Fallback to allow
- [ ] Invalid API response → Fallback to allow
- [ ] Cached geo-location → Use cache for 24 hours

---

## 3. URL RULES TESTS

### Test 3.1: Include URLs (Exact Match)
**Steps:**
1. Set Include URLs: /product, /checkout
2. Visit /product page
3. Visit /about page

**Expected:**
- /product → Notifications show ✅
- /about → No notifications ❌

### Test 3.2: Include URLs (Wildcard)
**Steps:**
1. Set Include URLs: /product/*
2. Visit /product/123
3. Visit /product/category/shoes
4. Visit /blog/post

**Expected:**
- /product/* matches /product/123 ✅
- /product/* matches /product/category/shoes ✅
- /blog/post → No notifications ❌

### Test 3.3: Exclude URLs (Priority)
**Steps:**
1. Set Include URLs: /product/*
2. Set Exclude URLs: /product/internal*
3. Visit /product/shoes
4. Visit /product/internal-dashboard

**Expected:**
- /product/shoes → Show ✅
- /product/internal-dashboard → Hide ❌ (exclude overrides include)

**Edge Cases:**
- [ ] Special characters in URL (?, &, #) → Handle gracefully
- [ ] Case sensitivity → Treat as case-insensitive
- [ ] Trailing slash → /product and /product/ should match
- [ ] Query parameters → /product?id=123 matches /product rule

### Test 3.4: No URL Rules
**Steps:**
1. Delete all URL rules (empty state)
2. Visit any page

**Expected:** Notifications show on all pages (default behavior)

---

## 4. SCHEDULE TARGETING TESTS

### Test 4.1: Business Hours Only
**Steps:**
1. Set Schedule: Monday-Friday, 9am-5pm, Timezone: America/New_York
2. Visit at 10am ET on Tuesday
3. Visit at 7pm ET on Tuesday

**Expected:**
- 10am Tuesday → Show ✅
- 7pm Tuesday → Hide ❌

**Edge Cases:**
- [ ] Timezone mismatch → Use visitor's local time, not server time
- [ ] Daylight Saving Time → Adjust automatically
- [ ] Midnight cutoff → 11:59pm Friday → Show, 12:00am Saturday → Hide

### Test 4.2: Weekend Only
**Steps:**
1. Set Schedule: Saturday-Sunday, All day
2. Visit on Saturday
3. Visit on Monday

**Expected:**
- Saturday → Show ✅
- Monday → Hide ❌

### Test 4.3: 24/7 Schedule
**Steps:**
1. Set Schedule: All days, All hours
2. Visit anytime

**Expected:** Always show notifications

**Edge Cases:**
- [ ] No schedule set → Default to 24/7
- [ ] Multiple time ranges (9-12am, 1-5pm) → Show in any matching range
- [ ] Visitor timezone detection fails → Use UTC

---

## 5. DEVICE TARGETING TESTS

### Test 5.1: Desktop Only
**Steps:**
1. Set Devices: Desktop
2. Visit on desktop browser
3. Visit on mobile phone

**Expected:**
- Desktop → Show ✅
- Mobile → Hide ❌

**Test Matrix:**
| Device | User Agent | Expected |
|--------|-----------|----------|
| Desktop | Chrome on Windows | Show ✅ |
| Tablet | iPad Safari | Hide ❌ |
| Mobile | iPhone Safari | Hide ❌ |
| Desktop | Chrome DevTools mobile mode | Show ✅ (detects as desktop) |

### Test 5.2: Mobile Position Override
**Steps:**
1. Set Desktop Position: bottom-left
2. Set Mobile Position: bottom-center
3. Visit on desktop and mobile

**Expected:**
- Desktop → bottom-left
- Mobile → bottom-center

**Edge Cases:**
- [ ] Tablet treated as mobile or desktop? → User configurable
- [ ] Landscape vs Portrait → Maintain position setting
- [ ] Very small desktop window → Still uses desktop position

---

## 6. ERROR BOUNDARY TESTS

### Test 6.1: Component Crash Recovery
**Steps:**
1. Trigger error in Campaign component (e.g., invalid data)
2. Observe error boundary activation

**Expected:**
- Error boundary catches error
- Shows friendly error message
- "Try Again" button resets state
- Other parts of app continue working

### Test 6.2: Network Failure Handling
**Steps:**
1. Disconnect internet
2. Try to load campaigns

**Expected:**
- Loading spinner appears
- Timeout after 30s
- Error toast: "Unable to connect. Check your internet."
- Retry button available

### Test 6.3: Invalid API Response
**Steps:**
1. Mock API to return malformed JSON
2. Load analytics page

**Expected:**
- Error caught gracefully
- Does not crash entire app
- Shows "Unable to load data" message
- Logs error to console (dev mode only)

---

## 7. SETTINGS PERSISTENCE TESTS

### Test 7.1: Save Each Tab
**Steps:**
1. Go to Settings → Timing
2. Change Initial Delay to 5 seconds
3. Click "Save Timing Settings"
4. Refresh page

**Expected:** Initial Delay still shows 5 seconds after refresh

**Test All Tabs:**
- [ ] Timing settings persist
- [ ] Position settings persist
- [ ] Limits settings persist
- [ ] Actions settings persist
- [ ] Theme settings persist
- [ ] Advanced settings persist

### Test 7.2: Concurrent Updates
**Steps:**
1. Open Settings in two browser tabs
2. Tab 1: Change position to top-right, save
3. Tab 2: Change animation to fade, save
4. Refresh both tabs

**Expected:** Both changes persist (last write wins)

**Edge Cases:**
- [ ] Simultaneous saves → Last one wins, no data corruption
- [ ] Save while loading → Show loading state, disable button
- [ ] Network error during save → Show error, don't update UI

---

## 8. INTEGRATION EDGE CASES

### Test 8.1: OAuth Token Expiry
**Steps:**
1. Connect GA4 integration
2. Manually expire access token in database
3. Try to sync data

**Expected:**
- Auto-refresh token using refresh_token
- If refresh fails, show re-connect dialog
- Don't break existing campaigns

### Test 8.2: Webhook Signature Validation
**Steps:**
1. Send webhook with invalid signature
2. Send webhook with valid signature

**Expected:**
- Invalid → Reject with 401
- Valid → Process event successfully

### Test 8.3: Rate Limit Handling
**Steps:**
1. Make 100 API requests in 1 second (exceed rate limit)

**Expected:**
- Return 429 Too Many Requests
- Show toast: "You're sending requests too fast. Try again in X seconds."
- Queue requests instead of dropping them

---

## 9. PERFORMANCE TESTS

### Test 9.1: Large Campaign List
**Steps:**
1. Create 100+ campaigns
2. Navigate to Campaigns page

**Expected:**
- Page loads in < 2 seconds
- Uses pagination or virtual scrolling
- No UI lag when scrolling

### Test 9.2: Real-Time Updates
**Steps:**
1. Open dashboard
2. Trigger 50 notifications in quick succession (test mode)

**Expected:**
- Dashboard updates smoothly
- No memory leaks
- Counters increment correctly

### Test 9.3: Widget Load Time
**Steps:**
1. Test widget.js on slow 3G network
2. Measure time-to-first-notification

**Expected:** < 3 seconds on 3G, < 1 second on 4G

---

## 10. MOBILE-SPECIFIC TESTS

### Test 10.1: Touch Interactions
- [ ] Tap notification → Opens correctly
- [ ] Swipe notification → Dismisses (if enabled)
- [ ] Pinch zoom → Notification position adjusts
- [ ] Rotate device → Notification repositions

### Test 10.2: Mobile Browser Compatibility
Test on:
- [ ] Safari iOS (iPhone)
- [ ] Chrome Android
- [ ] Samsung Internet
- [ ] Firefox Mobile

### Test 10.3: Mobile Position Override
**Steps:**
1. Set mobile_position_override = bottom-center
2. Visit on mobile

**Expected:** Notification appears at bottom-center, not desktop position

---

## 11. ACCESSIBILITY TESTS

### Test 11.1: Keyboard Navigation
- [ ] Tab through all settings inputs
- [ ] Press Enter to save
- [ ] Escape to close dialogs
- [ ] Arrow keys to navigate dropdowns

### Test 11.2: Screen Reader Support
- [ ] Notification has aria-label
- [ ] Buttons have descriptive labels
- [ ] Error messages are announced
- [ ] Focus management works correctly

### Test 11.3: Color Contrast
- [ ] Text on background meets WCAG AA (4.5:1)
- [ ] Focus indicators visible
- [ ] No color-only information (use icons too)

---

## 12. SECURITY TESTS

### Test 12.1: XSS Prevention
**Steps:**
1. Try to inject `<script>alert('XSS')</script>` in campaign name
2. Try SQL injection in search field

**Expected:** Escaped/sanitized, no code execution

### Test 12.2: CSRF Protection
- [ ] All POST requests include CSRF token
- [ ] Invalid token → 403 Forbidden

### Test 12.3: API Authentication
- [ ] Unauthenticated requests → 401
- [ ] Expired session → Redirect to login
- [ ] Invalid API key → 403

---

## TESTING TOOLS & SETUP

### Required Tools
- **VPN Service**: NordVPN, ExpressVPN (for geo-testing)
- **Device Farm**: BrowserStack or LambdaTest
- **Network Throttling**: Chrome DevTools (Slow 3G)
- **Mobile Devices**: iPhone 12+, Samsung Galaxy S21+
- **Screen Readers**: NVDA (Windows), VoiceOver (Mac/iOS)

### Test Data Setup
```sql
-- Create test campaigns
INSERT INTO campaigns (name, status, data_source) VALUES
  ('Test Campaign 1', 'active', 'ga4'),
  ('Test Campaign 2', 'paused', 'stripe'),
  ('Test Campaign 3', 'active', 'manual');

-- Create test events
INSERT INTO events (campaign_id, message_template, event_type) VALUES
  ('campaign-id', 'Someone from {{location}} just purchased', 'purchase');
```

### Automated Testing
```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run E2E tests (Playwright)
npm run test:e2e

# Check accessibility
npm run test:a11y
```

---

## PASS/FAIL CRITERIA

### Must Pass (Critical)
- ✅ All frequency capping rules work correctly
- ✅ Geo-targeting filters work with VPN
- ✅ URL rules match wildcards correctly
- ✅ Settings persist after save
- ✅ Error boundary catches crashes
- ✅ Mobile position override works

### Should Pass (High Priority)
- ⚠️ Schedule targeting respects timezones
- ⚠️ Device detection is accurate
- ⚠️ Performance < 2s page load
- ⚠️ Accessibility meets WCAG AA

### Nice to Have (Medium Priority)
- 💡 Animations are smooth
- 💡 Dark mode works correctly
- 💡 Tooltips are helpful

---

## SIGN-OFF CHECKLIST

Before marking Sprint 3 as complete:
- [ ] All critical tests pass
- [ ] No console errors in production
- [ ] Documentation is up-to-date
- [ ] Video tutorial recorded
- [ ] Beta users have tested
- [ ] Performance metrics recorded
- [ ] Security audit completed
- [ ] Accessibility audit completed

**Tester Signature:** _________________  
**Date:** _________________  
**Build Version:** _________________
