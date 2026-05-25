export type SourceMode = "on" | "degraded" | "off";
export type SourceReviewStatus = "approved_fixture" | "approved_initial_crawl" | "pending_review";
export type SourceAdapterStatus = "implemented" | "generic_implemented_pending_source_review";
export type SourceCrawlStrategy = "html_links" | "sitemap";

export interface SourceCrawlConfig {
  adapter: "demo" | "generic-jsonld";
  adapterStatus: SourceAdapterStatus;
  reviewStatus: SourceReviewStatus;
  crawlStrategy: SourceCrawlStrategy;
  seedUrls: readonly string[];
  sitemapUrls: readonly string[];
  detailUrlPatterns: readonly string[];
  rehostPolicy: "index_link_only";
  allowLiveCrawl: boolean;
  maxDiscoverUrls: number;
  maxSitemapBytes?: number;
  maxDetailBytes?: number;
}

export interface SourceRegistryEntry {
  id: string;
  name: string;
  baseUrl: string;
  robotsPolicyUrl: string;
  mode: SourceMode;
  rateLimitPerMinute: number;
  sourceTrust: number;
  crawlConfig: SourceCrawlConfig;
}

const genericMode = "off" satisfies SourceMode;
const genericRateLimitPerMinute = 6;
const genericSourceTrust = 0.35;
const activeInitialCrawl = {
  mode: "on",
  reviewStatus: "approved_initial_crawl",
  allowLiveCrawl: true
} as const;

export const sourceRegistry: readonly SourceRegistryEntry[] = [
  {
    id: "demo",
    name: "Demo Source",
    baseUrl: "https://example.test",
    robotsPolicyUrl: "https://example.test/robots.txt",
    mode: "off",
    rateLimitPerMinute: 10,
    sourceTrust: 0.5,
    crawlConfig: {
      adapter: "demo",
      adapterStatus: "implemented",
      reviewStatus: "approved_fixture",
      crawlStrategy: "html_links",
      seedUrls: ["https://example.test/listings"],
      sitemapUrls: [],
      detailUrlPatterns: ["/listings/"],
      rehostPolicy: "index_link_only",
      allowLiveCrawl: false,
      maxDiscoverUrls: 20
    }
  },
  realPortal({
    id: "imobiliare",
    name: "Imobiliare.ro",
    baseUrl: "https://www.imobiliare.ro",
    seedUrls: ["https://www.imobiliare.ro/vanzare-apartamente", "https://www.imobiliare.ro/inchirieri-apartamente"],
    sitemapUrls: ["https://www.imobiliare.ro/sitemap-listings-apartments-for-rent-bucuresti-ro.xml"],
    detailUrlPatterns: ["/oferta/", "/(?:vanzare|inchirieri|inchiriere)-", "/apartament-de-(?:vanzare|inchiriat)"],
    mode: "on",
    reviewStatus: "approved_initial_crawl",
    allowLiveCrawl: true,
    maxDiscoverUrls: 25,
    maxSitemapBytes: 6_000_000,
    maxDetailBytes: 2_000_000
  }),
  realPortal({
    id: "storia",
    name: "Storia.ro",
    baseUrl: "https://www.storia.ro",
    crawlStrategy: "html_links",
    seedUrls: ["https://www.storia.ro/ro/rezultate/inchiriere/apartament/bucuresti", "https://www.storia.ro/ro/rezultate/vanzare/apartament/bucuresti"],
    sitemapUrls: [],
    detailUrlPatterns: ["/ro/oferta/"],
    maxDiscoverUrls: 12,
    maxSitemapBytes: 2_000_000,
    maxDetailBytes: 1_000_000,
    ...activeInitialCrawl
  }),
  realPortal({
    id: "olx",
    name: "OLX Imobiliare",
    baseUrl: "https://www.olx.ro",
    crawlStrategy: "html_links",
    seedUrls: ["https://www.olx.ro/imobiliare/apartamente-garsoniere-de-inchiriat/bucuresti/", "https://www.olx.ro/imobiliare/apartamente-garsoniere-de-vanzare/bucuresti/"],
    sitemapUrls: [],
    detailUrlPatterns: ["/d/oferta/"],
    maxDiscoverUrls: 10,
    maxSitemapBytes: 4_000_000,
    maxDetailBytes: 4_000_000,
    ...activeInitialCrawl
  }),
  realPortal({
    id: "publi24",
    name: "Publi24 Imobiliare",
    baseUrl: "https://www.publi24.ro",
    seedUrls: ["https://www.publi24.ro/anunturi/imobiliare/de-vanzare/", "https://www.publi24.ro/anunturi/imobiliare/de-inchiriat/"],
    sitemapUrls: ["https://www.publi24.ro/Sitemaps/sitemap-publi24-articles-by-category-Imobiliare-1.xml"],
    detailUrlPatterns: ["/anunturi/imobiliare/", "/(?:de-vanzare|de-inchiriat)/"],
    maxDiscoverUrls: 15,
    maxSitemapBytes: 8_000_000,
    maxDetailBytes: 2_000_000,
    ...activeInitialCrawl
  }),
  realPortal({
    id: "romimo",
    name: "Romimo.ro",
    baseUrl: "https://www.romimo.ro",
    seedUrls: ["https://www.romimo.ro/anunturi/imobiliare/de-vanzare/", "https://www.romimo.ro/anunturi/imobiliare/de-inchiriat/"],
    sitemapUrls: ["https://www.romimo.ro/Sitemaps/sitemap-romimo-articles-by-category-Imobiliare-1.xml"],
    detailUrlPatterns: ["/anunturi/imobiliare/", "/(?:vanzare|inchiriere|de-vanzare|de-inchiriat)"],
    maxDiscoverUrls: 15,
    maxSitemapBytes: 8_000_000,
    maxDetailBytes: 2_000_000,
    ...activeInitialCrawl
  }),
  realPortal({
    id: "homezz",
    name: "HomeZZ.ro",
    baseUrl: "https://homezz.ro",
    seedUrls: ["https://homezz.ro/anunturi/vanzari-apartamente/", "https://homezz.ro/anunturi/inchirieri-apartamente/"],
    sitemapUrls: ["https://homezz.ro/sitemap/sitemap-anunturi-apartamente-vanzare.xml", "https://homezz.ro/sitemap/sitemap-anunturi-apartamente-inchiriere.xml"],
    detailUrlPatterns: ["/.+-\\d+\\.html$"],
    maxDiscoverUrls: 20,
    maxSitemapBytes: 6_000_000,
    maxDetailBytes: 2_000_000,
    ...activeInitialCrawl
  }),
  realPortal({
    id: "anuntul",
    name: "Anuntul.ro Imobiliare",
    baseUrl: "https://www.anuntul.ro",
    crawlStrategy: "html_links",
    seedUrls: ["https://www.anuntul.ro/anunturi-imobiliare-vanzari/", "https://www.anuntul.ro/anunturi-imobiliare-inchirieri/"],
    sitemapUrls: [],
    detailUrlPatterns: ["/anunt-(?:inchiriere|vanzare|garsoniera|apartament|casa)"],
    maxDiscoverUrls: 20,
    maxSitemapBytes: 500_000,
    maxDetailBytes: 1_000_000,
    ...activeInitialCrawl
  }),
  realPortal({
    id: "lajumate",
    name: "LaJumate Imobiliare",
    baseUrl: "https://lajumate.ro",
    seedUrls: ["https://lajumate.ro/anunturi-imobiliare/", "https://lajumate.ro/imobiliare/"],
    sitemapUrls: ["https://lajumate.ro/sitemap-anunt-1.xml"],
    detailUrlPatterns: ["/ad/(?:apartament|garsoniera|casa|teren|vand|inchiriez|inchiriere|vanzare)"],
    maxDiscoverUrls: 15,
    maxSitemapBytes: 5_000_000,
    maxDetailBytes: 2_000_000,
    ...activeInitialCrawl
  })
];

