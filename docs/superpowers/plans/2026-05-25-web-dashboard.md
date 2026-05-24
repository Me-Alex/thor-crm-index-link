# Web Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a public web dashboard demo for Thor CRM Index + Link.

**Architecture:** Add `apps/web` as a React + Vite workspace. Keep browser data demo-safe while calling the deployed Worker health endpoint. Deploy the built static app to Cloudflare Pages and push the code to GitHub.

**Tech Stack:** React, Vite, TypeScript, Vitest, Testing Library, Cloudflare Pages, GitHub Actions.

---

### Task 1: Web Test Harness

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/test/filterListings.test.ts`
- Create: `apps/web/test/App.test.tsx`

- [ ] Write failing tests for listing filtering and core dashboard rendering.
- [ ] Run `npm.cmd run test --workspace @thor-crm/web` and confirm failures from missing modules.

### Task 2: Data and Components

**Files:**
- Create: `apps/web/src/data/demoData.ts`
- Create: `apps/web/src/lib/filterListings.ts`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/styles.css`

- [ ] Implement typed demo data for listings, sources, saved searches, alerts and health metrics.
- [ ] Implement pure filters for city, type, transaction and price.
- [ ] Implement dashboard sections and responsive layout.
- [ ] Run web tests and typecheck.

### Task 3: Build and Deploy

**Files:**
- Create: `apps/web/index.html`
- Create: `apps/web/tsconfig.json`
- Modify: `.github/workflows/ci.yml`
- Modify: `README.md`

- [ ] Build with `npm.cmd run build --workspace @thor-crm/web`.
- [ ] Deploy `apps/web/dist` to Cloudflare Pages project `thor-crm-index-link-web`.
- [ ] Verify the live Pages URL and Worker health link.
- [ ] Commit and push to GitHub.
