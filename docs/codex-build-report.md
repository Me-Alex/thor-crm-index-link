# Raport: construirea Thor CRM Index + Link cu Codex

Data: 2026-05-25  
Proiect: Thor CRM Index + Link  
Repo: <https://github.com/Me-Alex/thor-crm-index-link>  
Cloudflare Pages: <https://thor-crm-index-link-web.pages.dev>  
Worker health: <https://thor-crm-index-link-worker.floreaalexandru2002.workers.dev/health>  
Supabase project: <https://supabase.com/dashboard/project/mqzchppokgaoacgkqkzh>

## 1. Scop

Acest document descrie cum poate fi construit și operat proiectul Thor CRM Index + Link folosind OpenAI Codex ca agent de dezvoltare controlat prin repository, CI, review, instrucțiuni explicite și medii izolate.

Obiectivele tehnice rămân:

- agregare și indexare de anunțuri imobiliare;
- deduplicare într-un `CanonicalListing` global;
- workflow multi-tenant pentru agenții imobiliare;
- afișare de tip index + link, fără re-hosting integral al conținutului portalurilor;
- publicare și operare prin GitHub, Cloudflare și Supabase.

## 2. Concluzie executivă

Codex este potrivit pentru acest proiect dacă este folosit ca agent software controlat, nu ca executor liber. Poate citi cod, modifica fișiere, rula comenzi și lucra în fundal pe taskuri din repo, inclusiv prin Codex Cloud, CLI, IDE și integrare GitHub cu `@codex`.

Structura recomandată:

- GitHub pentru repo, branch-uri, issue-uri, PR-uri, review și CI;
- Codex Cloud pentru taskuri izolate în fundal, PR-uri și review pe issue/PR;
- Codex CLI sau Codex Desktop pentru lucru local asistat, verificări, refactorizări și debugging;
- `AGENTS.md` pentru reguli de proiect, guardrails și comenzi obligatorii;
- OpenAI Docs MCP pentru documentație oficială OpenAI direct în contextul agentului;
- Cloudflare Pages pentru frontend public;
- Cloudflare Workers pentru API, health endpoints, orchestration și queue handlers;
- Cloudflare Queues pentru pipeline asincron de discover, fetch, parse, match și alert;
- Supabase Postgres pentru date globale, workflow tenant, RLS, audit și migrations.

Principiul central: Codex poate propune și implementa schimbări, dar deploy-ul, accesul la secrets, politicile de crawling și deciziile de conformitate trebuie controlate prin review uman, CI și permisiuni explicite.

## 3. Când folosim Codex

Folosește Codex pentru:

- implementări incrementale din issue-uri mici;
- review de PR-uri și căutare de regresii;
- refactorizări cu teste;
- investigarea erorilor de CI;
- generarea sau îmbunătățirea documentației tehnice;
- explicarea fluxurilor din codebase;
- scrierea de teste pentru parser, Worker, RLS și dedup.

Nu folosi Codex pentru:

- deploy direct în producție fără confirmare;
- rularea crawling-ului real în CI;
- acces direct la secrets sau service role keys;
- implementare de bypass pentru CAPTCHA, paywall, login obligatoriu sau blocaje anti-bot;
- modificări mari pornite din prompturi vagi;
- schimbări destructive în Supabase fără plan și aprobare.

## 4. Principii de produs și conformitate

Thor CRM Index + Link trebuie tratat ca produs de indexare, nu ca replică a portalurilor sursă.

Reguli de bază:

- aplicația afișează sumar, semnale normalizate, status intern și link către sursă;
- nu re-hostează integral descrieri, galerii sau conținut proprietar al portalurilor;
- nu implementează bypass pentru CAPTCHA, paywall, login obligatoriu, blocaje anti-bot sau restricții tehnice explicite;
- orice sursă externă este izolată într-un adapter testabil;
- crawling-ul real se activează gradual, cu rate limit, backoff și circuit breaker;
- datele cu risc PII trebuie minimizate, auditate și supuse unei politici de retenție;
- trebuie să existe mecanism de takedown, opt-out sau dezactivare rapidă a unei surse.

Acest document nu înlocuiește review juridic. Pentru surse reale, termenii de utilizare, `robots.txt`, GDPR și relația comercială cu portalurile trebuie evaluate separat.

