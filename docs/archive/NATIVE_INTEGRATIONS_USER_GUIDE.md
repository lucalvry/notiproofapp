# Native Integrations User Guide

Welcome to NotiProof's native integrations! These powerful features let you create social proof notifications without connecting to any third-party tools.

---

## 🚀 Quick Start

### What are Native Integrations?

Native integrations are **built-in features** that work instantly without OAuth, API keys, or external services. They include:

1. **📝 Instant Capture** - Track form submissions automatically
2. **👥 Active Visitors** - Show live visitor counts (simulated or real)
3. **📢 Smart Announcements** - Display scheduled or recurring messages

---

## 📝 Instant Capture (Form Submission Tracking)

### What It Does
Automatically captures form submissions on your website and displays them as social proof notifications to other visitors.

### Use Cases
- **Contact forms**: "Sarah from Austin just contacted us!"
- **Newsletter signups**: "Mike just joined our newsletter"
- **Download forms**: "Emily just downloaded our guide"
- **Demo requests**: "John from San Francisco requested a demo"

### Setup (Under 2 Minutes)

#### Step 1: Create Campaign
1. Go to **Campaigns** → **Create Notification**
2. Select **Instant Capture** integration
3. Click **Select** (no connection required!)

#### Step 2: Configure
- **Form Page URL**: Enter the page where your form lives
  - Example: `/contact` or `/signup` or `https://yoursite.com/demo`
- **Auto-Detect Fields**: Toggle ON (recommended)
  - NotiProof will automatically find form fields like name, email, city
- **Require Moderation**: Toggle ON if you want to approve submissions before displaying
  - Recommended for public-facing forms
  - Toggle OFF for instant display (use with caution)

#### Step 3: Customize Message
Use variables to personalize your notification:

**Available Variables**:
- `{{name}}` - Submitter's name
- `{{email}}` - Submitter's email
- `{{city}}` - Submitter's city/location
- `{{company}}` - Company name (if form has this field)
- `{{message}}` - Any other form field

**Example Messages**:
```
{{name}} from {{city}} just contacted us!
{{name}} just signed up for our newsletter
{{company}} requested a demo
Someone from {{city}} downloaded our guide
```

#### Step 4: Test Your Form
1. Click **"Start Listening"** button
2. Visit your form page in another tab
3. Fill out and submit the form
4. Return to NotiProof
5. You should see the fields detected!

#### Step 5: Go Live
1. Click **Next** → **Publish**
2. Done! Form submissions now appear as notifications

### Pro Tips
✅ **Use moderation for forms with sensitive data**
✅ **Keep message under 60 characters for mobile**
✅ **Test with a real form submission before going live**
✅ **Use generic terms like "Someone" if name is optional**

### What Gets Filtered?
For your security, these fields are **automatically removed**:
- Passwords
- Credit card numbers
- CVV codes
- Social Security Numbers

---

## 👥 Active Visitors (Live Visitor Count)

### What It Does
Displays how many people are currently viewing your site or page to create urgency.

### Use Cases
- **E-commerce**: "23 people are viewing this product right now"
- **Event pages**: "47 people are checking out this event"
- **Landing pages**: "12 people are viewing this page"
- **Webinar signups**: "35 people are registered for this webinar"

### Setup (Under 1 Minute)

#### Step 1: Create Campaign
1. Go to **Campaigns** → **Create Notification**
2. Select **Live Visitor Count** integration
3. Click **Select**

#### Step 2: Configure

**Mode**: Choose how counts are generated
- **Simulated** (Recommended for new sites)
  - Generates realistic visitor counts within your specified range
  - Perfect for new websites with low traffic
  - Adds ±10% variance for natural fluctuation
- **Real** (Coming soon)
  - Tracks actual visitors using session tracking
- **Blended** (Coming soon)
  - Real visitors + boost (e.g., real count × 1.5)

**Visitor Range**:
- **Minimum**: Lowest count to show (e.g., 8)
- **Maximum**: Highest count to show (e.g., 25)
- **Tip**: Use realistic ranges based on your actual traffic

**Update Frequency**:
- How often the count changes
- Options: 5s, 10s, 30s, 60s
- **Recommended**: 10 seconds (not too fast, not too slow)

**Scope**:
- **Site-wide**: "X people viewing this site"
- **Per-page**: "X people viewing this page"

