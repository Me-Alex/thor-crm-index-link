create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create schema if not exists app_private;

create type public.source_operating_mode as enum ('on', 'degraded', 'off');
create type public.source_listing_status as enum ('new', 'active', 'stale', 'removed', 'parse_failed');
create type public.property_type as enum ('apartment', 'house', 'land', 'commercial', 'other');
create type public.transaction_type as enum ('sale', 'rent');
create type public.canonical_listing_status as enum ('active', 'removed', 'unknown');
create type public.tenant_listing_status as enum ('new', 'in_progress', 'contacted', 'ignored', 'archived');
create type public.alert_channel as enum ('email', 'webhook', 'in_app');
create type public.alert_frequency as enum ('near_real_time', 'hourly', 'daily');
create type public.alert_delivery_status as enum ('pending', 'sent', 'failed', 'skipped');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'agent')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table public.sources (
  id text primary key,
  name text not null,
  base_url text not null unique,
  robots_policy_url text,
  mode public.source_operating_mode not null default 'on',
  rate_limit_per_minute integer not null default 30 check (rate_limit_per_minute > 0),
  crawl_config jsonb not null default '{}'::jsonb,
  source_trust numeric(3, 2) not null default 0.70 check (source_trust >= 0 and source_trust <= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.source_listings (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references public.sources (id) on delete restrict,
  source_listing_key text not null,
  url text not null,
  normalized_payload jsonb not null default '{}'::jsonb,
  content_hash text,
  crawl_status public.source_listing_status not null default 'new',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_fetched_at timestamptz,
  removed_at timestamptz,
  parse_error text,
  unique (source_id, source_listing_key),
  unique (source_id, url)
);

create table public.canonical_listings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description_excerpt text,
  property_type public.property_type not null,
  transaction_type public.transaction_type not null,
  price_eur numeric(12, 2),
  area_sqm numeric(10, 2),
  rooms integer check (rooms is null or rooms >= 0),
  floor integer,
  construction_year integer check (construction_year is null or construction_year between 1800 and 2200),
  city text,
  district text,
  neighborhood text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  features jsonb not null default '{}'::jsonb,
  field_provenance jsonb not null default '{}'::jsonb,
  status public.canonical_listing_status not null default 'unknown',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_tsv tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description_excerpt, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(city, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(district, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(neighborhood, '')), 'C')
  ) stored
);

create table public.canonical_listing_links (
  source_listing_id uuid primary key references public.source_listings (id) on delete cascade,
  canonical_listing_id uuid not null references public.canonical_listings (id) on delete cascade,
  match_score numeric(5, 3) not null check (match_score >= 0 and match_score <= 1),
  match_reasons jsonb not null default '[]'::jsonb,
  linked_at timestamptz not null default now()
);

create table public.listing_history (
  id uuid primary key default gen_random_uuid(),
  canonical_listing_id uuid not null references public.canonical_listings (id) on delete cascade,
  source_listing_id uuid references public.source_listings (id) on delete set null,
  observed_at timestamptz not null default now(),
  price_eur numeric(12, 2),
  availability_status text,
  changed_fields jsonb not null default '{}'::jsonb
);

create table public.source_health_metrics (
  id bigint generated always as identity primary key,
  source_id text not null references public.sources (id) on delete cascade,
  metric_at timestamptz not null default now(),
  crawl_success_rate numeric(5, 4),
  parse_success_rate numeric(5, 4),
  time_to_index_seconds integer,
  field_coverage jsonb not null default '{}'::jsonb,
  dedup_match_rate numeric(5, 4),
  error_count integer not null default 0 check (error_count >= 0)
);

create table public.tenant_listing_states (
  org_id uuid not null references public.organizations (id) on delete cascade,
  canonical_listing_id uuid not null references public.canonical_listings (id) on delete cascade,
  status public.tenant_listing_status not null default 'new',
  assignee_user_id uuid references auth.users (id) on delete set null,
  last_seen_by_org_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (org_id, canonical_listing_id)
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  color text not null default '#64748b' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (org_id, id)
);

