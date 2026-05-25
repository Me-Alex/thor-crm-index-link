# Tenant workflow + alerts next slice

Date: 2026-05-25

## Scope implemented

This slice adds saved search matching, in-app alert planning, Worker-side persistence into `alert_deliveries`, authenticated tenant workflow endpoints, and a guarded frontend workflow surface. It does not add real email/webhook delivery, full Supabase Auth UI, or external crawler behavior.

Ownership stayed inside:

- `apps/worker/src/workflow/*`
- `apps/worker/src/queue/fetchPipeline.ts`
- `apps/worker/src/api/tenantWorkflow.ts`
- `apps/web/src/lib/tenantWorkflowApi.ts`
- `apps/worker/test/workflowAlerts.test.ts`
- `apps/worker/test/tenantWorkflowApi.test.ts`
- `apps/web/test/tenantWorkflowApi.test.ts`
- `docs/workflow-next-slice.md`

## API contract

### `evaluateSavedSearchCriteria(listing, criteria)`

Inputs:

- `WorkflowListing`: normalized canonical listing projection with stable search fields.
- `SavedSearchCriteria`: optional filters for location, property type, transaction type, price, area, rooms, and keywords.

Behavior:

- Empty criteria sections are ignored.
- Supplied string filters are normalized with the existing search-text normalizer.
- Numeric ranges are inclusive.
- All supplied criteria must match.
- Returns `{ matches, reasons }` for auditability.

### `planAlertDeliveries(input)`

Inputs:

- `tenantId`: tenant being evaluated.
- `changedListings`: canonical listings that changed or were newly indexed.
- `savedSearches`: saved searches from any tenant.
- `existingDeliveries`: previously emitted alerts.
- `evaluatedAt`: deterministic timestamp supplied by the caller.

Behavior:

- Evaluates only searches owned by `tenantId`.
- Ignores searches with `alertsEnabled: false`.
- Emits only in-app delivery candidates.
- Deduplicates by `tenantId:savedSearchId:canonicalListingId`.
- Returns delivery candidates only; persistence is handled by the Worker-side repository.

### `planAndPersistAlertDeliveriesForListing(env, canonicalListingId, evaluatedAt, options)`

Behavior:

- Loads the canonical listing projection from Supabase REST.
- Loads enabled `in_app` alerts and their saved searches.
- Skips existing deliveries for the same tenant/search/listing.
- Inserts pending `alert_deliveries` with matched reasons in payload.

### Authenticated tenant workflow endpoints

Endpoints:

- `GET /api/orgs/:orgId/listings/:canonicalListingId/workflow`
- `PATCH /api/orgs/:orgId/listings/:canonicalListingId/state`
- `POST /api/orgs/:orgId/listings/:canonicalListingId/notes`
- `GET /api/orgs/:orgId/alerts`

Behavior:

- Require `Authorization: Bearer <Supabase user access token>`.
- Validate the user through Supabase Auth and then verify `organization_members` before any tenant read/write.
- Use `SUPABASE_SERVICE_ROLE_KEY` only inside the Worker.
- Return CORS headers for authenticated API calls without exposing admin ingest routes.
- Keep unauthenticated frontend users on demo fallback.

## Next integration step

[@github](plugin://github@openai-curated) Task: add full Supabase Auth UI and saved-search management UI.

Constraints:

- Follow `AGENTS.md`.
- Do not send email or webhooks.
- Keep Supabase repository code behind Worker/server boundaries.
- Keep service role usage out of frontend code.

Suggested behavior:

1. Add login/session handling with Supabase user tokens.
2. Expose saved-search CRUD behind `/api/orgs/:orgId/saved-searches`.
3. Replace the temporary `sessionStorage` token bridge with a real auth session provider.
4. Add tests with fake repositories; no real Supabase calls in tests.

## Verification target

Required before PR:

```powershell
npm.cmd run test --workspace @thor-crm/worker -- workflowAlerts.test.ts
npm.cmd run test --workspace @thor-crm/worker -- tenantWorkflowApi.test.ts
npm.cmd run test --workspace @thor-crm/web -- tenantWorkflowApi.test.ts App.test.tsx
npm.cmd run typecheck --workspace @thor-crm/worker
npm.cmd run build
```
