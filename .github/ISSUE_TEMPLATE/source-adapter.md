---
name: Source adapter
about: Add or update a source adapter without live crawling in CI
title: "[source-adapter] "
labels: source-adapter, compliance-review
assignees: ""
---

## Source

- Name:
- Domain:
- Intended status: `on`, `degraded`, `off`, or `blocked`

## Policy check

- [ ] Source terms reviewed outside this issue
- [ ] No CAPTCHA/paywall/login/bot-blocking bypass
- [ ] No full content re-hosting
- [ ] Fixture data is permitted and minimized

## Parser scope

- Required fields:
- Optional fields:
- Explicitly excluded fields:

## Operational limits

- Max concurrency:
- Politeness delay:
- Backoff behavior:
- Circuit breaker condition:

## Verification

- [ ] Parser fixture tests
- [ ] Worker queue tests if queue behavior changed
- [ ] `npm test`
- [ ] `npm run typecheck`
- [ ] `npm run build`
