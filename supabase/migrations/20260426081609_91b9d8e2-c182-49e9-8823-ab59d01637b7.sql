-- 1. Helper: normalize a raw domain/URL to a bare hostname
create or replace function public.normalize_domain(_raw text)
returns text language sql immutable
set search_path = public
as $$
  select nullif(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(lower(coalesce(_raw, '')), '^[a-z]+://', ''),
          '/.*$', ''
        ),
        ':\d+$', ''
      ),
      '^www\.', ''
    ),
    ''
  );
$$;

-- 2. Table
create table public.business_domains (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  domain text not null,
  is_primary boolean not null default false,
  is_verified boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id, domain)
);

-- 3. Indexes
create index business_domains_domain_idx
  on public.business_domains (lower(domain));

create unique index business_domains_one_primary_per_business
  on public.business_domains (business_id) where is_primary;

create index business_domains_business_id_idx
  on public.business_domains (business_id);

-- 4. Normalization trigger
create or replace function public.business_domains_normalize()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.domain := public.normalize_domain(new.domain);
  if new.domain is null then
    raise exception 'Invalid domain';
  end if;
  return new;
end;
$$;

create trigger business_domains_normalize_trg
  before insert or update of domain on public.business_domains
  for each row execute function public.business_domains_normalize();

-- 5. RLS
alter table public.business_domains enable row level security;

create policy "bd_member_select" on public.business_domains
  for select to authenticated
  using (is_business_member(business_id) or is_platform_admin());

create policy "bd_editor_insert" on public.business_domains
  for insert to authenticated
  with check (has_business_role(business_id, 'editor') or is_platform_admin());

create policy "bd_editor_update" on public.business_domains
  for update to authenticated
  using (has_business_role(business_id, 'editor') or is_platform_admin())
  with check (has_business_role(business_id, 'editor') or is_platform_admin());

create policy "bd_editor_delete" on public.business_domains
  for delete to authenticated
  using (has_business_role(business_id, 'editor') or is_platform_admin());

-- 6. Force PostgREST to reload its schema cache
notify pgrst, 'reload schema';