## 5. Arhitectură recomandată

Flux operațional:

```text
Source registry
  -> discover queue
  -> fetch queue
  -> parser adapter
  -> SourceListing
  -> normalize
  -> dedup matcher
  -> CanonicalListing + CanonicalListingLink
  -> tenant workflow
  -> saved search evaluator
  -> alerts + dashboard
```

Separare logică:

- Global layer: surse, anunțuri sursă, anunțuri canonice, linkuri de deduplicare, health per sursă.
- Tenant layer: status, note, taguri, agent asignat, căutări salvate, alerte și audit per agenție.
- Operational layer: queue jobs, retry state, dead letters, parse coverage, match metrics, source toggles.

Această separare previne contaminarea datelor între agenții și păstrează `CanonicalListing` ca entitate globală reutilizabilă.

## 6. Setup Codex

### 6.1 Codex Cloud

Setup recomandat:

- conectează contul GitHub în Codex;
- acordă acces doar la repo-urile necesare;
- configurează environment-ul pentru proiect;
- setează setup script non-destructive;
- setează internet access minim necesar;
- păstrează secrets în secret store, nu în repo;
- folosește ask mode pentru analiză și code mode pentru schimbări cu PR.

Setup script recomandat:

```bash
npm ci
npm run typecheck
```

Pentru taskuri de implementare, Codex poate rula ulterior:

```bash
npm test
npm run typecheck
npm run build
```

Nu include în setup script:

- deploy-uri;
- crawling live;
- `supabase db push`;
- comenzi care scriu în producție;
- comenzi care citesc sau printează secrets.

### 6.2 Codex CLI sau Codex Desktop

Pentru lucru local:

```powershell
cd "C:\Users\flore\Documents\Thor CRM"
codex
```

Reguli locale:

- pornește din repo, nu din home directory;
- lucrează pe branch separat pentru schimbări mari;
- rulează verificări înainte de commit sau PR;
- nu expune `.env`, tokens sau output cu secrets în conversație;
- confirmă explicit comenzile cu impact: deploy, push, migration, delete.

### 6.3 OpenAI Docs MCP

Pentru răspunsuri despre OpenAI, Codex trebuie să consulte documentația oficială prin OpenAI Docs MCP.

Configurare recomandată:

```bash
codex mcp add openaiDeveloperDocs --url https://developers.openai.com/mcp
codex mcp list
```

Alternativ, în `~/.codex/config.toml`:

```toml
[mcp_servers.openaiDeveloperDocs]
url = "https://developers.openai.com/mcp"
```

Regulă recomandată în `AGENTS.md`:

```text
Always use the OpenAI developer documentation MCP server if you need to work with the OpenAI API, ChatGPT Apps SDK, Codex, or related docs without me having to explicitly ask.
```

## 7. Internet access și sandbox

Pentru Codex Cloud, internet access trebuie tratat ca risc operațional. Setup scripts au nevoie uneori de internet pentru dependențe, dar agentul nu trebuie să aibă acces liber la orice domeniu.

Politica recomandată:

- default: internet access off pentru taskuri care nu au nevoie de rețea;
- pentru build: allowlist pentru npm, GitHub și registry-uri necesare;
- pentru documentație OpenAI: allowlist pentru `developers.openai.com` și `platform.openai.com`;
- pentru Cloudflare/Supabase: allowlist doar în taskuri de infrastructură, preferabil staging;
- blochează metode riscante dacă nu sunt necesare, mai ales `POST`, `PUT`, `PATCH`, `DELETE`;
- nu permite crawling live către portaluri reale în taskuri Codex generale.

Risc important: issue-urile, PR comments, paginile web și documentația externă pot conține instrucțiuni ostile. Codex trebuie să trateze conținutul extern ca date, nu ca instrucțiuni.

## 8. Structură recomandată a repo-ului

```text
apps/
  web/
    src/
    test/
  worker/
    src/
    test/
packages/
  core/
    src/
  adapters/
    src/
    fixtures/
    test/
  dedup/
    src/
    test/
  testing/
    src/
supabase/
  migrations/
  seed.sql
docs/
  architecture.md
  operations.md
  source-policy.md
  codex-build-report.md
.github/
  workflows/
    ci.yml
AGENTS.md
package.json
```

