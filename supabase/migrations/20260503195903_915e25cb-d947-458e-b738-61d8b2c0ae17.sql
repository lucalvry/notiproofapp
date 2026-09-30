alter table public.businesses
  add column if not exists content_notify_on_ready boolean not null default true,
  add column if not exists content_default_tones text[] not null default '{}',
  add column if not exists content_default_output_types text[] not null default '{}';