export function getSourceRegistryEntry(sourceId: string): SourceRegistryEntry | undefined {
  return sourceRegistry.find((source) => source.id === sourceId);
}

export function getGenericPortalSourceEntries(): SourceRegistryEntry[] {
  return sourceRegistry.filter((source) => source.crawlConfig.adapter === "generic-jsonld");
}

interface RealPortalInput {
  id: string;
  name: string;
  baseUrl: string;
  crawlStrategy?: SourceCrawlStrategy;
  seedUrls: readonly string[];
  sitemapUrls?: readonly string[];
  detailUrlPatterns: readonly string[];
  mode?: SourceMode;
  reviewStatus?: SourceReviewStatus;
  allowLiveCrawl?: boolean;
  maxDiscoverUrls?: number;
  maxSitemapBytes?: number;
  maxDetailBytes?: number;
}

function realPortal(input: RealPortalInput): SourceRegistryEntry {
  return {
    id: input.id,
    name: input.name,
    baseUrl: input.baseUrl,
    robotsPolicyUrl: `${input.baseUrl}/robots.txt`,
    mode: input.mode ?? genericMode,
    rateLimitPerMinute: genericRateLimitPerMinute,
    sourceTrust: genericSourceTrust,
    crawlConfig: {
      adapter: "generic-jsonld",
      adapterStatus: "generic_implemented_pending_source_review",
      reviewStatus: input.reviewStatus ?? "pending_review",
      crawlStrategy: input.crawlStrategy ?? "sitemap",
      seedUrls: input.seedUrls,
      sitemapUrls: input.sitemapUrls ?? [`${input.baseUrl}/sitemap.xml`],
      detailUrlPatterns: input.detailUrlPatterns,
      rehostPolicy: "index_link_only",
      allowLiveCrawl: input.allowLiveCrawl ?? false,
      maxDiscoverUrls: input.maxDiscoverUrls ?? 50,
      ...(input.maxSitemapBytes === undefined ? {} : { maxSitemapBytes: input.maxSitemapBytes }),
      ...(input.maxDetailBytes === undefined ? {} : { maxDetailBytes: input.maxDetailBytes })
    }
  };
}
