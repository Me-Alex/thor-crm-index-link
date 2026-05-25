# Tenant workflow + alerts next slice

Date: 2026-05-25

## Scope implemented

This slice adds saved search matching, in-app alert planning, and Worker-side persistence into `alert_deliveries`. It does not add auth UI, real email/webhook delivery, or external crawler behavior.

Ownership stayed inside:

- `apps/worker/src/workflow/*`
- `apps/worker/src/queue/fetchPipeline.ts`
- `apps/worker/test/workflowAlerts.test.ts`
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

## Next integration step

[@github](plugin://github@openai-curated) Task: expose tenant workflow and alert history through authenticated API/UI.

Constraints:

- Follow `AGENTS.md`.
- Do not edit `apps/web`.
- Do not send email or webhooks.
- Keep Supabase repository code behind Worker/server boundaries.
- Keep service role usage out of frontend code.

Suggested behavior:

1. Add authenticated tenant API endpoints for listing state, tags, notes, saved searches, and alert history.
2. Wire the frontend to those endpoints behind Supabase Auth.
3. Keep public demo fallback for unauthenticated users.
4. Add tests with fake repositories; no real Supabase calls in tests.

## Verification target

Required before PR:

```powershell
npm.cmd run test --workspace @thor-crm/worker -- workflowAlerts.test.ts
npm.cmd run typecheck --workspace @thor-crm/worker
npm.cmd run build
```
