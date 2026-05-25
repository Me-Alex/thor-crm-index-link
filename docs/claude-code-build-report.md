# Raport: construirea Thor CRM Index + Link cu Claude Code

Data: 2026-05-25

## 1. Scop

Acest document descrie cum poate fi construită aplicația Thor CRM Index + Link cu Claude Code, păstrând aceleași obiective tehnice:

- agregare și indexare de anunțuri imobiliare;
- deduplicare într-un `CanonicalListing` global;
- workflow multi-tenant pentru agenții imobiliare;
- afișare de tip index + link, fără re-hosting integral al conținutului portalurilor;
- publicare cu GitHub, Cloudflare și Supabase.

## 2. Concluzie executivă

Claude Code este potrivit pentru acest proiect dacă este folosit ca agent de dezvoltare controlat prin repo, CI și reguli explicite. Nu ar trebui folosit ca executor liber care modifică sistemul fără verificări. Structura recomandată este:

- `GitHub` pentru repo, branch-uri, PR-uri, review și CI;
- `Cloudflare Pages` pentru frontend public;
- `Cloudflare Workers` pentru API, health endpoints, ingestie și job orchestration;
- `Cloudflare Queues` pentru pipeline asincron de crawl, fetch, parse și match;
- `Supabase Postgres` pentru schema globală, tenant workflow, RLS și audit;
- `Claude Code` pentru implementare incrementală, subagenți specializați, code review și automatizări pe issue/PR.

## 3. Setup inițial Claude Code

### 3.1 Instalare locală

Prerechizite:

- Node.js 18 sau mai nou;
- cont Claude.ai sau Anthropic Console;
- acces la repo GitHub;
- CLI-uri autentificate pentru GitHub, Cloudflare și Supabase, unde este cazul.

Comenzi de bază:

```bash
npm install -g @anthropic-ai/claude-code
cd "C:\Users\flore\Documents\Thor CRM"
claude
```

### 3.2 Fișier `CLAUDE.md`

În rădăcina repo-ului ar trebui adăugat un `CLAUDE.md` cu reguli clare pentru proiect:

- produsul afișează index + link, nu conținut re-hostat integral;
- nu se implementează bypass pentru CAPTCHA, paywall, login obligatoriu sau blocaje tehnice explicite;
- toate sursele externe trebuie izolate în adaptere;
- orice schimbare de schemă Supabase trebuie făcută prin migration;
- orice funcționalitate nouă trebuie să aibă teste relevante;
- înainte de publicare se rulează `npm test`, `npm run typecheck`, `npm run build`;
- secrets nu se citesc și nu se includ în commit.

### 3.3 Setări de securitate

În `.claude/settings.json` se recomandă reguli de permisiuni care blochează accesul la fișiere sensibile:

```json
{
  "permissions": {
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
      "Read(./config/credentials.json)"
    ],
    "ask": [
      "Bash(git push:*)",
      "Bash(npx wrangler deploy:*)",
      "Bash(npx wrangler pages deploy:*)",
      "Bash(supabase db push:*)"
    ]
  }
}
```

## 4. Integrare MCP și tool-uri externe

Claude Code poate fi extins prin MCP pentru a lucra cu tool-uri externe. Pentru acest proiect, configurația ideală include:

- GitHub MCP pentru repo, issue-uri, PR-uri și review;
- Supabase MCP pentru proiecte, SQL controlat și verificări de schemă;
- Cloudflare MCP sau CLI pentru Workers, Pages, Queues și deployments;
- opțional: Sentry/observability MCP pentru erori și metrici operaționale.

Fișierul `.mcp.json` poate fi partajat în repo dacă nu conține secrete. Tokenurile și cheile trebuie livrate prin environment variables.

## 5. Structura recomandată a repo-ului

```text
apps/
  web/
    src/
    test/
  worker/
    src/
    test/
supabase/
  migrations/
  seed.sql
docs/
  architecture.md
  operations.md
  claude-code-build-report.md
.github/
  workflows/
    ci.yml
.claude/
  agents/
  settings.json
CLAUDE.md
package.json
```

