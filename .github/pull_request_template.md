## Summary

- 

## Risk level

- [ ] Low: docs/tests only or isolated behavior
- [ ] Medium: app logic, Worker behavior, or migrations
- [ ] High: auth, RLS, crawling, deploy, secrets, or destructive operations

## Guardrails checked

- [ ] Follows `AGENTS.md`
- [ ] No secrets exposed
- [ ] No CAPTCHA/paywall/login/bot-blocking bypass
- [ ] No live crawling in tests or CI
- [ ] No full content re-hosting

## Verification

- [ ] `npm test`
- [ ] `npm run typecheck`
- [ ] `npm run build`

## Data/schema impact

- [ ] No schema change
- [ ] Migration included and impact explained

## Deploy notes

- 