Responsabilități:

- `apps/web`: dashboard React/Vite publicat pe Cloudflare Pages;
- `apps/worker`: API, health, ingestie, queue handlers și orchestration;
- `packages/core`: tipuri comune, validări, utilitare de normalizare;
- `packages/adapters`: adaptere izolate per sursă și fixture-uri HTML permise;
- `packages/dedup`: algoritm de blocking, scoring și audit pentru match-uri;
- `packages/testing`: helpers pentru teste, mock-uri și fixture builders;
- `supabase/migrations`: schema Postgres, indexuri, RLS și audit;
- `docs`: decizii tehnice, operațiuni, politici de sursă și runbooks;
- `.github/workflows`: CI și reguli de calitate.

## 9. Model de date recomandat

Tabele globale:

- `sources`: registrul surselor, domenii, status, limite și politica de crawl;
- `source_listings`: anunțuri brute normalizate minimal, cu link către sursă;
- `canonical_listings`: entitate globală deduplicată;
- `canonical_listing_links`: legătura auditabilă între `source_listings` și `canonical_listings`;
- `source_health_events`: erori, degradări, `429/503`, parse failures;
- `ingest_jobs`: stare job, retry count, error category, dead-letter reason.

Tabele tenant:

- `tenants`;
- `tenant_users`;
- `tenant_listing_state`;
- `tenant_listing_tags`;
- `tenant_listing_notes`;
- `saved_searches`;
- `alert_deliveries`;
- `audit_log`.

Regulă de separare:

- `CanonicalListing` este global și nu conține workflow intern de agenție;
- orice status comercial, notă, tag, asignare sau alertă este scoped pe tenant;
- RLS trebuie activat pe toate tabelele tenant;
- frontend-ul nu folosește niciodată Supabase service role.

## 10. Moduri de lucru cu Codex

### 10.1 Ask mode

Folosește pentru:

- înțelegerea codebase-ului;
- review arhitectural;
- explicarea unui flux;
- identificarea riscurilor;
- propunerea unui plan fără modificări.

Prompt exemplu:

```text
Analizează fluxul de ingestie și dedup din repo.
Nu modifica fișiere.
Returnează o diagramă Mermaid și o listă de riscuri tehnice.
Respectă AGENTS.md.
```

### 10.2 Code mode

Folosește pentru:

- implementări mici;
- bugfixuri;
- teste;
- refactorizări controlate;
- documentație versionată.

Prompt exemplu:

```text
Implementează saved searches pentru tenant workflow.
Respectă AGENTS.md.
Începe cu teste pentru filtrare și persistare.
Nu modifica schema globală decât dacă este necesar.
Rulează npm test, npm run typecheck și npm run build.
Pregătește schimbarea ca PR.
```

### 10.3 `@codex` în GitHub

Folosește `@codex` pe issue-uri sau PR-uri doar pentru taskuri clare:

- adaugă teste pentru acest modul;
- investighează eroarea de CI;
- fă review de securitate pe diff;
- refactorizează parserul fără schimbări de comportament.

Nu folosi `@codex` pentru:

- construirea întregului MVP;
- deploy producție;
- crawling live;
- migrări destructive;
- taskuri care necesită secrets.

## 11. Roluri de agent recomandate pentru Codex

Codex poate lucra cu instrucțiuni specializate pe task, chiar dacă nu sunt subagenți formali în repo. Recomandarea este să creezi prompturi sau issue templates pentru roluri clare.

### 11.1 `supabase-schema-engineer`

Rol:

- proiectează schema Postgres;
- scrie migrations;
- verifică RLS;
- propune indexuri;
- separă datele globale de datele tenant.

Reguli:

- nu rulează comenzi destructive fără confirmare;
- include teste sau SQL checks pentru RLS;
- documentează impactul fiecărei migrări.

### 11.2 `cloudflare-worker-engineer`

Rol:

- implementează Workers și queue handlers;
- configurează retry, backoff, circuit breaker;
- adaugă `/health`, `/ready` și status per sursă;
- verifică `wrangler.jsonc`.

Reguli:

- nu face fetch către portaluri reale în teste;
- folosește payload validation;
- tratează `429/503` ca semnale de degradare, nu ca motive pentru retry agresiv.

