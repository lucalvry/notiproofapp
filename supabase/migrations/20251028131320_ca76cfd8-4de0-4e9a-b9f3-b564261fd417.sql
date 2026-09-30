-- Seed marketplace templates with diverse notification designs (corrected version)
-- Using proper column names and data types

-- E-commerce Templates
INSERT INTO marketplace_templates (
  created_by, name, description, category, template_config, style_config, display_rules,
  download_count, rating_average, rating_count, is_public
) VALUES
(
  'a0ba604f-0a91-4ab5-b617-bb94de25c5ab',
  'Recent Purchase Alert',
  'Show real-time purchase notifications to build trust and urgency',
  'E-commerce',
  '{"position": "bottom-left", "animation": "slide", "timing": {"duration": 5000, "delay": 8000}, "previewData": {"userName": "Sarah M.", "location": "New York", "action": "just purchased", "product": "Premium Wireless Headphones"}}'::jsonb,
  '{"backgroundColor": "#ffffff", "textColor": "#1a1a1a", "accentColor": "#10b981", "borderRadius": 12, "fontSize": 14}'::jsonb,
  '{"show_duration_ms": 5000, "interval_ms": 8000, "max_per_page": 5}'::jsonb,
  1847, 4.8, 142, true
),
(
  'a0ba604f-0a91-4ab5-b617-bb94de25c5ab',
  'Product Review Spotlight',
  'Display customer reviews to increase product credibility',
  'E-commerce',
  '{"position": "bottom-right", "animation": "fade", "timing": {"duration": 6000, "delay": 10000}, "previewData": {"userName": "Michael R.", "rating": 5, "review": "Absolutely love this product! Best purchase ever.", "product": "Organic Cotton T-Shirt"}}'::jsonb,
  '{"backgroundColor": "#fef3c7", "textColor": "#92400e", "accentColor": "#f59e0b", "borderRadius": 16, "fontSize": 14}'::jsonb,
  '{"show_duration_ms": 6000, "interval_ms": 10000, "max_per_page": 5}'::jsonb,
  1523, 4.7, 118, true
),
(
  'a0ba604f-0a91-4ab5-b617-bb94de25c5ab',
  'Low Stock Warning',
  'Create urgency with limited inventory notifications',
  'E-commerce',
  '{"position": "top-center", "animation": "bounce", "timing": {"duration": 7000, "delay": 5000}, "previewData": {"product": "Summer Collection Dress", "stockLeft": 3, "message": "Only 3 left in stock!"}}'::jsonb,
  '{"backgroundColor": "#fee2e2", "textColor": "#991b1b", "accentColor": "#ef4444", "borderRadius": 8, "fontSize": 15}'::jsonb,
  '{"show_duration_ms": 7000, "interval_ms": 5000, "max_per_page": 5}'::jsonb,
  982, 4.5, 87, true
),
(
  'a0ba604f-0a91-4ab5-b617-bb94de25c5ab',
  'Cart Addition Notification',
  'Show when visitors add items to their cart',
  'E-commerce',
  '{"position": "bottom-left", "animation": "slide", "timing": {"duration": 4000, "delay": 6000}, "previewData": {"userName": "Jennifer", "action": "added to cart", "product": "Yoga Mat Pro"}}'::jsonb,
  '{"backgroundColor": "#ede9fe", "textColor": "#5b21b6", "accentColor": "#8b5cf6", "borderRadius": 12, "fontSize": 14}'::jsonb,
  '{"show_duration_ms": 4000, "interval_ms": 6000, "max_per_page": 5}'::jsonb,
  756, 4.6, 64, true
),

