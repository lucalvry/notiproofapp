-- Create testimonial_embeds table
CREATE TABLE IF NOT EXISTS testimonial_embeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  embed_type TEXT NOT NULL CHECK (embed_type IN ('grid', 'carousel', 'slider', 'wall', 'single', 'rating_summary')),
  filters JSONB DEFAULT '{}'::jsonb,
  style_config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE testimonial_embeds ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own embeds"
  ON testimonial_embeds FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own embeds"
  ON testimonial_embeds FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own embeds"
  ON testimonial_embeds FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own embeds"
  ON testimonial_embeds FOR DELETE
  USING (auth.uid() = user_id);

-- Public policy for viewing active embeds (for public embed pages)
CREATE POLICY "Anyone can view active embeds"
  ON testimonial_embeds FOR SELECT
  USING (is_active = true);

-- Create updated_at trigger
CREATE TRIGGER update_testimonial_embeds_updated_at
  BEFORE UPDATE ON testimonial_embeds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_testimonial_embeds_website_id ON testimonial_embeds(website_id);
CREATE INDEX idx_testimonial_embeds_user_id ON testimonial_embeds(user_id);
CREATE INDEX idx_testimonial_embeds_is_active ON testimonial_embeds(is_active);