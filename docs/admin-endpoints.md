# Admin endpoints

Data: 2026-05-25

## Source mode control

O sursa poate fi trecuta rapid in `on`, `degraded` sau `off` fara redeploy:

```bash
curl -X PATCH \
  -H "x-admin-api-key: <ADMIN_API_KEY>" \
  -H "content-type: application/json" \
  -d "{\"mode\":\"degraded\"}" \
  https://thor-crm-index-link-worker.floreaalexandru2002.workers.dev/admin/sources/<source-id>/mode
```

Endpointul scrie doar `sources.mode`, este protejat de `ADMIN_API_KEY` si trebuie folosit pentru oprire rapida cand un portal are `429/503`, robots disallow sau parser coverage slab.

## Dedup review

Endpoint read-only pentru auditul linkurilor `SourceListing -> CanonicalListing`:

```bash
curl -H "x-admin-api-key: <ADMIN_API_KEY>" \
  "https://thor-crm-index-link-worker.floreaalexandru2002.workers.dev/admin/dedup/links?limit=100"
```

Raspunsul include `sourceListingId`, `canonicalListingId`, `matchScore`, `matchReasons` si `linkedAt`. Merge/split destructiv nu se ruleaza prin acest endpoint.