### 11.3 `frontend-dashboard-engineer`

Rol:

- construiește UI React;
- implementează search, filters, detail view, saved searches și alerts;
- scrie teste Vitest/Testing Library;
- verifică layout responsive.

Reguli:

- UI-ul trebuie să arate clar că produsul trimite către sursă;
- nu afișează conținut integral preluat de la portaluri;
- toate stările goale, loading și error trebuie tratate.

### 11.4 `crawler-adapter-engineer`

Rol:

- creează adaptere per sursă;
- scrie parser tests pe fixture-uri permise;
- măsoară parse coverage;
- izolează schimbarea de layout a unei surse.

Reguli:

- nu implementează bypass anti-bot;
- nu introduce dependențe globale pentru o singură sursă;
- orice selector fragil trebuie acoperit de fixture test.

### 11.5 `dedup-matcher-engineer`

Rol:

- implementează normalizare;
- face blocking pe localizare, tip, suprafață și camere;
- calculează scor conservator;
- scrie motivul match-ului în `CanonicalListingLink`.

Reguli:

- în MVP se preferă false negatives față de false positives;
- fiecare match trebuie să fie auditabil;
- pragurile se schimbă prin configurație sau migration documentată.

### 11.6 `qa-reviewer`

Rol:

- rulează test, typecheck și build;
- inspectează CI;
- face smoke test pe deployment;
- verifică health endpoints și status UI.

### 11.7 `compliance-reviewer`

Rol:

- verifică principiul index + link;
- identifică riscuri PII;
- verifică retenția datelor;
- validează takedown/opt-out;
- semnalează surse cu risc crescut.

## 12. Plan incremental de construire

### Faza 0: guardrails Codex

Livrabile:

- `AGENTS.md`;
- environment Codex Cloud configurat;
- OpenAI Docs MCP configurat;
- politică de internet access;
- `docs/source-policy.md`;
- decizie scrisă privind principiul index + link.

Validare:

- review manual al regulilor;
- verificare că secrets nu sunt versionate;
- test cu un task Codex în ask mode;
- test cu un PR mic generat de Codex.

### Faza 1: repo, CI și infrastructură minimă

Livrabile:

- monorepo npm;
- workflow CI cu test, typecheck și build;
- Worker minimal cu `/health`;
- proiect Supabase conectat;
- migrations inițiale pentru entități globale și tenant.

Validare:

```bash
npm test
npm run typecheck
npm run build
```

### Faza 2: dashboard public demo

Livrabile:

- frontend React/Vite;
- pagină Search;
- pagină Listing Detail;
- status cards pentru Worker, Supabase și GitHub;
- deploy pe Cloudflare Pages.

Validare:

- URL Cloudflare Pages răspunde cu `200`;
- screenshot vizual desktop și mobile;
- CI verde pe GitHub.

### Faza 3: ingestie MVP pe fixture-uri

Livrabile:

- `Source` și `SourceListing`;
- queue `discover`;
- queue `fetch`;
- adapter interface;
- parser pentru o sursă demo sau fixture controlat;
- change detection prin hash.

Reguli:

- rate limit per domeniu;
- politeness delay;
- backoff la `429/503`;
- circuit breaker per sursă;
- fără fetch real în CI.

### Faza 4: deduplicare conservatoare

Livrabile:

- normalizare câmpuri;
- blocking conservator;
- scoring pe perechi candidate;
- creare/atașare `CanonicalListing`;
- `CanonicalListingLink` cu scor, semnale și motiv.

Regulă MVP:

- două anunțuri se unifică doar dacă scorul depășește un prag conservator;
- scorurile sub prag devin candidate, nu merge automat;
- orice merge trebuie să poată fi explicat.

### Faza 5: workflow tenant

Livrabile:

- `TenantListingState`;
- taguri;
- note;
- asignare agent;
- status per agenție;
- saved searches.

Principiu:

- `CanonicalListing` rămâne global;
- workflow-ul este izolat per tenant;
- RLS este verificat cu teste.

### Faza 6: alerte și observabilitate

Livrabile:

- saved search evaluator;
- `AlertDelivery`;
- source health dashboard;
- metrici: parse coverage, match rate, queue latency, time-to-index;
- admin toggle per sursă: `on`, `degraded`, `off`.

