# Index + Link MVP Design

Spec-ul sursă este promptul din `2026-05-24`: produs CRM/SaaS multi-tenant pentru agregare anunțuri imobiliare RO, deduplicare canonică și workflow per agenție.

## Decizii implementate în scaffold

- Cloudflare Worker pentru scheduler, queues și viitorii adapters de crawl/parse.
- Supabase Postgres pentru model global + tenant, cu RLS activ pe toate tabelele expuse.
- GitHub Actions pentru verificare automată la push/PR.
- Dedup inițial în TypeScript prin normalizare, blocking și scor conservator.

## Decizii amânate

- UI complet `Search`, `Listing Detail`, `Saved Searches`, `Alerts`, `Settings`.
- Adaptere reale pentru portaluri; acestea trebuie adăugate incremental, cu teste de parsing per sursă.
- Tool admin pentru split/merge canonical listings.
