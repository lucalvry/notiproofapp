-- Extend widget_type enum with new variants.
-- Postgres requires ADD VALUE statements outside transactions for some versions; IF NOT EXISTS makes this idempotent.
ALTER TYPE public.widget_type ADD VALUE IF NOT EXISTS 'carousel';
ALTER TYPE public.widget_type ADD VALUE IF NOT EXISTS 'marquee';
ALTER TYPE public.widget_type ADD VALUE IF NOT EXISTS 'masonry';
ALTER TYPE public.widget_type ADD VALUE IF NOT EXISTS 'avatar_row';
ALTER TYPE public.widget_type ADD VALUE IF NOT EXISTS 'video_hero';