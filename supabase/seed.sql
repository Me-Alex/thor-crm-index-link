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
    'off',
    6,
    '{"adapter":"generic-jsonld","adapterStatus":"generic_implemented_pending_source_review","reviewStatus":"pending_review","crawlStrategy":"sitemap","seedUrls":["https://www.storia.ro/ro/rezultate/vanzare/apartament","https://www.storia.ro/ro/rezultate/inchiriere/apartament"],"sitemapUrls":["https://www.storia.ro/sitemap.xml"],"detailUrlPatterns":["/ro/oferta/","/(?:vanzare|inchiriere)/"],"rehostPolicy":"index_link_only","allowLiveCrawl":false,"maxDiscoverUrls":50}'::jsonb,
    0.35
  ),
  (
    'olx',
    'OLX Imobiliare',
    'https://www.olx.ro',
    'https://www.olx.ro/robots.txt',
    'off',
    6,
    '{"adapter":"generic-jsonld","adapterStatus":"generic_implemented_pending_source_review","reviewStatus":"pending_review","crawlStrategy":"sitemap","seedUrls":["https://www.olx.ro/imobiliare/apartamente-garsoniere-de-vanzare/","https://www.olx.ro/imobiliare/apartamente-garsoniere-de-inchiriat/"],"sitemapUrls":["https://www.olx.ro/sitemap.xml"],"detailUrlPatterns":["/d/oferta/","/imobiliare/"],"rehostPolicy":"index_link_only","allowLiveCrawl":false,"maxDiscoverUrls":50}'::jsonb,
    0.35
  ),
  (
    'publi24',
    'Publi24 Imobiliare',
    'https://www.publi24.ro',
    'https://www.publi24.ro/robots.txt',
    'off',
    6,
    '{"adapter":"generic-jsonld","adapterStatus":"generic_implemented_pending_source_review","reviewStatus":"pending_review","crawlStrategy":"sitemap","seedUrls":["https://www.publi24.ro/anunturi/imobiliare/de-vanzare/","https://www.publi24.ro/anunturi/imobiliare/de-inchiriat/"],"sitemapUrls":["https://www.publi24.ro/sitemap.xml"],"detailUrlPatterns":["/anunturi/imobiliare/","/(?:de-vanzare|de-inchiriat)/"],"rehostPolicy":"index_link_only","allowLiveCrawl":false,"maxDiscoverUrls":50}'::jsonb,
    0.35
  ),
  (
    'romimo',
    'Romimo.ro',
    'https://www.romimo.ro',
    'https://www.romimo.ro/robots.txt',
    'off',
    6,
    '{"adapter":"generic-jsonld","adapterStatus":"generic_implemented_pending_source_review","reviewStatus":"pending_review","crawlStrategy":"sitemap","seedUrls":["https://www.romimo.ro/anunturi/imobiliare/de-vanzare/","https://www.romimo.ro/anunturi/imobiliare/de-inchiriat/"],"sitemapUrls":["https://www.romimo.ro/sitemap.xml"],"detailUrlPatterns":["/anunturi/imobiliare/","/(?:vanzare|inchiriere|de-vanzare|de-inchiriat)"],"rehostPolicy":"index_link_only","allowLiveCrawl":false,"maxDiscoverUrls":50}'::jsonb,
    0.35
  ),
  (
    'homezz',
    'HomeZZ.ro',
    'https://www.homezz.ro',
    'https://www.homezz.ro/robots.txt',
    'off',
    6,
    '{"adapter":"generic-jsonld","adapterStatus":"generic_implemented_pending_source_review","reviewStatus":"pending_review","crawlStrategy":"sitemap","seedUrls":["https://www.homezz.ro/anunturi/vanzari-apartamente/","https://www.homezz.ro/anunturi/inchirieri-apartamente/"],"sitemapUrls":["https://www.homezz.ro/sitemap.xml"],"detailUrlPatterns":["/anunturi/","/(?:vanzari|inchirieri)-"],"rehostPolicy":"index_link_only","allowLiveCrawl":false,"maxDiscoverUrls":50}'::jsonb,
    0.35
  ),
  (
    'anuntul',
    'Anuntul.ro Imobiliare',
    'https://www.anuntul.ro',
    'https://www.anuntul.ro/robots.txt',
    'off',
    6,
    '{"adapter":"generic-jsonld","adapterStatus":"generic_implemented_pending_source_review","reviewStatus":"pending_review","crawlStrategy":"sitemap","seedUrls":["https://www.anuntul.ro/anunturi-imobiliare-vanzari/","https://www.anuntul.ro/anunturi-imobiliare-inchirieri/"],"sitemapUrls":["https://www.anuntul.ro/sitemap.xml"],"detailUrlPatterns":["/anunt-","/anunturi-imobiliare"],"rehostPolicy":"index_link_only","allowLiveCrawl":false,"maxDiscoverUrls":50}'::jsonb,
    0.35
  ),
  (
    'lajumate',
    'LaJumate Imobiliare',
    'https://www.lajumate.ro',
    'https://www.lajumate.ro/robots.txt',
    'off',
    6,
    '{"adapter":"generic-jsonld","adapterStatus":"generic_implemented_pending_source_review","reviewStatus":"pending_review","crawlStrategy":"sitemap","seedUrls":["https://www.lajumate.ro/anunturi-imobiliare/","https://www.lajumate.ro/imobiliare/"],"sitemapUrls":["https://www.lajumate.ro/sitemap.xml"],"detailUrlPatterns":["/anunturi-imobiliare/","/imobiliare/"],"rehostPolicy":"index_link_only","allowLiveCrawl":false,"maxDiscoverUrls":50}'::jsonb,
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