-- SaaS Templates
(
  'a0ba604f-0a91-4ab5-b617-bb94de25c5ab',
  'New User Signup',
  'Celebrate new signups and create social proof',
  'SaaS',
  '{"position": "bottom-right", "animation": "slide", "timing": {"duration": 5000, "delay": 9000}, "previewData": {"userName": "Alex Johnson", "location": "San Francisco", "action": "just signed up", "plan": "Pro Plan"}}'::jsonb,
  '{"backgroundColor": "#dbeafe", "textColor": "#1e40af", "accentColor": "#3b82f6", "borderRadius": 14, "fontSize": 14}'::jsonb,
  '{"show_duration_ms": 5000, "interval_ms": 9000, "max_per_page": 5}'::jsonb,
  1634, 4.9, 156, true
),
(
  'a0ba604f-0a91-4ab5-b617-bb94de25c5ab',
  'Feature Announcement',
  'Highlight new features to engage users',
  'SaaS',
  '{"position": "top-right", "animation": "fade", "timing": {"duration": 8000, "delay": 3000}, "previewData": {"feature": "Dark Mode", "message": "Now available! Switch in settings.", "icon": "✨"}}'::jsonb,
  '{"backgroundColor": "#f0fdf4", "textColor": "#14532d", "accentColor": "#22c55e", "borderRadius": 10, "fontSize": 15}'::jsonb,
  '{"show_duration_ms": 8000, "interval_ms": 3000, "max_per_page": 5}'::jsonb,
  891, 4.6, 73, true
),
(
  'a0ba604f-0a91-4ab5-b617-bb94de25c5ab',
  'Trial Expiring Soon',
  'Encourage conversions with trial reminders',
  'SaaS',
  '{"position": "top-center", "animation": "bounce", "timing": {"duration": 6000, "delay": 7000}, "previewData": {"daysLeft": 3, "message": "Your trial ends in 3 days. Upgrade now!", "cta": "Upgrade"}}'::jsonb,
  '{"backgroundColor": "#fef3c7", "textColor": "#78350f", "accentColor": "#f59e0b", "borderRadius": 12, "fontSize": 14}'::jsonb,
  '{"show_duration_ms": 6000, "interval_ms": 7000, "max_per_page": 5}'::jsonb,
  1203, 4.7, 95, true
),
(
  'a0ba604f-0a91-4ab5-b617-bb94de25c5ab',
  'Live User Count',
  'Display active users to show platform popularity',
  'SaaS',
  '{"position": "bottom-left", "animation": "pulse", "timing": {"duration": 10000, "delay": 15000}, "previewData": {"activeUsers": 1247, "message": "people are using this platform right now"}}'::jsonb,
  '{"backgroundColor": "#ffffff", "textColor": "#374151", "accentColor": "#6366f1", "borderRadius": 20, "fontSize": 13}'::jsonb,
  '{"show_duration_ms": 10000, "interval_ms": 15000, "max_per_page": 5}'::jsonb,
  567, 4.4, 48, true
),

-- Blog Templates
(
  'a0ba604f-0a91-4ab5-b617-bb94de25c5ab',
  'Popular Post Alert',
  'Showcase trending content to boost engagement',
  'Blogs',
  '{"position": "bottom-right", "animation": "slide", "timing": {"duration": 5000, "delay": 12000}, "previewData": {"readers": 234, "article": "10 Tips for Better Productivity", "time": "5 min read"}}'::jsonb,
  '{"backgroundColor": "#fce7f3", "textColor": "#831843", "accentColor": "#ec4899", "borderRadius": 14, "fontSize": 14}'::jsonb,
  '{"show_duration_ms": 5000, "interval_ms": 12000, "max_per_page": 5}'::jsonb,
  1089, 4.8, 92, true
),
(
  'a0ba604f-0a91-4ab5-b617-bb94de25c5ab',
  'New Subscriber Welcome',
  'Thank new subscribers and build community',
  'Blogs',
  '{"position": "top-center", "animation": "fade", "timing": {"duration": 6000, "delay": 4000}, "previewData": {"userName": "David", "location": "Austin", "message": "just subscribed to the newsletter"}}'::jsonb,
  '{"backgroundColor": "#dcfce7", "textColor": "#14532d", "accentColor": "#10b981", "borderRadius": 12, "fontSize": 14}'::jsonb,
  '{"show_duration_ms": 6000, "interval_ms": 4000, "max_per_page": 5}'::jsonb,
  823, 4.5, 67, true
),
(
  'a0ba604f-0a91-4ab5-b617-bb94de25c5ab',
  'Recent Comment Activity',
  'Display comment activity to encourage discussions',
  'Blogs',
  '{"position": "bottom-left", "animation": "slide", "timing": {"duration": 5000, "delay": 8000}, "previewData": {"userName": "Emma", "action": "commented on", "article": "React Hooks Guide"}}'::jsonb,
  '{"backgroundColor": "#e0e7ff", "textColor": "#3730a3", "accentColor": "#6366f1", "borderRadius": 10, "fontSize": 13}'::jsonb,
  '{"show_duration_ms": 5000, "interval_ms": 8000, "max_per_page": 5}'::jsonb,
  645, 4.6, 53, true
),

