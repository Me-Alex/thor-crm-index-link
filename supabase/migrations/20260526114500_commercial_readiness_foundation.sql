do $$
begin
  if not exists (select 1 from pg_type where typname = 'billing_plan') then
    create type public.billing_plan as enum ('pilot', 'pro', 'scale');
  end if;
  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'unpaid', 'manual_review');
  end if;
  if not exists (select 1 from pg_type where typname = 'compliance_request_type') then
    create type public.compliance_request_type as enum ('takedown', 'opt_out', 'gdpr_access', 'gdpr_erasure', 'gdpr_rectification', 'security', 'other');
  end if;
  if not exists (select 1 from pg_type where typname = 'compliance_request_status') then
    create type public.compliance_request_status as enum ('open', 'in_review', 'resolved', 'rejected');
  end if;
end $$;

create table public.organization_profiles (
  org_id uuid primary key references public.organizations (id) on delete cascade,
  legal_name text,
  billing_email text,
  support_email text,
  phone text,
  website text,
  onboarding_completed_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_billing (
  org_id uuid primary key references public.organizations (id) on delete cascade,
  plan public.billing_plan not null default 'pilot',
  subscription_status public.subscription_status not null default 'trialing',
  trial_ends_at timestamptz,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_checkout_session_id text unique,
  current_period_end timestamptz,
  seats integer not null default 3 check (seats > 0 and seats <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.compliance_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations (id) on delete set null,
  request_type public.compliance_request_type not null,
  requester_email text not null check (requester_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  subject text not null check (char_length(subject) between 3 and 200),
  target_url text,
  details text not null check (char_length(details) between 10 and 10000),
  status public.compliance_request_status not null default 'open',
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.operational_audit_events (
  id bigint generated always as identity primary key,
  org_id uuid references public.organizations (id) on delete set null,
  event_type text not null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  actor_user_id uuid references auth.users (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create trigger organization_profiles_set_updated_at
before update on public.organization_profiles
for each row execute function public.set_updated_at();

create trigger organization_billing_set_updated_at
before update on public.organization_billing
for each row execute function public.set_updated_at();

create trigger compliance_requests_set_updated_at
before update on public.compliance_requests
for each row execute function public.set_updated_at();

alter table public.organization_profiles enable row level security;
alter table public.organization_billing enable row level security;
alter table public.compliance_requests enable row level security;
alter table public.operational_audit_events enable row level security;

create policy "org members read organization profiles"
on public.organization_profiles
for select to authenticated
using (app_private.is_org_member(org_id));

create policy "org admins manage organization profiles"
on public.organization_profiles
for all to authenticated
using (app_private.is_org_admin(org_id))
with check (app_private.is_org_admin(org_id));

create policy "org members read organization billing"
on public.organization_billing
for select to authenticated
using (app_private.is_org_member(org_id));

create policy "org admins update organization billing"
on public.organization_billing
for update to authenticated
using (app_private.is_org_admin(org_id))
with check (app_private.is_org_admin(org_id));

create policy "org members read compliance requests"
on public.compliance_requests
for select to authenticated
using (org_id is not null and app_private.is_org_member(org_id));

create policy "org members read operational audit events"
on public.operational_audit_events
for select to authenticated
using (org_id is not null and app_private.is_org_member(org_id));

create index compliance_requests_org_status_idx on public.compliance_requests (org_id, status, created_at desc);
create index compliance_requests_status_created_idx on public.compliance_requests (status, created_at desc);
create index organization_billing_status_idx on public.organization_billing (subscription_status, trial_ends_at);
create index operational_audit_events_org_created_idx on public.operational_audit_events (org_id, created_at desc);
