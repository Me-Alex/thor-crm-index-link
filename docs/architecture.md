# Arhitectură MVP: Index + Link

## Boundary principal

- Global: `sources`, `source_listings`, `canonical_listings`, `canonical_listing_links`, `listing_history`, `source_health_metrics`.
- Tenant: `organizations`, `organization_members`, `tenant_listing_states`, `tags`, `tenant_listing_tags`, `notes`, `saved_searches`, `alerts`, `alert_deliveries`.
- Ingestia rulează server-side în Cloudflare Worker cu service role; UI/API client folosește Supabase Auth + RLS pentru izolare tenant.

## Pipeline

1. `scheduled` pornește discover jobs prin Cloudflare Queues.
2. Adapterele per sursă extrag URL-uri și payload normalizat, fără bypass CAPTCHA/login/paywall.
3. `normalizeListingObservation` transformă câmpurile RO în valori comparabile.
4. `scoreCandidateMatch` aplică blocking + scor conservator pentru a lega un `SourceListing` la un `CanonicalListing`.
5. Supabase persistă provenance, match reasons, istoric de preț/disponibilitate și workflow per tenant.

## Conformitate

- Produsul este `index + link`: nu re-hostează descrieri integrale sau imagini portal; păstrează payload normalizat și URL-uri sursă.
- `source_listings.normalized_payload` trebuie să rămână minim și să evite HTML brut.
- Datele pot fi personale; accesul este controlat prin Supabase Auth, RLS, audit events și secrete server-side în Cloudflare.

## Operare

- `sources.mode` permite `on/degraded/off` per portal.
- `source_health_metrics` urmărește crawl success, parse success, field coverage, match rate și latență.
- GitHub Actions rulează testele și typecheck-ul la push/PR.
