-- Add indexes for frequently queried columns to improve query performance

-- Events table indexes
CREATE INDEX IF NOT EXISTS idx_events_widget_id ON public.events(widget_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_widget_created ON public.events(widget_id, created_at DESC);

-- Widgets table indexes
CREATE INDEX IF NOT EXISTS idx_widgets_website_id ON public.widgets(website_id);
CREATE INDEX IF NOT EXISTS idx_widgets_user_id ON public.widgets(user_id);
CREATE INDEX IF NOT EXISTS idx_widgets_campaign_id ON public.widgets(campaign_id);

-- Campaigns table indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON public.campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_website_id ON public.campaigns(website_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);

-- Websites table indexes
CREATE INDEX IF NOT EXISTS idx_websites_user_id ON public.websites(user_id);

-- Testimonials table indexes
CREATE INDEX IF NOT EXISTS idx_testimonials_website_id ON public.testimonials(website_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_status ON public.testimonials(status);