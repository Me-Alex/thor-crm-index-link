# Tenant workflow + alerts next slice

Date: 2026-05-25

## Scope implemented

This slice adds isolated, pure workflow functions for saved search matching and in-app alert delivery planning. It does not add auth UI, real email/webhook delivery, crawler behavior, or database writes.

Ownership stayed inside:

- `apps/worker/src/workflow/*`
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
- Returns delivery candidates only; it does not persist or send notifications.

## Next integration step

[@github](plugin://github@openai-curated) Task: connect the pure workflow functions to a Worker-side repository layer.

Constraints:

- Follow `AGENTS.md`.
- Do not edit `apps/web`.
- Do not send email or webhooks.
- Add Supabase repository code only behind Worker/server boundaries.
- Keep service role usage out of frontend code.

Suggested behavior:

1. Read changed canonical listing IDs from the matcher/indexing path.
2. Load tenant saved searches from Supabase.
3. Load existing alert deliveries for the same tenant/search/listing keys.
4. Call `planAlertDeliveries`.
5. Insert returned candidates into `alert_deliveries` as pending/in-app records.
6. Add tests with fake repositories; no real Supabase calls in tests.

## Verification target

Required before PR:

```powershell
npm.cmd run test --workspace @thor-crm/worker -- workflowAlerts.test.ts
npm.cmd run typecheck --workspace @thor-crm/worker
npm.cmd run build
```