create table public.tenant_listing_tags (
  org_id uuid not null,
  canonical_listing_id uuid not null,
  tag_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (org_id, canonical_listing_id, tag_id),
  foreign key (org_id, canonical_listing_id) references public.tenant_listing_states (org_id, canonical_listing_id) on delete cascade,
  foreign key (org_id, tag_id) references public.tags (org_id, id) on delete cascade
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  canonical_listing_id uuid not null,
  author_user_id uuid not null references auth.users (id) on delete restrict,
  body text not null check (char_length(body) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (org_id, canonical_listing_id) references public.tenant_listing_states (org_id, canonical_listing_id) on delete cascade
);

create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  criteria jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, id)
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  saved_search_id uuid not null,
  channel public.alert_channel not null default 'in_app',
  frequency public.alert_frequency not null default 'near_real_time',
  threshold_minutes integer not null default 5 check (threshold_minutes >= 1),
  is_enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, id),
  foreign key (org_id, saved_search_id) references public.saved_searches (org_id, id) on delete cascade
);

create table public.alert_deliveries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  alert_id uuid not null,
  canonical_listing_id uuid references public.canonical_listings (id) on delete set null,
  status public.alert_delivery_status not null default 'pending',
  delivered_at timestamptz,
  error_message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (org_id, alert_id) references public.alerts (org_id, id) on delete cascade
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  org_id uuid references public.organizations (id) on delete set null,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index sources_mode_idx on public.sources (mode);
create index source_listings_source_status_idx on public.source_listings (source_id, crawl_status, last_seen_at desc);
create index source_listings_payload_gin_idx on public.source_listings using gin (normalized_payload);
create index canonical_listings_search_idx on public.canonical_listings using gin (search_tsv);
create index canonical_listings_filters_idx on public.canonical_listings (city, district, property_type, transaction_type, rooms, price_eur, area_sqm);
create index canonical_listings_features_gin_idx on public.canonical_listings using gin (features);
create index canonical_listing_links_canonical_idx on public.canonical_listing_links (canonical_listing_id);
create index listing_history_listing_observed_idx on public.listing_history (canonical_listing_id, observed_at desc);
create index listing_history_source_listing_idx on public.listing_history (source_listing_id);
create index source_health_metrics_source_time_idx on public.source_health_metrics (source_id, metric_at desc);
create index tenant_listing_states_assignee_idx on public.tenant_listing_states (org_id, assignee_user_id, status);
create index tenant_listing_states_assignee_user_idx on public.tenant_listing_states (assignee_user_id);
create index tenant_listing_states_canonical_idx on public.tenant_listing_states (canonical_listing_id);
create index tags_org_name_idx on public.tags (org_id, name);
create index tags_created_by_idx on public.tags (created_by);
create unique index tags_org_lower_name_uidx on public.tags (org_id, lower(name));
create index tenant_listing_tags_org_tag_idx on public.tenant_listing_tags (org_id, tag_id);
create index notes_listing_created_idx on public.notes (org_id, canonical_listing_id, created_at desc);
create index notes_author_user_idx on public.notes (author_user_id);
create index saved_searches_org_owner_idx on public.saved_searches (org_id, owner_user_id);
create index saved_searches_owner_user_idx on public.saved_searches (owner_user_id);
create index alerts_org_enabled_idx on public.alerts (org_id, is_enabled, frequency);
create index alerts_saved_search_fk_idx on public.alerts (org_id, saved_search_id);
create index alert_deliveries_alert_created_idx on public.alert_deliveries (org_id, alert_id, created_at desc);
create index alert_deliveries_canonical_listing_idx on public.alert_deliveries (canonical_listing_id);
create index audit_events_org_created_idx on public.audit_events (org_id, created_at desc);
create index audit_events_actor_user_idx on public.audit_events (actor_user_id);
create index organization_members_user_idx on public.organization_members (user_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create trigger sources_set_updated_at
before update on public.sources
for each row execute function public.set_updated_at();

create trigger canonical_listings_set_updated_at
before update on public.canonical_listings
for each row execute function public.set_updated_at();

create trigger tenant_listing_states_set_updated_at
before update on public.tenant_listing_states
for each row execute function public.set_updated_at();

create trigger notes_set_updated_at
before update on public.notes
for each row execute function public.set_updated_at();

create trigger saved_searches_set_updated_at
before update on public.saved_searches
for each row execute function public.set_updated_at();

create trigger alerts_set_updated_at
before update on public.alerts
for each row execute function public.set_updated_at();

create function app_private.is_org_member(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where org_id = target_org_id
      and user_id = auth.uid()
  );
$$;

create function app_private.is_org_admin(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where org_id = target_org_id
      and user_id = auth.uid()
      and role = 'admin'
  );
$$;

create function app_private.has_any_org_membership()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where user_id = auth.uid()
  );
