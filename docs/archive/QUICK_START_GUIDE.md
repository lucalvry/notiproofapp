# NotiProof Quick Start Guide
## Get Your First Notification Live in 5 Minutes ⚡

### Step 1: Create Your Account (30 seconds)
1. Go to [app.notiproof.com/register](https://app.notiproof.com/register)
2. Sign up with your email or Google account
3. You'll be automatically logged in

### Step 2: Add Your Website (1 minute)
1. Click **"Add Website"** on the dashboard
2. Enter your website name (e.g., "My Store")
3. Enter your domain (e.g., "mystore.com")
4. Click **"Add Website"**

**✅ Verification**: You'll see your website listed with a verification status

### Step 3: Connect a Data Source (2 minutes)

#### Option A: Quick Start with Demo Data (Recommended)
1. Click **"Create Notification"** on the Campaigns page
2. Select **"Quick Start Templates"**
3. Choose a template:
   - **E-commerce**: Recent Purchases
   - **SaaS**: New Sign-ups
   - **Blog**: Active Readers
4. Click **"Use Template"**
5. Demo notifications go live instantly! 🎉

#### Option B: Connect Real Integration
1. Click **"Integrations"** in the sidebar
2. Choose your platform:
   - **Google Analytics 4** (Most popular)
   - **Shopify**
   - **Stripe**
   - **Webhook** (for custom data)
3. Click **"Connect"** and follow OAuth flow
4. Select the property/store you want to track
5. Auto-campaign is created immediately!

### Step 4: Install Widget Code (1 minute)
1. Go to **Settings** → **Installation** tab
2. Copy the installation code:
   ```html
   <script src="https://cdn.notiproof.com/widget.js" 
           data-website="YOUR_WEBSITE_ID"></script>
   ```
3. Paste it before the closing `</body>` tag on your website
4. Save and publish your site

**💡 For popular platforms:**
- **WordPress**: Install "Insert Headers and Footers" plugin
- **Shopify**: Add to `theme.liquid` file
- **Webflow**: Add to Project Settings → Custom Code → Footer
- **Wix**: Use Custom Code section in Site Settings

### Step 5: Test & Verify (30 seconds)
1. Visit your website in a new browser tab
2. Wait 2-3 seconds
3. You should see a notification appear! 🎉

**Troubleshooting:**
- **Not showing?** Check browser console for errors (F12)
- **Wrong position?** Go to Settings → Position to adjust
- **Too many notifications?** Go to Settings → Limits to reduce frequency

---

## Next Steps: Optimize Your Notifications

### Customize Appearance
1. Go to **Settings** → **Theme**
2. Choose your brand color
3. Adjust border radius and animation style
4. Click **"Save Theme Settings"**

### Set Up Targeting Rules
1. Go to **Rules** page
2. Configure:
   - **Pages**: Show only on specific URLs
   - **Geography**: Target specific countries
   - **Devices**: Desktop vs Mobile
   - **Schedule**: Show during business hours
3. Click **"Save Rules"**

### View Analytics
1. Go to **Analytics** page
2. Track:
   - Views and clicks
   - Conversion rates
   - Revenue attribution (if connected to checkout events)
3. Use insights to optimize your campaigns

---

## Common Use Cases

### 🛍️ E-commerce
**Goal**: Increase checkout conversions
1. Connect Shopify or Google Analytics
2. Enable "Recent Purchases" campaign
3. Set rule: Show only on product pages
4. Expected lift: +15-30% conversions

### 💼 SaaS
**Goal**: Boost free trial sign-ups
1. Connect GA4 or Segment
2. Enable "New Sign-ups" campaign
3. Set rule: Show only on pricing/features pages
4. Expected lift: +20-40% trial starts

### 📝 Blog/Content
**Goal**: Grow newsletter subscribers
1. Connect Mailchimp or ConvertKit
2. Enable "New Subscribers" campaign
3. Set rule: Show on all blog posts
4. Expected lift: +25-50% email opt-ins

---

## Pro Tips 💡

1. **Start with 3-5 notifications per page** (Settings → Limits)
2. **Use subtle animations** ("slide" works best)
3. **Position matters**: Bottom-left for desktop, bottom-center for mobile
4. **Test timing**: 2-3 second delay before first notification
5. **Enable Debug Mode** (Settings → Advanced) while testing

---

## Need Help?

- 📚 **Documentation**: [docs.notiproof.com](https://docs.notiproof.com)
- 💬 **Live Chat**: Click the help icon in the bottom-right
- 📧 **Email Support**: support@notiproof.com
- 🎥 **Video Tutorials**: [youtube.com/notiproof](https://youtube.com/notiproof)

---

**🎯 Your First Notification Should Be Live!**
If you followed this guide, visitors to your website are now seeing social proof notifications. Check your Analytics page to track performance.

*Setup time: < 5 minutes | Time to first conversion: Usually within 24 hours*