-- Education Templates
(
  'a0ba604f-0a91-4ab5-b617-bb94de25c5ab',
  'Course Enrollment Alert',
  'Show course enrollments to build credibility',
  'Education',
  '{"position": "bottom-right", "animation": "slide", "timing": {"duration": 5000, "delay": 10000}, "previewData": {"userName": "Maria S.", "location": "Chicago", "course": "Web Development Bootcamp", "action": "just enrolled in"}}'::jsonb,
  '{"backgroundColor": "#fef3c7", "textColor": "#78350f", "accentColor": "#f59e0b", "borderRadius": 16, "fontSize": 14}'::jsonb,
  '{"show_duration_ms": 5000, "interval_ms": 10000, "max_per_page": 5}'::jsonb,
  1456, 4.9, 128, true
),
(
  'a0ba604f-0a91-4ab5-b617-bb94de25c5ab',
  'Certificate Awarded',
  'Celebrate student achievements',
  'Education',
  '{"position": "top-right", "animation": "bounce", "timing": {"duration": 7000, "delay": 5000}, "previewData": {"userName": "James Lee", "course": "Digital Marketing", "achievement": "completed and earned a certificate"}}'::jsonb,
  '{"backgroundColor": "#dbeafe", "textColor": "#1e3a8a", "accentColor": "#3b82f6", "borderRadius": 12, "fontSize": 15}'::jsonb,
  '{"show_duration_ms": 7000, "interval_ms": 5000, "max_per_page": 5}'::jsonb,
  934, 4.7, 81, true
),
(
  'a0ba604f-0a91-4ab5-b617-bb94de25c5ab',
  'Live Class Reminder',
  'Notify about upcoming live sessions',
  'Education',
  '{"position": "top-center", "animation": "pulse", "timing": {"duration": 8000, "delay": 3000}, "previewData": {"course": "Python for Beginners", "time": "15 minutes", "instructor": "Dr. Smith"}}'::jsonb,
  '{"backgroundColor": "#fee2e2", "textColor": "#991b1b", "accentColor": "#ef4444", "borderRadius": 10, "fontSize": 14}'::jsonb,
  '{"show_duration_ms": 8000, "interval_ms": 3000, "max_per_page": 5}'::jsonb,
  712, 4.5, 59, true
),