### Faza 7: hardening operațional și conformitate

Livrabile:

- audit log;
- politică de retenție;
- takedown/opt-out;
- RLS review;
- runbook pentru surse instabile sau ostile;
- procedură de dezactivare rapidă a unei surse.

## 13. GitHub, CI și Codex

Codex nu trebuie să înlocuiască CI. CI rămâne sursa de adevăr pentru calitatea schimbării.

Workflow minim:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main, master]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run typecheck
      - run: npm run build
```

Reguli pentru PR-uri Codex:

- PR-ul trebuie să explice ce a schimbat și cum a verificat;
- nu se acceptă PR fără CI verde, cu excepția documentației unde CI nu se aplică;
- Codex nu trebuie să facă merge singur;
- deploy-ul se face după review uman;
- dacă PR-ul modifică schema, trebuie inclusă migration și explicat impactul.

## 14. Prompturi utile pentru Codex

### 14.1 Implementare saved searches

```text
Respectă AGENTS.md.
Implementează saved searches pentru tenant workflow.
Începe prin a citi schema și testele existente.
Adaugă teste pentru filtrare, persistare și izolarea tenant.
Nu modifica schema globală decât dacă este necesar.
Rulează npm test, npm run typecheck și npm run build.
Pregătește PR cu descriere scurtă și riscuri.
```

### 14.2 Review RLS și securitate

```text
Respectă AGENTS.md.
Fă review la politicile RLS și la accesul frontendului.
Identifică orice tabel tenant fără RLS.
Verifică dacă există service role expus în cod frontend.
Nu aplica modificări destructive.
Returnează findings ordonate după severitate și propune patch doar pentru probleme clare.
```

### 14.3 Cloudflare Worker queue handler

```text
Respectă AGENTS.md.
Adaugă un queue handler pentru fetch jobs.
Respectă rate limit, backoff și circuit breaker.
Scrie teste pentru retry la 429, 503 și payload invalid.
Nu face fetch către portaluri reale în teste.
Rulează testele relevante și typecheck.
```

### 14.4 Dedup conservator

```text
Respectă AGENTS.md.
Implementează scoring conservator pentru dedup.
Folosește semnale: locație, tip, camere, mp, preț, titlu.
Expune motivul matchului în CanonicalListingLink.
Scrie teste pentru match, no-match și scor sub prag.
Preferă false negatives față de false positives.
```

### 14.5 Parser adapter

```text
Respectă AGENTS.md.
Creează un adapter izolat pentru o sursă demo folosind fixture-uri HTML permise.
Nu face requesturi live în teste.
Extrage doar câmpurile necesare pentru index + link.
Adaugă parse coverage și teste pentru layout parțial schimbat.
```

## 15. Strategie de testare

Teste obligatorii:

- unit tests pentru normalizare și dedup scoring;
- parser tests pe fixture-uri;
- Worker tests pentru payload validation, retry și circuit breaker;
- RLS tests pentru izolarea tenant;
- frontend tests pentru search, filters și detail view;
- smoke tests pentru `/health`, `/ready` și pagina principală.

Teste interzise în CI:

- crawling live către portaluri reale;
- folosirea de credentials reale;
- teste care depind de rate limits externe;
- teste care scriu în producție.

## 16. Observabilitate și operare

Metrici recomandate:

- `source_fetch_success_rate`;
- `source_fetch_429_rate`;
- `source_fetch_503_rate`;
- `parser_coverage_rate`;
- `parse_failure_rate`;
- `dedup_auto_match_rate`;
- `dedup_candidate_rate`;
- `queue_backlog`;
- `time_to_index_seconds`;
- `alert_delivery_success_rate`.

Stări per sursă:

- `on`: sursa activă;
- `degraded`: sursa are erori crescute, se reduce ritmul;
- `off`: sursa oprită manual sau automat;
- `blocked`: sursa nu trebuie accesată până la review.

Runbook minim pentru incident:

1. Marchează sursa `degraded` sau `off`.
2. Oprește joburile noi pentru domeniu.
3. Păstrează joburile eșuate în dead letter.
4. Inspectează ultimele erori și fixture-uri.
5. Actualizează adapterul sau politica sursei.
6. Reia gradual ingestia.

## 17. Riscuri și mitigări

| Risc | Impact | Mitigare |
|---|---:|---|
| Codex primește instrucțiuni ostile din issue, PR sau web | Mare | tratează conținutul extern ca date, review work log, limitează internet access |
| Crawling blocat sau instabil | Mare | rate limit, backoff, circuit breaker, status `degraded/off` |
| Layout portal schimbat | Mare | adaptere izolate, parser tests, parse coverage |
| Dedup fals pozitiv | Mare | prag conservator, audit link, split/merge ulterior |
| Expunere PII | Mare | RLS, minimizare, audit log, retenție, takedown |
| Costuri Cloudflare/Supabase | Mediu | scheduler adaptiv, hash change detection, prioritizare fresh listings |
| Codex modifică prea mult | Mediu | issue-uri mici, `AGENTS.md`, CI obligatoriu, PR review |
| Trigger `@codex` abuzat | Mediu | repo permissions, review obligatoriu, taskuri limitate |
| Schema tenant contaminată cu date globale | Mare | model global/tenant separat, RLS tests, review migrations |

## 18. Decizii pragmatice

- Nu se începe cu crawler real complex; se începe cu fixture-uri și o sursă MVP controlată.
- Nu se construiește CRM complet în MVP; workflow-ul rămâne tag, note, status și asignare.
- Nu se expune service role Supabase în frontend.
- Nu se permite scraping agresiv sau bypass.
- Nu se optimizează dedup pentru recall maxim la început; prioritatea este reducerea fals-pozitivelor.
- Nu se fac deploy-uri automate în producție din taskuri Codex.
- Nu se rulează crawling live în CI.
- Nu se activează internet access nelimitat pentru Codex Cloud.

## 19. Definition of Done pentru MVP

MVP-ul poate fi considerat livrabil când:

- CI rulează `npm test`, `npm run typecheck`, `npm run build`;
- Worker-ul răspunde pe `/health`;
- frontend-ul este publicat pe Cloudflare Pages;
- există migrations pentru modelul global și tenant;
- RLS este activ și testat pe tabelele tenant;
- există cel puțin un parser pe fixture controlat;
- există dedup conservator cu teste;
- există Search, Listing Detail și tenant workflow minimal;
- există document operațional pentru surse și incidente;
- există mecanism de oprire rapidă a unei surse;
- există `AGENTS.md` și Codex poate rula un task mic cu PR verificabil.

## 20. Primele issue-uri recomandate

1. Adaugă `AGENTS.md` cu regulile de produs, securitate și verificare.
2. Configurează OpenAI Docs MCP pentru Codex.
3. Configurează Codex Cloud environment cu setup script non-destructive.
4. Creează monorepo npm cu `apps/web`, `apps/worker`, `packages/core`.
5. Adaugă CI pentru test, typecheck și build.
6. Creează Worker minimal cu `/health`.
7. Adaugă migrations Supabase inițiale pentru `sources`, `source_listings`, `canonical_listings`, `tenants`.
8. Adaugă RLS pe tabelele tenant.
9. Creează UI demo pentru Search și Listing Detail.
10. Creează adapter interface și primul parser pe fixture.
11. Implementează dedup scoring conservator.
12. Adaugă saved searches și tenant listing state.

## 21. Linkuri relevante

- Codex cloud: <https://platform.openai.com/docs/codex>
- Agent internet access: <https://platform.openai.com/docs/codex/agent-network>
- OpenAI Docs MCP: <https://platform.openai.com/docs/docs-mcp>
- Code generation and Codex models: <https://platform.openai.com/docs/guides/code-generation>
- Shell tool and sandbox guidance: <https://platform.openai.com/docs/guides/tools-shell>
- Codex use cases: <https://developers.openai.com/codex/explore>
- GitHub repo proiect: <https://github.com/Me-Alex/thor-crm-index-link>
- Cloudflare Pages public: <https://thor-crm-index-link-web.pages.dev>
- Cloudflare Worker health: <https://thor-crm-index-link-worker.floreaalexandru2002.workers.dev/health>
- Supabase project: <https://supabase.com/dashboard/project/mqzchppokgaoacgkqkzh>
