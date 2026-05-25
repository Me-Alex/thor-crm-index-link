create index if not exists listing_history_source_listing_idx on public.listing_history (source_listing_id);
create index if not exists tenant_listing_states_canonical_idx on public.tenant_listing_states (canonical_listing_id);
create index if not exists tenant_listing_states_assignee_user_idx on public.tenant_listing_states (assignee_user_id);
create index if not exists tags_created_by_idx on public.tags (created_by);
create index if not exists tenant_listing_tags_org_tag_idx on public.tenant_listing_tags (org_id, tag_id);
create index if not exists notes_author_user_idx on public.notes (author_user_id);
create index if not exists saved_searches_owner_user_idx on public.saved_searches (owner_user_id);
create index if not exists alerts_saved_search_fk_idx on public.alerts (org_id, saved_search_id);
create index if not exists alert_deliveries_canonical_listing_idx on public.alert_deliveries (canonical_listing_id);
create index if not exists audit_events_actor_user_idx on public.audit_events (actor_user_id);
create index if not exists organization_members_user_idx on public.organization_members (user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop policy if exists "org admins can manage memberships" on public.organization_members;
drop policy if exists "org admins can insert memberships" on public.organization_members;
drop policy if exists "org admins can update memberships" on public.organization_members;
drop policy if exists "org admins can delete memberships" on public.organization_members;

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