-- Healthcare Templates
(
  'a0ba604f-0a91-4ab5-b617-bb94de25c5ab',
  'Appointment Booked',
  'Show appointment bookings to build trust',
  'Healthcare',
  '{"position": "bottom-left", "animation": "slide", "timing": {"duration": 5000, "delay": 8000}, "previewData": {"patientName": "Anonymous", "service": "General Consultation", "action": "just booked an appointment"}}'::jsonb,
  '{"backgroundColor": "#dcfce7", "textColor": "#14532d", "accentColor": "#10b981", "borderRadius": 14, "fontSize": 14}'::jsonb,
  '{"show_duration_ms": 5000, "interval_ms": 8000, "max_per_page": 5}'::jsonb,
  876, 4.8, 72, true
),
(
  'a0ba604f-0a91-4ab5-b617-bb94de25c5ab',
  'Patient Review',
  'Display patient testimonials for credibility',
  'Healthcare',
  '{"position": "bottom-right", "animation": "fade", "timing": {"duration": 6000, "delay": 10000}, "previewData": {"rating": 5, "review": "Excellent care and very professional staff!", "service": "Dental Care"}}'::jsonb,
  '{"backgroundColor": "#e0e7ff", "textColor": "#3730a3", "accentColor": "#6366f1", "borderRadius": 12, "fontSize": 14}'::jsonb,
  '{"show_duration_ms": 6000, "interval_ms": 10000, "max_per_page": 5}'::jsonb,
  623, 4.7, 54, true
),

-- Landing Page Templates
(
  'a0ba604f-0a91-4ab5-b617-bb94de25c5ab',
  'Email Signup Success',
  'Confirm email subscriptions with style',
  'Landing Pages',
  '{"position": "top-center", "animation": "bounce", "timing": {"duration": 5000, "delay": 2000}, "previewData": {"message": "Thanks for subscribing!", "emoji": "🎉", "cta": "Check your inbox"}}'::jsonb,
  '{"backgroundColor": "#d1fae5", "textColor": "#065f46", "accentColor": "#10b981", "borderRadius": 16, "fontSize": 15}'::jsonb,
  '{"show_duration_ms": 5000, "interval_ms": 2000, "max_per_page": 5}'::jsonb,
  1834, 4.9, 167, true
),
(
  'a0ba604f-0a91-4ab5-b617-bb94de25c5ab',
  'Demo Request Notification',
  'Show demo requests to create urgency',
  'Landing Pages',
  '{"position": "bottom-right", "animation": "slide", "timing": {"duration": 5000, "delay": 9000}, "previewData": {"userName": "Tech Startup Inc.", "action": "requested a demo", "time": "2 minutes ago"}}'::jsonb,
  '{"backgroundColor": "#fef3c7", "textColor": "#92400e", "accentColor": "#f59e0b", "borderRadius": 12, "fontSize": 14}'::jsonb,
  '{"show_duration_ms": 5000, "interval_ms": 9000, "max_per_page": 5}'::jsonb,
  1267, 4.6, 103, true
),
(
  'a0ba604f-0a91-4ab5-b617-bb94de25c5ab',
  'Limited Offer Timer',
  'Create urgency with countdown notifications',
  'Landing Pages',
  '{"position": "top-right", "animation": "pulse", "timing": {"duration": 10000, "delay": 5000}, "previewData": {"offer": "50% OFF", "timeLeft": "2 hours", "message": "Limited time offer ends soon!"}}'::jsonb,
  '{"backgroundColor": "#fee2e2", "textColor": "#7f1d1d", "accentColor": "#dc2626", "borderRadius": 8, "fontSize": 15}'::jsonb,
  '{"show_duration_ms": 10000, "interval_ms": 5000, "max_per_page": 5}'::jsonb,
  1542, 4.8, 134, true
),
(
  'a0ba604f-0a91-4ab5-b617-bb94de25c5ab',
  'Social Proof Counter',
  'Display total users or customers',
  'Landing Pages',
  '{"position": "bottom-left", "animation": "fade", "timing": {"duration": 15000, "delay": 20000}, "previewData": {"count": 15000, "message": "happy customers and growing!", "icon": "👥"}}'::jsonb,
  '{"backgroundColor": "#f3f4f6", "textColor": "#1f2937", "accentColor": "#6366f1", "borderRadius": 20, "fontSize": 14}'::jsonb,
  '{"show_duration_ms": 15000, "interval_ms": 20000, "max_per_page": 5}'::jsonb,
  2103, 4.9, 189, true
);