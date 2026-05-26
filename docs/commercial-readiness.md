# Thor CRM commercial readiness

Data: 2026-05-26

## Verdict

Thor este pregatit pentru pilot platit controlat, nu pentru vanzare self-service larga fara review juridic si fara configurarea finala a billingului.

## Implementat in acest slice

- Onboarding workspace prin Worker: `POST /api/onboarding/workspace`.
- Planuri comerciale publice: `GET /api/billing/plans`.
- Billing status per organizatie: `GET /api/orgs/:orgId/billing`.
- Stripe Checkout pentru planurile `pro` si `scale`: `POST /api/orgs/:orgId/billing/checkout`.
- Cereri takedown/GDPR: `POST /api/compliance/requests`.
- Auto-degradare crawler pe `429`, `502`, `503`, `403`, robots disallow, parse failures si URLs invalide.
- Pachet legal static pentru pilot: Terms, Privacy, DPA, SLA si Takedown.

## Configurare necesara in productie

Cloudflare Worker secrets:

```bash
npx wrangler secret put STRIPE_SECRET_KEY --config apps/worker/wrangler.jsonc
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config apps/worker/wrangler.jsonc
npx wrangler secret put ADMIN_API_KEY --config apps/worker/wrangler.jsonc
```

Cloudflare Worker vars:

- `PUBLIC_APP_URL`
- `STRIPE_PRO_PRICE_ID`
- `STRIPE_SCALE_PRICE_ID`

Supabase:

- ruleaza migration `20260526114500_commercial_readiness_foundation.sql`;
- verifica RLS pentru `organization_profiles`, `organization_billing`, `compliance_requests`, `operational_audit_events`;
- creeaza primul user admin prin Supabase Auth;
- ruleaza onboarding din UI pentru workspace-ul agentiei.

## Limite ramase

- Stripe webhook pentru reconcilierea automata a `subscription_status` nu este inca implementat.
- Email real pentru alerte si compliance nu este inca conectat.
- SLA-ul este documentat pentru pilot si trebuie semnat contractual.
- Legal pack-ul este sablon operational si necesita review juridic.
- "Toate portalurile" inseamna registry activat gradual; sursele pot intra in `degraded` sau `off`.

## Referinte folosite pentru acest slice

- European Commission, controller/processor: https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/obligations/controllerprocessor/what-data-controller-or-data-processor_en
- European Commission, procesare de catre imputernicit: https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/obligations/controllerprocessor/can-someone-else-process-data-my-organisations-behalf_en
- European Commission, drepturile persoanelor vizate: https://commission.europa.eu/law/law-topic/data-protection/reform/rights-citizens/my-rights/can-i-ask-company-delete-my-personal-data_es
- Stripe Checkout Sessions: https://docs.stripe.com/payments/checkout-sessions
- Stripe subscriptions cu Checkout: https://docs.stripe.com/payments/subscriptions

## Prag de vanzare

Pentru primii clienti, vinde ca pilot platit cu urmatoarea formulare:

> Thor CRM este un radar imobiliar Index + Link pentru agentii, cu surse activate gradual, workflow per agentie si monitorizare de calitate. In pilot, masuram prospetimea si deduplicarea, iar sursele instabile sunt degradate sau oprite automat.