#### Step 3: Customize Message
```
{{visitor_count}} people are viewing this site right now
{{visitor_count}} shoppers are browsing our store
{{visitor_count}} people are checking out this product
Only {{visitor_count}} spots left!
```

#### Step 4: Publish
Click **Publish** and the visitor count will appear immediately!

### Transparency Best Practices
📌 **Important**: Analytics will show **(Simulated)** badge for transparency
📌 **Consider adding a disclaimer** if your industry requires it
📌 **Use realistic ranges** that match your actual traffic patterns

**Example Disclaimer**:
> "Visitor counts are simulated to protect user privacy"

---

## 📢 Smart Announcements (Manual/Scheduled Messages)

### What It Does
Create promotional or time-sensitive notifications that display automatically based on your schedule.

### Use Cases
- **Flash sales**: "🎉 24-hour flash sale: 30% off everything!"
- **Product launches**: "🚀 New feature launched: AI Chatbot"
- **Event reminders**: "📅 Webinar starts in 1 hour!"
- **Holiday promotions**: "🎄 Holiday sale ends tonight!"
- **Weekly updates**: "New blog post every Monday"

### Setup (Under 1 Minute)

#### Step 1: Create Campaign
1. Go to **Campaigns** → **Create Notification**
2. Select **Smart Announcements** integration
3. Click **Select**

#### Step 2: Write Your Message