$$;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.sources enable row level security;
alter table public.source_listings enable row level security;
alter table public.canonical_listings enable row level security;
alter table public.canonical_listing_links enable row level security;
alter table public.listing_history enable row level security;
alter table public.source_health_metrics enable row level security;
alter table public.tenant_listing_states enable row level security;
alter table public.tags enable row level security;
alter table public.tenant_listing_tags enable row level security;
alter table public.notes enable row level security;
alter table public.saved_searches enable row level security;
alter table public.alerts enable row level security;
alter table public.alert_deliveries enable row level security;
alter table public.audit_events enable row level security;

create policy "org members can read their organizations"
on public.organizations
for select to authenticated
using (app_private.is_org_member(id));

create policy "org admins can update organizations"
on public.organizations
for update to authenticated
using (app_private.is_org_admin(id))
with check (app_private.is_org_admin(id));

create policy "org members can read memberships"
on public.organization_members
for select to authenticated
using (app_private.is_org_member(org_id));

create policy "org admins can insert memberships"
on public.organization_members
for insert to authenticated
with check (app_private.is_org_admin(org_id));

create policy "org admins can update memberships"
on public.organization_members
for update to authenticated
using (app_private.is_org_admin(org_id))
with check (app_private.is_org_admin(org_id));

create policy "org admins can delete memberships"
on public.organization_members
for delete to authenticated
using (app_private.is_org_admin(org_id));

create policy "authenticated org members can read sources"
on public.sources
for select to authenticated
using (app_private.has_any_org_membership());

create policy "authenticated org members can read source listings"
on public.source_listings
for select to authenticated
using (app_private.has_any_org_membership());

create policy "authenticated org members can read canonical listings"
on public.canonical_listings
for select to authenticated
using (app_private.has_any_org_membership());

create policy "authenticated org members can read canonical links"
on public.canonical_listing_links
for select to authenticated
using (app_private.has_any_org_membership());

create policy "authenticated org members can read listing history"
on public.listing_history
for select to authenticated
using (app_private.has_any_org_membership());

create policy "authenticated org members can read source health"
on public.source_health_metrics
for select to authenticated
using (app_private.has_any_org_membership());

create policy "org members manage tenant listing states"
on public.tenant_listing_states
for all to authenticated
using (app_private.is_org_member(org_id))
with check (app_private.is_org_member(org_id));

create policy "org members manage tags"
on public.tags
for all to authenticated
using (app_private.is_org_member(org_id))
with check (app_private.is_org_member(org_id));

create policy "org members manage listing tags"
on public.tenant_listing_tags
for all to authenticated
using (app_private.is_org_member(org_id))
with check (app_private.is_org_member(org_id));

create policy "org members manage notes"
on public.notes
for all to authenticated
using (app_private.is_org_member(org_id))
with check (app_private.is_org_member(org_id));

create policy "org members manage saved searches"
on public.saved_searches
for all to authenticated
using (app_private.is_org_member(org_id))
with check (app_private.is_org_member(org_id));

create policy "org members manage alerts"
on public.alerts
for all to authenticated
using (app_private.is_org_member(org_id))
with check (app_private.is_org_member(org_id));

create policy "org members read alert deliveries"
on public.alert_deliveries
for select to authenticated
using (app_private.is_org_member(org_id));

create policy "org members read audit events"
on public.audit_events
for select to authenticated
using (org_id is not null and app_private.is_org_member(org_id));

grant usage on schema public to authenticated;
grant usage on schema app_private to authenticated;
grant execute on all functions in schema app_private to authenticated;

grant select on public.organizations to authenticated;
grant select on public.organization_members to authenticated;
grant update on public.organizations to authenticated;
grant select on public.sources to authenticated;
grant select on public.source_listings to authenticated;
grant select on public.canonical_listings to authenticated;
grant select on public.canonical_listing_links to authenticated;
grant select on public.listing_history to authenticated;
grant select on public.source_health_metrics to authenticated;
grant select, insert, update, delete on public.tenant_listing_states to authenticated;
grant select, insert, update, delete on public.tags to authenticated;
grant select, insert, update, delete on public.tenant_listing_tags to authenticated;
grant select, insert, update, delete on public.notes to authenticated;
grant select, insert, update, delete on public.saved_searches to authenticated;
grant select, insert, update, delete on public.alerts to authenticated;
grant select on public.alert_deliveries to authenticated;
grant select on public.audit_events to authenticated;
grant usage, select on all sequences in schema public to authenticated;
