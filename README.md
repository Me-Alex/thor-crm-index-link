# Thor CRM Index + Link

Monorepo MVP pentru un CRM/SaaS multi-tenant destinat agențiilor imobiliare din România. Proiectul construiește baza tehnică pentru indexare, deduplicare conservatoare, workflow per agenție și operare prin Cloudflare, Supabase și GitHub.

## Linkuri publice

- Aplicație web: <https://thor-crm-index-link-web.pages.dev>
- Worker health: <https://thor-crm-index-link-worker.floreaalexandru2002.workers.dev/health>
- Repository: <https://github.com/Me-Alex/thor-crm-index-link>
- Supabase project: <https://supabase.com/dashboard/project/mqzchppokgaoacgkqkzh>

## Proiecte

- `apps/web` — dashboard React/Vite publicat pe Cloudflare Pages.
- `apps/worker` — Cloudflare Worker TypeScript pentru health, cron scheduler și queue consumers pentru pipeline-ul `discover -> fetch -> match`.
- `packages/adapters` — adapter demo pe fixture HTML permis, cu parser tests și parse coverage de bază.
- `supabase` — proiect Supabase local cu migrations pentru schema globală, tenant workflow, RLS și seed demo.
- `docs` — arhitectură, operațiuni, policy de surse și rapoarte pentru lucru cu agenți.
- `.github/workflows/ci.yml` — GitHub Actions pentru test, typecheck și build.

## Comenzi locale

```bash
npm install
npm test
npm run typecheck
npm run build
npm run verify
npm run dev --workspace @thor-crm/worker
```

PowerShell poate bloca `npm.ps1`; pe Windows rulează `npm.cmd ...`.

## Guardrails

- Produsul este `index + link`, nu re-hosting integral.
- Nu se implementează bypass pentru CAPTCHA, paywall, login obligatoriu sau blocaje anti-bot.
- Testele nu fac fetch către portaluri reale.
- Pipeline-ul de ingestie curent rulează pe fixture-uri, nu pe crawling live.
- Endpointul `POST /admin/ingest/demo` rulează ingestia demo protejată cu `x-admin-api-key`.
- Schimbările de schemă Supabase se fac prin migrations.
- Înainte de PR rulează `npm run verify`.

Regulile complete pentru agenți sunt în `AGENTS.md`.

## Documentație

- `docs/architecture.md` — arhitectura MVP și boundary global/tenant.
- `docs/operations.md` — provisioning și operare Cloudflare/Supabase/GitHub.
- `docs/source-policy.md` — policy pentru surse, crawling, PII și incident runbook.
- `docs/codex-build-report.md` — raport complet pentru construirea proiectului cu OpenAI Codex.
- `docs/claude-code-build-report.md` — raport pentru construirea proiectului cu Claude Code.

## Deploy minim

1. Link-uiește proiectul Supabase și rulează migrations din `supabase/migrations`. Deploy-ul curent folosește proiectul dedicat `thor-crm-index-link` (`mqzchppokgaoacgkqkzh`).
2. Setează secretele Cloudflare Worker: `SUPABASE_SERVICE_ROLE_KEY` și `ADMIN_API_KEY`.
3. Creează Cloudflare Queues: `thor-crm-discover`, `thor-crm-fetch`, `thor-crm-match`.
4. Actualizează `SUPABASE_URL` în `apps/worker/wrangler.jsonc`.
5. Rulează `npm run deploy --workspace @thor-crm/worker`.

Nu rula deploy, crawling live sau comenzi destructive fără confirmare explicită.