**Basic Info**:
- **Title**: Internal name (users don't see this)
- **Message**: What visitors will see
- **CTA (Optional)**: Button text + URL

**Example Messages**:
```
🎉 Limited time: {{discount}}% off all products!
🚀 New feature: {{feature_name}} is now live!
📅 Webinar today at {{time}}! Register now →
🎄 Holiday sale: Use code {{coupon_code}}
```

#### Step 3: Add Variables (Optional)

Variables let you reuse messages with different values:

**How to Add**:
1. Click **"Add Variable"**
2. Enter variable name (e.g., `discount`)
3. Enter value (e.g., `25`)
4. Use in message: `{{discount}}`

**Built-in Variables**:
- `{{now}}` - Current date/time
- `{{today}}` - Today's date
- `{{time}}` - Current time

**Custom Variables** (You create these):
- `{{discount}}` - Discount percentage
- `{{product_name}}` - Product being promoted
- `{{event_name}}` - Event name
- `{{coupon_code}}` - Promo code

#### Step 4: Choose Schedule

### **Option A: Instant** 📍
- Appears immediately after publishing
- Best for: Urgent announcements, breaking news

### **Option B: Scheduled** 📅
- Set start and end dates
- Best for: Sales, limited-time offers, events

**Example**:
```
Start: Dec 20, 2024 at 9:00 AM
End: Dec 25, 2024 at 11:59 PM
Message: "🎄 Holiday Sale: 40% off until Christmas!"
```

### **Option C: Recurring** 🔄
- Repeats automatically (daily, weekly, monthly)
- Best for: Weekly content, regular promotions

**Daily**:
```
Every day at 9:00 AM
Message: "☕ Good morning! Check out today's deal"
```

**Weekly**:
```
Every Monday, Wednesday, Friday at 2:00 PM
Message: "📅 Webinar today at 3 PM! Join us"
```

**Monthly** (Coming soon):
```
1st of every month at 10:00 AM
Message: "📊 Monthly report is now available"
```

#### Step 5: Set Priority

**Priority Scale**: 1-10 (10 = highest)

- **10**: Critical announcements (site outages, urgent updates)
- **8-9**: Major sales, product launches
- **5-7**: Regular promotions, content updates
- **1-4**: Background announcements

**How It Works**:
When multiple announcements are active, higher priority shows first.

#### Step 6: Publish

Click **Publish** and your announcement will appear based on your schedule!

---

## 📊 Analytics & Tracking

### View Performance
Go to **Analytics** to see:
- **Impressions**: How many times notification was shown
- **Clicks**: How many people clicked (if CTA enabled)
- **CTR**: Click-through rate (clicks ÷ impressions)

### Filter by Native Integration
- **Instant Capture**: Events from form submissions
- **Active Visitors**: Simulated visitor count impressions
- **Announcements**: Scheduled or recurring messages

### Transparency Labels
- Native events show **"🏠 Native"** badge
- Simulated visitors show **(Simulated)** label

---

## 🔒 Security & Privacy

### Form Data Protection
✅ **Sensitive fields automatically filtered**
- Passwords, credit cards, SSN never stored
✅ **Rate limiting active**
- Max 100 form submissions per hour per site
✅ **Moderation available**
- Review submissions before displaying

### Data Storage
- Form data stored in your Supabase database
- Only approved events displayed on website
- You control data retention policies

### Visitor Privacy
- Simulated counts don't track real visitors
- No cookies or tracking scripts used for simulation
- GDPR/CCPA compliant

---

## ❓ FAQ

### General

**Q: Do I need any API keys or OAuth?**  
A: No! Native integrations work out of the box with zero setup.

**Q: How is this different from third-party integrations?**  
A: Native integrations run directly in NotiProof without connecting to external services like Zapier, Shopify, or Stripe.

**Q: Can I use native integrations with regular integrations?**  
A: Yes! You can have form capture + Shopify orders + announcements all running at once.

---

### Instant Capture

**Q: What if my form doesn't have a "name" field?**  
A: Use "Someone" or "A visitor" in your message template.

**Q: Can I capture multi-page forms?**  
A: Currently only single-page forms are supported. Multi-step forms coming soon.

**Q: What happens if someone submits spam?**  
A: Enable moderation to review all submissions before they display.

**Q: Can I capture forms on subdomains?**  
A: Yes, just include the full URL in the target_url field.

---

### Active Visitors

**Q: Is simulated mode "fake"?**  
A: It's a realistic estimate. Many sites use simulated counts for privacy and UX reasons. Just be transparent about it in analytics.

**Q: When will "Real" mode be available?**  
A: Coming in Q1 2025 with privacy-focused session tracking.

**Q: Can I show different counts on different pages?**  
A: Yes, set scope to "Per-page" instead of "Site-wide".

**Q: What if my actual traffic is higher than the range?**  
A: Increase the min/max range in campaign settings.

---

### Smart Announcements

**Q: Can I schedule multiple announcements at once?**  
A: Yes! Use priority to control the order they appear.

**Q: What if I want to update a recurring announcement?**  
A: Edit the campaign and the next occurrence will use the new message.

**Q: How precise is the scheduling?**  
A: Announcements appear within 5 minutes of the scheduled time (cron runs every 5 min).

**Q: Can I pause/unpause announcements?**  
A: Yes, just change campaign status to "paused" or "active".

---

## 🆘 Troubleshooting

### Form Capture Not Working
1. **Check target URL**: Must match exactly (e.g., `/contact` vs `/contact/`)
2. **Check browser console**: Look for "[Instant Capture]" logs
3. **Test form submission**: Try submitting a real form
4. **Check moderation**: If enabled, event will be pending until approved

### Visitor Count Not Updating
1. **Hard refresh page**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. **Check campaign status**: Must be "active"
3. **Check console logs**: Look for "[Active Visitors]" messages
4. **Verify interval**: Count updates based on your configured frequency

### Announcements Not Appearing
1. **Check schedule**: Verify start date/time has passed
2. **Check recurring pattern**: Today must match selected days
3. **Wait for cron**: Announcements appear within 5 minutes
4. **Check Edge Function logs**: Supabase Dashboard → Edge Functions → process-announcements

---

## 🎓 Video Tutorials

Coming soon:
- ▶️ Form Capture in 2 Minutes
- ▶️ Setting Up Active Visitors
- ▶️ Creating Recurring Announcements
- ▶️ Advanced Variable Usage

---

## 💡 Best Practices

### Instant Capture
✅ Use moderation for public forms  
✅ Keep messages under 60 characters  
✅ Test with real submissions before going live  
✅ Use generic terms if name is optional  

### Active Visitors
✅ Use realistic ranges based on actual traffic  
✅ Add disclaimer if required by your industry  
✅ Update range as your traffic grows  
✅ Set update frequency to 10-30 seconds  

### Smart Announcements
✅ Set appropriate priority (don't make everything priority 10)  
✅ Use variables for reusable messages  
✅ Test scheduled announcements 5 minutes in future first  
✅ Limit to 3-5 active announcements max  

---

## 🚀 Next Steps

Now that you know how to use native integrations:

1. **Create your first native campaign** (2 minutes)
2. **Install the widget on your site**
3. **Watch the notifications appear**
4. **Check analytics to see performance**
5. **Iterate and optimize based on data**

Need help? Contact support or check our documentation at docs.notiproof.com

---

**Happy notifying!** 🎉
