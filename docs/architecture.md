# Arhitectură MVP: Index + Link

Data: 2026-05-25

## Boundary principal

- Global: `sources`, `source_listings`, `canonical_listings`, `canonical_listing_links`, `listing_history`, `source_health_metrics`.
- Tenant: `organizations`, `organization_members`, `tenant_listing_states`, `tags`, `tenant_listing_tags`, `notes`, `saved_searches`, `alerts`, `alert_deliveries`.
- Operațional: queue jobs, retry state, dead letters, source status, parse coverage, match metrics.

Ingestia rulează server-side în Cloudflare Worker cu service role. UI/API client folosește Supabase Auth + RLS pentru izolarea tenant.

## Pipeline

```text
scheduled trigger
  -> discover queue
  -> fetch queue
  -> parser adapter
  -> normalize listing observation
  -> match/dedup
  -> canonical listing + source link
  -> tenant workflow
  -> saved search evaluator
  -> alerts
```

Pași:

1. `scheduled` pornește discover jobs prin Cloudflare Queues.
2. Adapterele per sursă extrag URL-uri și payload normalizat, fără bypass CAPTCHA/login/paywall.
3. `normalizeListingObservation` transformă câmpurile RO în valori comparabile.
4. `scoreCandidateMatch` aplică blocking + scor conservator pentru a lega un `SourceListing` la un `CanonicalListing`.
5. Supabase persistă provenance, match reasons, istoric de preț/disponibilitate și workflow per tenant.

## Global vs tenant

`CanonicalListing` este global. Orice status comercial, notă, tag, asignare sau alertă este scoped pe tenant.

Această separare previne:

- scurgeri de workflow între agenții;
- duplicarea inutilă a listingurilor canonice;
- amestecarea datelor operaționale cu datele de produs;
- expunerea accidentală a service role în frontend.

## Conformitate

- Produsul este `index + link`: nu re-hostează descrieri integrale sau imagini portal.
- `source_listings.normalized_payload` trebuie să rămână minim și să evite HTML brut.
- Datele pot fi personale; accesul este controlat prin Supabase Auth, RLS, audit events și secrete server-side în Cloudflare.
- Policy-ul pentru surse este în `docs/source-policy.md`.

## Operare

- `sources.mode` permite `on`, `degraded`, `off` și, unde schema va fi extinsă, `blocked`.
- `source_health_metrics` urmărește crawl success, parse success, field coverage, match rate și latență.
- GitHub Actions rulează `npm test`, `npm run typecheck` și `npm run build` la push/PR.

## Direcții următoare

- Extrage tipurile comune în `packages/core`.
- Extinde `packages/adapters` din adapterul demo pe fixture către adaptere reale aprobate.
- Mută dedup scoring în `packages/dedup`.
- Adaugă fixture builders în `packages/testing`.
- Adaugă teste RLS explicite pentru izolarea tenant.

## Stare implementare

- `packages/adapters` conține un adapter demo care parsează fixture HTML permis.
- Worker-ul are un fetch pipeline MVP care normalizează observația, face upsert în `source_listings`, caută candidați canonici, creează sau linkuiește `canonical_listings`, scrie `canonical_listing_links` și adaugă `listing_history`.
- Queue handler-ul procesează mesajele `discover` și `fetch`; demo-ul folosește fixture-uri aprobate și nu face requesturi live către portaluri reale.
- `POST /admin/ingest/demo` rulează ingestia demo prin același pipeline și este protejat cu `x-admin-api-key`.
