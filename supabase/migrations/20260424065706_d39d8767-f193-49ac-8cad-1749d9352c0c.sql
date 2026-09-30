alter table public.businesses
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists plan_tier text not null default 'free',
  add column if not exists brand_color text,
  add column if not exists industry text,
  add column if not exists time_zone text not null default 'UTC',
  add column if not exists install_verified boolean not null default false,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists monthly_event_limit integer not null default 10000,
  add column if not exists monthly_proof_limit integer not null default 100;

alter table public.proof_objects
  add column if not exists outcome_claim text,
  add column if not exists sentiment_score numeric,
  add column if not exists transcript text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists customer_handle text;

update public.businesses
set
  brand_color = coalesce(brand_color, nullif(settings->>'brand_color', '')),
  industry = coalesce(industry, nullif(settings->>'industry', '')),
  time_zone = coalesce(nullif(time_zone, ''), nullif(settings->>'time_zone', ''), 'UTC'),
  install_verified = coalesce(install_verified, (settings->>'install_verified')::boolean, false),
  onboarding_completed = coalesce(onboarding_completed, (settings->>'onboarding_completed')::boolean, false),
  plan_tier = coalesce(nullif(plan_tier, ''), plan, 'free')
where true;

create index if not exists idx_businesses_onboarding_completed on public.businesses(onboarding_completed);
create index if not exists idx_businesses_plan_tier on public.businesses(plan_tier);
create index if not exists idx_proof_objects_tags on public.proof_objects using gin(tags);
create index if not exists idx_widget_events_business_fired_at on public.widget_events(business_id, fired_at desc);
create index if not exists idx_widget_events_business_type_fired_at on public.widget_events(business_id, event_type, fired_at desc);

create or replace function public.mark_business_onboarding_complete(_business_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_business_member(_business_id) or public.is_platform_admin()) then
    raise exception 'Not allowed';
  end if;

  update public.businesses
  set onboarding_completed = true,
      settings = coalesce(settings, '{}'::jsonb) || jsonb_build_object('onboarding_completed', true),
      updated_at = now()
  where id = _business_id;

  update public.users
  set onboarding_completed = true,
      updated_at = now()
  where id = auth.uid();

  return true;
end;
$$;

create or replace function public.get_collection_context(_token text)
returns table(
  recipient_name text,
  business_name text,
  business_logo_url text,
  brand_color text,
  status public.testimonial_request_status,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    tr.recipient_name,
    b.name as business_name,
    b.logo_url as business_logo_url,
    coalesce(b.brand_color, b.settings->>'brand_color') as brand_color,
    tr.status,
    tr.expires_at
  from public.testimonial_requests tr
  join public.businesses b on b.id = tr.business_id
  where tr.token = _token
  limit 1;
$$;