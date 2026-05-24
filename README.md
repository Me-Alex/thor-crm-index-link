# Thor CRM Index + Link

Monorepo MVP pentru un CRM/SaaS multi-tenant destinat agențiilor imobiliare din România. Scope-ul implementat aici este baza tehnică pentru indexare, deduplicare conservatoare, workflow per agenție și operare prin Cloudflare + Supabase + GitHub.

## Proiecte

- `apps/worker` — Cloudflare Worker TypeScript pentru health, cron scheduler și queue consumers pentru pipeline-ul `discover -> fetch -> match`.
- `supabase` — proiect Supabase local cu migration inițială pentru schema globală, tenant workflow, RLS și seed demo.
- `.github/workflows/ci.yml` — GitHub Actions pentru `npm test` și `npm run typecheck`.

## Comenzi locale

```bash
npm install
npm test
npm run typecheck
npm run dev --workspace @thor-crm/worker
```

PowerShell poate bloca `npm.ps1`; pe Windows rulează `npm.cmd ...`.

## Deploy minim

1. Creează/link-uiește un proiect Supabase și rulează migration-ul din `supabase/migrations`. Deploy-ul curent folosește `habitat-crm-romania` (`mrnltzamrhgrgslmjzvu`), deoarece limita Supabase free blochează un al treilea proiect activ.
2. Setează secretele Cloudflare Worker: `SUPABASE_SERVICE_ROLE_KEY` și `ADMIN_API_KEY`.
3. Creează Cloudflare Queues: `thor-crm-discover`, `thor-crm-fetch`, `thor-crm-match`.
4. Actualizează `SUPABASE_URL` în `apps/worker/wrangler.jsonc`.
5. Rulează `npm run deploy --workspace @thor-crm/worker`.

Nu am creat resurse remote fără ID-uri explicite de proiect/repo.
