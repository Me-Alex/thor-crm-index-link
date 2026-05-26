# Commercial readiness foundation plan

Data: 2026-05-26

## Scope

Acest slice muta Thor din demo tehnic catre pilot vandabil controlat. Nu promite vanzare self-service completa si nu inlocuieste review juridic.

## Implementare

1. Supabase
   - Adauga `organization_profiles`, `organization_billing`, `compliance_requests` si `operational_audit_events`.
   - Activeaza RLS pentru tabelele noi.
   - Permite citire pentru membri si management pentru admini unde este cazul.

2. Worker
   - Expune planurile comerciale si readiness gates.
   - Adauga onboarding workspace cu Supabase Auth user token.
   - Adauga billing status si Stripe Checkout pentru planuri platite.
   - Adauga endpoint pentru takedown/GDPR request.
   - Adauga crawler governance pentru degradare automata pe erori.

3. Web
   - Afiseaza panou de vanzare si operare in shell-ul radar.
   - Conecteaza onboarding, planuri, checkout si compliance request.
   - Pastreaza fallback demo cand Worker URL sau loginul lipseste.

4. Legal si operare
   - Adauga pagini statice pentru Terms, Privacy, DPA, SLA si Takedown.
   - Documenteaza limitele ramase pentru productie.

## Verificare

- `npm test`
- `npm run typecheck`
- `npm run build`

## Limite explicite

- Stripe webhook nu este inclus in acest slice.
- Email real si notificari externe nu sunt incluse in acest slice.
- Legal pack-ul este sablon operational, nu consultanta juridica.
- Portalurile reale raman operate gradual prin registry, health si auto-degradare.