Responsabilități:

- `apps/web`: dashboard React/Vite publicat pe Cloudflare Pages;
- `apps/worker`: Worker API, health, ingestie și queue handlers;
- `supabase/migrations`: schema Postgres și politici RLS;
- `docs`: arhitectură, operațiuni, rapoarte și decizii tehnice;
- `.claude/agents`: subagenți Claude Code specializați;
- `.github/workflows`: CI și automatizări.

## 6. Subagenți Claude Code recomandați

### 6.1 `supabase-schema-engineer`

Rol:

- proiectează schema Postgres;
- scrie migrații;
- verifică RLS;
- propune indexuri;
- validează separarea global vs tenant.

Tool-uri permise:

- read/edit files;
- bash pentru `npm test`, `npm run typecheck`;
- Supabase MCP/CLI cu confirmare pentru operații destructive.

### 6.2 `cloudflare-worker-engineer`

Rol:

- implementează Workers;
- configurează Queues;
- adaugă health endpoints;
- implementează retry, backoff și circuit breaker;
- verifică `wrangler.jsonc`.

### 6.3 `frontend-dashboard-engineer`

Rol:

- construiește UI React;
- implementează search, filters, detail view, saved searches și alerts;
- scrie teste Vitest/Testing Library;
- verifică responsive layout.

### 6.4 `crawler-adapter-engineer`

Rol:

- creează adaptere izolate per sursă;
- scrie parser tests pe fixture-uri HTML permise;
- măsoară parse coverage;
- nu implementează bypass anti-bot.

### 6.5 `dedup-matcher-engineer`

Rol:

- implementează normalizare;
- blocking pe locație/tip/mp/camere;
- scoring conservator;
- audit prin `CanonicalListingLink`.

### 6.6 `qa-reviewer`

Rol:

- rulează teste;
- verifică build;
- inspectează CI;
- face smoke test pe deployment.

### 6.7 `compliance-reviewer`

Rol:

- verifică retenția datelor;
- identifică riscuri PII;
- validează mecanismul de takedown/opt-out;
- verifică respectarea principiului index + link.

## 7. Plan de construire incrementală

### Faza 1: fundație repo și infrastructură

Livrabile:

- repo GitHub inițial;
- monorepo npm;
- CI cu test, typecheck și build;
- Worker minimal cu `/health`;
- proiect Supabase conectat;
- migrații inițiale pentru entitățile globale și tenant.

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

- `200 OK` pe URL-ul Cloudflare Pages;
- screenshot vizual;
- CI verde pe GitHub.

### Faza 3: ingestie MVP

Livrabile:

- `Source` și `SourceListing`;
- queue `discover`;
- queue `fetch`;
- adapter interface;
- parser pentru o sursă demo sau fixture controlat;
- change detection prin hash.

Principii:

- rate limit per domeniu;
- politeness delay;
- backoff la `429/503`;
- circuit breaker per sursă.

### Faza 4: deduplicare

Livrabile:

- normalizare câmpuri;
- blocking conservator;
- scoring pe perechi candidate;
- creare/atașare `CanonicalListing`;
- `CanonicalListingLink` cu scor și motiv.

Regulă MVP:

- se preferă false negatives în loc de false positives;
- două anunțuri se unifică doar dacă scorul trece un prag conservator.

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
- orice acțiune de workflow este izolată per tenant.

### Faza 6: alerte și observabilitate

Livrabile:

- saved search evaluator;
- `AlertDelivery`;
- Source Health;
- metrici parse coverage, match rate, time-to-index;
- admin toggle per sursă: `on`, `degraded`, `off`.

### Faza 7: hardening operațional și conformitate

Livrabile:

- audit log;
- retenție date;
- mecanism takedown/opt-out;
- politici RLS revizuite;
- document operațional pentru surse ostile sau instabile.

