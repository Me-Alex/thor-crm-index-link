# Source Policy

Data: 2026-05-25

## Scope

Thor CRM Index + Link indexes public real-estate listing signals and links users back to the original source. It must not become a full mirror of source portals.

## Allowed behavior

- Store normalized listing fields needed for search, deduplication, workflow, and alerts.
- Store source URLs and source identifiers.
- Store derived metadata such as price changes, availability signals, parse coverage, and match scores.
- Use fixture HTML in tests when the fixture is permitted and does not include sensitive data.
- Reduce or stop crawling when a source becomes unstable, hostile, blocked, or legally unclear.

## Disallowed behavior

- Do not re-host full portal descriptions, full image galleries, or proprietary page content.
- Do not bypass CAPTCHA, paywalls, login requirements, bot blocks, robots restrictions, or explicit technical access controls.
- Do not run live crawling in CI.
- Do not store credentials for source portals in the repository.
- Do not collect personal data unless it is necessary, lawful, documented, and covered by retention and takedown procedures.

## Source lifecycle

Every source should have one of these statuses:

- `on`: active source, normal rate limits.
- `degraded`: elevated errors or quality loss; lower crawl rate and monitor closely.
- `off`: source disabled manually or automatically.
- `blocked`: source must not be accessed until policy and legal review are complete.

## Adapter requirements

Every source adapter should:

- own its selectors and parsing rules;
- expose parser coverage metrics;
- fail closed when required fields are missing;
- have fixture-based parser tests;
- emit structured parse errors;
- avoid global changes that only serve one source.

## Crawling requirements

The crawler must use:

- per-domain concurrency limits;
- politeness delay and jitter;
- exponential backoff for `429` and `503`;
- circuit breaker per source;
- dead-letter handling for repeated failures;
- a fast source disable path.

## Crawler MVP implemented

The current crawler implementation supports a controlled source registry for Romanian real-estate portals:

- `imobiliare`, `storia`, `olx`, `publi24`, `romimo`, `homezz`, `anuntul`, `lajumate`.
- `imobiliare` is the only source enabled for initial live crawl; the other real portal sources stay `mode = off`, `allowLiveCrawl = false`, and `reviewStatus = pending_review`.
- Discovery checks source status before network access and skips inactive sources without fetching.
- Active reviewed sources must pass `robots.txt` policy before fetching a sitemap or listing seed URL.
- Sitemap discovery only keeps same-origin HTTP(S) URLs and caps the number of discovered links.
- Generic JSON-LD parsing extracts only normalized index fields: title, description excerpt, price, area, rooms, location, property type, transaction type, and source URL.
- Tests use local fixtures and mocked fetch calls; CI must not crawl real portal pages.

Turning any additional real portal `on` requires policy/legal review, adapter validation on fixtures, and an explicit production change. Do not activate all sources at once.

## PII and retention

Listing data can contain personal data such as names, phone numbers, agency names, or free-text descriptions. The system must:

- minimize collection;
- encrypt data in transit and at rest where platform-supported;
- enforce tenant access controls;
- keep audit logs for sensitive actions;
- define retention windows;
- provide takedown or opt-out handling.

## Incident runbook

When a source becomes unstable or risky:

1. Mark the source `degraded` or `off`.
2. Stop scheduling new jobs for that domain.
3. Preserve failed jobs in dead letter storage.
4. Inspect latest fetch and parse errors.
5. Update the adapter, rate policy, or source status.
6. Resume gradually only after validation.
