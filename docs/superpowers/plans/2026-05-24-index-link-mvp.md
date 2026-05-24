# Index + Link MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the backend foundation for a Romanian real-estate index + link CRM MVP.

**Architecture:** Cloudflare Worker handles scheduled and queued ingestion. Supabase stores global canonical listings and tenant workflow state with RLS. GitHub Actions verifies tests and typecheck.

**Tech Stack:** TypeScript, Cloudflare Workers, Cloudflare Queues, Supabase Postgres/Auth/RLS, Vitest, GitHub Actions.

---

### Task 1: Worker Test Harness

**Files:**
- Create: `package.json`
- Create: `apps/worker/package.json`
- Create: `apps/worker/test/normalization.test.ts`
- Create: `apps/worker/test/matcher.test.ts`
- Create: `apps/worker/test/router.test.ts`

- [ ] Write failing Vitest tests for normalization, conservative matching, and `/health`.
- [ ] Run `npm.cmd run test --workspace @thor-crm/worker` and confirm missing implementation failures.

### Task 2: Worker Core

**Files:**
- Create: `apps/worker/src/ingest/types.ts`
- Create: `apps/worker/src/ingest/normalization.ts`
- Create: `apps/worker/src/ingest/matcher.ts`
- Create: `apps/worker/src/http/router.ts`
- Create: `apps/worker/src/index.ts`
- Create: `apps/worker/wrangler.jsonc`

- [ ] Implement pure normalization with RO text parsing and deterministic fingerprints.
- [ ] Implement matching blocks, weighted score, reasons, and threshold.
- [ ] Implement Worker fetch, scheduled, and queue entrypoints.
- [ ] Run `npm.cmd run test --workspace @thor-crm/worker`.

### Task 3: Supabase Schema

**Files:**
- Create: `supabase/migrations/20260524201322_initial_index_link_schema.sql`
- Create: `supabase/seed.sql`

- [ ] Create global tables for sources, source listings, canonical listings, links, history, and health.
- [ ] Create tenant tables for org members, states, tags, notes, saved searches, alerts, deliveries, and audit events.
- [ ] Enable RLS on every exposed table and grant authenticated access through explicit policies.

### Task 4: Operations

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `README.md`
- Create: `docs/architecture.md`
- Create: `docs/operations.md`

- [ ] Add GitHub Actions for tests and typecheck.
- [ ] Document Supabase, Cloudflare, and GitHub provisioning commands.