## 8. GitHub Actions cu Claude Code

Claude Code poate fi integrat în GitHub Actions astfel încât un comentariu `@claude` pe issue sau PR să declanșeze implementări controlate.

Utilizare recomandată:

- issue-uri mici și bine definite;
- PR review automat;
- fixuri de test/lint;
- generare de documentație;
- investigare CI eșuat.

Nu se recomandă:

- deploy automat în producție fără review;
- rularea taskurilor de crawling real în CI;
- acces direct la secrets fără permisiuni stricte.

Workflow minim:

```yaml
name: Claude

on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]

jobs:
  claude:
    if: contains(github.event.comment.body, '@claude')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: "Follow CLAUDE.md. Make minimal, tested changes."
          claude_args: "--max-turns 8"
```

## 9. Prompturi utile pentru Claude Code

### 9.1 Implementare componentă

```text
Implementează saved searches pentru tenant workflow.
Respectă CLAUDE.md.
Începe cu teste pentru filtrare și persistare.
Nu modifica schema globală decât dacă este necesar.
Rulează npm test, npm run typecheck și npm run build.
```

### 9.2 Review de securitate

```text
Fă review la politicile RLS și la accesul frontendului.
Identifică orice tabel public fără RLS.
Nu aplica modificări destructive fără să explici întâi riscul și soluția.
```

### 9.3 Cloudflare Worker

```text
Adaugă un queue handler pentru fetch job.
Respectă rate limit, backoff și circuit breaker.
Scrie teste pentru retry la 429 și pentru payload invalid.
Nu face fetch către portaluri reale în teste.
```

### 9.4 Dedup

```text
Implementează scoring conservator pentru dedup.
Folosește semnale: locație, tip, camere, mp, preț, titlu.
Expune motivul matchului în CanonicalListingLink.
Scrie teste pentru cazuri match, no-match și scor sub prag.
```

## 10. Riscuri și mitigări

| Risc | Impact | Mitigare |
|---|---:|---|
| Crawling blocat sau instabil | mare | rate limit, backoff, circuit breaker, sursă `degraded/off` |
| Layout portal schimbat | mare | adaptere izolate, parser tests, parse coverage |
| Dedup fals pozitiv | mare | prag conservator, audit link, split/merge în faza 2 |
| Expunere PII | mare | RLS, audit log, retenție, takedown |
| Costuri Cloudflare/Supabase | mediu | scheduler adaptiv, change detection, prioritizare fresh listings |
| Agent AI modifică prea mult | mediu | taskuri mici, `CLAUDE.md`, CI obligatoriu, PR review |

## 11. Decizii pragmatice

- Nu se începe cu crawler real complex; se începe cu fixture-uri și o sursă MVP.
- Nu se construiește CRM complet în MVP; workflow-ul rămâne tag/note/status/asignare.
- Nu se expune service role Supabase în frontend.
- Nu se permite scraping agresiv sau bypass.
- Nu se optimizează dedup pentru recall maxim la început; prioritatea este reducerea fals-pozitivelor.

## 12. Linkuri relevante

- Claude Code overview: <https://docs.anthropic.com/en/docs/claude-code/overview>
- Claude Code MCP: <https://docs.anthropic.com/en/docs/claude-code/mcp>
- Claude Code GitHub Actions: <https://docs.anthropic.com/en/docs/claude-code/github-actions>
- Claude Code settings: <https://docs.anthropic.com/en/docs/claude-code/settings>
- Claude Code subagents: <https://docs.anthropic.com/en/docs/claude-code/sub-agents>
- GitHub repo proiect: <https://github.com/Me-Alex/thor-crm-index-link>
- Cloudflare Pages public: <https://thor-crm-index-link-web.pages.dev>
- Cloudflare Worker health: <https://thor-crm-index-link-worker.floreaalexandru2002.workers.dev/health>
- Supabase project: <https://supabase.com/dashboard/project/mqzchppokgaoacgkqkzh>
