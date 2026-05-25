# Operare și provisioning

Data: 2026-05-25

## Supabase

Deploy-ul public curent folosește proiectul existent `habitat-crm-romania` (`mrnltzamrhgrgslmjzvu`). Încercarea de a crea proiectul nou `thor-crm-index-link` a fost blocată de limita Supabase free de 2 proiecte active.

```bash
npx supabase@latest link --project-ref <project-ref>
npx supabase@latest db push
```

După primul admin creat în Auth, bootstrap-ul organizației trebuie făcut cu service role sau SQL controlat:

```sql
insert into public.organizations (name, slug)
values ('Demo Agency', 'demo-agency')
returning id;

insert into public.organization_members (org_id, user_id, role)
values ('<org-id>', '<auth-user-id>', 'admin');
```

Reguli:

- Nu expune `service_role` în frontend.
- Folosește `SUPABASE_SERVICE_ROLE_KEY` doar în Worker/server repositories; endpointurile tenant autentificate primesc token Supabase de utilizator și verifică membership înainte de orice operație cu service role.
- Frontend-ul poate folosi Supabase Auth pentru sesiune, dar nu apelează Supabase cu service role și nu scrie direct în tabele tenant ocolind Worker-ul.
- Nu rula comenzi destructive fără aprobare explicită.
- Orice schimbare de schemă se face prin migration.
- RLS rămâne obligatoriu pe tabele tenant.

## Cloudflare

```bash
npx wrangler queues create thor-crm-discover
npx wrangler queues create thor-crm-fetch
npx wrangler queues create thor-crm-match
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config apps/worker/wrangler.jsonc
npx wrangler secret put ADMIN_API_KEY --config apps/worker/wrangler.jsonc
npm run deploy --workspace @thor-crm/worker
```

Reguli:

- Deploy-ul se face doar după `npm run verify`.
- Secretele Cloudflare `SUPABASE_SERVICE_ROLE_KEY` și `ADMIN_API_KEY` rămân obligatorii și după introducerea endpointurilor autentificate; tokenul de utilizator Supabase nu înlocuiește service role-ul backend.
- `SUPABASE_URL` rămâne variabilă de Worker, nu secret, iar cheile private se setează doar prin `wrangler secret put` sau dashboard Cloudflare.
- Queue handlers trebuie să valideze payload-ul.
- `429` și `503` reduc frecvența sau pun sursa în `degraded`, nu declanșează retry agresiv.
- Worker-ul expune `/health` pentru runtime și `/ready` pentru verificarea configurației Supabase + REST connectivity.

### Authenticated tenant workflow smoke

Endpointurile tenant folosesc headerul `Authorization: Bearer <SUPABASE_USER_ACCESS_TOKEN>` și sunt scoped pe `orgId`:

```bash
curl -i \
  -H "Authorization: Bearer <SUPABASE_USER_ACCESS_TOKEN>" \
  https://thor-crm-index-link-worker.floreaalexandru2002.workers.dev/api/orgs/<org-id>/listings/<canonical-listing-id>/workflow
```

Validare:

- Un membru al organizației primește doar saved searches, listing states, tags, notes și alert deliveries pentru acel `orgId`.
- Un user fără membership primește `401`/`403` sau răspuns gol, niciodată date din alt tenant.
- Răspunsurile nu includ tokens, service role keys, payload HTML brut sau conținut re-hosted.
- Testele pentru aceste endpointuri folosesc repositories/fetch fake și nu apelează Supabase real.

### Demo ingest

Endpointul operațional pentru fixture ingest este:

```bash
curl -X POST \
  -H "x-admin-api-key: <ADMIN_API_KEY>" \
  https://thor-crm-index-link-worker.floreaalexandru2002.workers.dev/admin/ingest/demo
```

Acest endpoint:

- rulează doar fixture-ul demo permis;
- nu face request către portaluri reale;
- normalizează listingul;
- face upsert în `source_listings` prin Supabase REST, server-side;
- necesită `ADMIN_API_KEY`.

## Cloudflare Pages

Frontend-ul este publicat la:

```text
https://thor-crm-index-link-web.pages.dev
```

Validare minimă după deploy:

```bash
npm run build
curl -I https://thor-crm-index-link-web.pages.dev
curl -i https://thor-crm-index-link-worker.floreaalexandru2002.workers.dev/ready
```

## GitHub

Repository-ul are CI în `.github/workflows/ci.yml`. Pentru publicare într-un repo nou:

```bash
git remote add origin git@github.com:<owner>/<repo>.git
git push -u origin master
```

Reguli PR:

- PR-ul trebuie să includă ce s-a schimbat și cum a fost verificat.
- Nu se face merge fără CI verde, cu excepția cazurilor documentate.
- Deploy-ul rămâne separat de review-ul PR.
- Pentru schimbări Supabase, PR-ul trebuie să includă migration și impactul de date.

## GitHub / Cloudflare / Supabase release runbook

1. GitHub: verifică `git status`, confirmă că schimbările sunt scoped, rulează `npm test`, `npm run typecheck` și `npm run build`, apoi deschide PR cu impactul operațional și pașii de verificare.
2. Supabase: pentru orice schimbare de schemă, creează migration, verifică RLS pe tabele tenant și documentează impactul asupra `organizations`, `organization_members` și workflow; nu rula SQL destructive fără aprobare explicită.
3. Cloudflare Worker: confirmă queue bindings, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` și `ADMIN_API_KEY`, rulează deploy doar după CI verde și verifică `/health` plus `/ready`.
4. Cloudflare Pages: publică build-ul frontend după Worker când UI depinde de endpointuri noi; verifică URL-ul Pages și fluxul public demo.
5. Tenant smoke: autentifică un user de test prin fluxul normal Supabase Auth, verifică endpointurile `/api/orgs/:orgId/...` cu token de utilizator și confirmă că un alt `orgId` nu expune date.
6. Post-release: monitorizează Worker logs, queue backlog, Supabase REST errors, `alert_delivery_success_rate` și raportează orice sursă instabilă prin runbook-ul de incident.

## Source health

Stări suportate:

- `on`: sursă activă, funcționare normală.
- `degraded`: erori crescute sau calitate scăzută; se reduce ritmul.
- `off`: sursă oprită manual sau automat.
- `blocked`: sursă interzisă până la review operațional sau juridic.

Metrici recomandate:

- `source_fetch_success_rate`
- `source_fetch_429_rate`
- `source_fetch_503_rate`
- `parser_coverage_rate`
- `parse_failure_rate`
- `dedup_auto_match_rate`
- `dedup_candidate_rate`
- `queue_backlog`
- `time_to_index_seconds`
- `alert_delivery_success_rate`

## Incident runbook pentru surse

1. Marchează sursa `degraded` sau `off`.
2. Oprește scheduling-ul pentru domeniul afectat.
3. Păstrează joburile eșuate în dead letter.
4. Inspectează ultimele fetch errors, parse errors și fixture-uri.
5. Actualizează adapterul sau politica sursei.
6. Rulează parser tests și Worker tests.
7. Reia ingestia gradual, cu rate limit redus.

Policy-ul complet pentru surse este în `docs/source-policy.md`.
