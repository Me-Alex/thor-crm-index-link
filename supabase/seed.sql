insert into public.sources (id, name, base_url, robots_policy_url, mode, rate_limit_per_minute, crawl_config, source_trust)
values
  (
    'demo',
    'Demo Source',
    'https://example.test',
    'https://example.test/robots.txt',
    'off',
    10,
    '{"adapter": "demo", "purpose": "local smoke tests only"}'::jsonb,
    0.50
  )
on conflict (id) do nothing;
