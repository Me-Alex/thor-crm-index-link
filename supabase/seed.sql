insert into public.sources (id, name, base_url, robots_policy_url, mode, rate_limit_per_minute, crawl_config, source_trust)
values
  (
    'demo',
    'Demo Source',
    'https://example.test',
    'https://example.test/robots.txt',
    'off',
    10,
    '{"adapter":"demo","adapterStatus":"implemented","reviewStatus":"approved_fixture","crawlStrategy":"html_links","seedUrls":["https://example.test/listings"],"sitemapUrls":[],"detailUrlPatterns":["/listings/"],"rehostPolicy":"index_link_only","allowLiveCrawl":false,"maxDiscoverUrls":20}'::jsonb,
    0.50
  ),
  (
    'imobiliare',
    'Imobiliare.ro',
    'https://www.imobiliare.ro',
    'https://www.imobiliare.ro/robots.txt',
    'on',
    6,
    '{"adapter":"generic-jsonld","adapterStatus":"generic_implemented_pending_source_review","reviewStatus":"approved_initial_crawl","crawlStrategy":"sitemap","seedUrls":["https://www.imobiliare.ro/vanzare-apartamente","https://www.imobiliare.ro/inchirieri-apartamente"],"sitemapUrls":["https://www.imobiliare.ro/sitemap-listings-apartments-for-rent-bucuresti-ro.xml"],"detailUrlPatterns":["/oferta/","/(?:vanzare|inchirieri|inchiriere)-","/apartament-de-(?:vanzare|inchiriat)"],"rehostPolicy":"index_link_only","allowLiveCrawl":true,"maxDiscoverUrls":25,"maxSitemapBytes":6000000,"maxDetailBytes":2000000}'::jsonb,
    0.35
  ),
  (
    'storia',
    'Storia.ro',
    'https://www.storia.ro',
    'https://www.storia.ro/robots.txt',
    'on',
    6,
    '{"adapter":"generic-jsonld","adapterStatus":"generic_implemented_pending_source_review","reviewStatus":"approved_initial_crawl","crawlStrategy":"html_links","seedUrls":["https://www.storia.ro/ro/rezultate/inchiriere/apartament/bucuresti","https://www.storia.ro/ro/rezultate/vanzare/apartament/bucuresti"],"sitemapUrls":[],"detailUrlPatterns":["/ro/oferta/"],"rehostPolicy":"index_link_only","allowLiveCrawl":true,"maxDiscoverUrls":12,"maxSitemapBytes":2000000,"maxDetailBytes":1000000}'::jsonb,
    0.35
  ),
  (
    'olx',
    'OLX Imobiliare',
    'https://www.olx.ro',
    'https://www.olx.ro/robots.txt',
    'on',
    6,
    '{"adapter":"generic-jsonld","adapterStatus":"generic_implemented_pending_source_review","reviewStatus":"approved_initial_crawl","crawlStrategy":"html_links","seedUrls":["https://www.olx.ro/imobiliare/apartamente-garsoniere-de-inchiriat/bucuresti/","https://www.olx.ro/imobiliare/apartamente-garsoniere-de-vanzare/bucuresti/"],"sitemapUrls":[],"detailUrlPatterns":["/d/oferta/"],"rehostPolicy":"index_link_only","allowLiveCrawl":true,"maxDiscoverUrls":10,"maxSitemapBytes":4000000,"maxDetailBytes":4000000}'::jsonb,
    0.35
  ),
  (
    'publi24',
    'Publi24 Imobiliare',
    'https://www.publi24.ro',
    'https://www.publi24.ro/robots.txt',
    'on',
    6,
    '{"adapter":"generic-jsonld","adapterStatus":"generic_implemented_pending_source_review","reviewStatus":"approved_initial_crawl","crawlStrategy":"sitemap","seedUrls":["https://www.publi24.ro/anunturi/imobiliare/de-vanzare/","https://www.publi24.ro/anunturi/imobiliare/de-inchiriat/"],"sitemapUrls":["https://www.publi24.ro/Sitemaps/sitemap-publi24-articles-by-category-Imobiliare-1.xml"],"detailUrlPatterns":["/anunturi/imobiliare/","/(?:de-vanzare|de-inchiriat)/"],"rehostPolicy":"index_link_only","allowLiveCrawl":true,"maxDiscoverUrls":15,"maxSitemapBytes":8000000,"maxDetailBytes":2000000}'::jsonb,
    0.35
  ),
  (
    'romimo',
    'Romimo.ro',
    'https://www.romimo.ro',
    'https://www.romimo.ro/robots.txt',
    'on',
    6,
    '{"adapter":"generic-jsonld","adapterStatus":"generic_implemented_pending_source_review","reviewStatus":"approved_initial_crawl","crawlStrategy":"sitemap","seedUrls":["https://www.romimo.ro/anunturi/imobiliare/de-vanzare/","https://www.romimo.ro/anunturi/imobiliare/de-inchiriat/"],"sitemapUrls":["https://www.romimo.ro/Sitemaps/sitemap-romimo-articles-by-category-Imobiliare-1.xml"],"detailUrlPatterns":["/anunturi/imobiliare/","/(?:vanzare|inchiriere|de-vanzare|de-inchiriat)"],"rehostPolicy":"index_link_only","allowLiveCrawl":true,"maxDiscoverUrls":15,"maxSitemapBytes":8000000,"maxDetailBytes":2000000}'::jsonb,
    0.35
  ),
  (
    'homezz',
    'HomeZZ.ro',
    'https://homezz.ro',
    'https://homezz.ro/robots.txt',
    'on',
    6,
    '{"adapter":"generic-jsonld","adapterStatus":"generic_implemented_pending_source_review","reviewStatus":"approved_initial_crawl","crawlStrategy":"sitemap","seedUrls":["https://homezz.ro/anunturi/vanzari-apartamente/","https://homezz.ro/anunturi/inchirieri-apartamente/"],"sitemapUrls":["https://homezz.ro/sitemap/sitemap-anunturi-apartamente-vanzare.xml","https://homezz.ro/sitemap/sitemap-anunturi-apartamente-inchiriere.xml"],"detailUrlPatterns":["/.+-\\\\d+\\\\.html$"],"rehostPolicy":"index_link_only","allowLiveCrawl":true,"maxDiscoverUrls":20,"maxSitemapBytes":6000000,"maxDetailBytes":2000000}'::jsonb,
    0.35
  ),
  (
    'anuntul',
    'Anuntul.ro Imobiliare',
    'https://www.anuntul.ro',
    'https://www.anuntul.ro/robots.txt',
    'on',
    6,
    '{"adapter":"generic-jsonld","adapterStatus":"generic_implemented_pending_source_review","reviewStatus":"approved_initial_crawl","crawlStrategy":"html_links","seedUrls":["https://www.anuntul.ro/anunturi-imobiliare-vanzari/","https://www.anuntul.ro/anunturi-imobiliare-inchirieri/"],"sitemapUrls":[],"detailUrlPatterns":["/anunt-(?:inchiriere|vanzare|garsoniera|apartament|casa)"],"rehostPolicy":"index_link_only","allowLiveCrawl":true,"maxDiscoverUrls":20,"maxSitemapBytes":500000,"maxDetailBytes":1000000}'::jsonb,
    0.35
  ),
  (
    'lajumate',
    'LaJumate Imobiliare',
    'https://lajumate.ro',
    'https://lajumate.ro/robots.txt',
    'on',
    6,
    '{"adapter":"generic-jsonld","adapterStatus":"generic_implemented_pending_source_review","reviewStatus":"approved_initial_crawl","crawlStrategy":"sitemap","seedUrls":["https://lajumate.ro/anunturi-imobiliare/","https://lajumate.ro/imobiliare/"],"sitemapUrls":["https://lajumate.ro/sitemap-anunt-1.xml"],"detailUrlPatterns":["/ad/(?:apartament|garsoniera|casa|teren|vand|inchiriez|inchiriere|vanzare)"],"rehostPolicy":"index_link_only","allowLiveCrawl":true,"maxDiscoverUrls":15,"maxSitemapBytes":5000000,"maxDetailBytes":2000000}'::jsonb,
    0.35
  )
on conflict (id) do update set
  name = excluded.name,
  base_url = excluded.base_url,
  robots_policy_url = excluded.robots_policy_url,
  mode = excluded.mode,
  rate_limit_per_minute = excluded.rate_limit_per_minute,
  crawl_config = excluded.crawl_config,
  source_trust = excluded.source_trust,
  updated_at = now();
