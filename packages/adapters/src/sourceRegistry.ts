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
    seedUrls: ["https://www.storia.ro/ro/rezultate/vanzare/apartament", "https://www.storia.ro/ro/rezultate/inchiriere/apartament"],
    detailUrlPatterns: ["/ro/oferta/", "/(?:vanzare|inchiriere)/"]
  }),
  realPortal({
    id: "olx",
    name: "OLX Imobiliare",
    baseUrl: "https://www.olx.ro",
    seedUrls: ["https://www.olx.ro/imobiliare/apartamente-garsoniere-de-vanzare/", "https://www.olx.ro/imobiliare/apartamente-garsoniere-de-inchiriat/"],
    detailUrlPatterns: ["/d/oferta/", "/imobiliare/"]
  }),
  realPortal({
    id: "publi24",
    name: "Publi24 Imobiliare",
    baseUrl: "https://www.publi24.ro",
    seedUrls: ["https://www.publi24.ro/anunturi/imobiliare/de-vanzare/", "https://www.publi24.ro/anunturi/imobiliare/de-inchiriat/"],
    detailUrlPatterns: ["/anunturi/imobiliare/", "/(?:de-vanzare|de-inchiriat)/"]
  }),
  realPortal({
    id: "romimo",
    name: "Romimo.ro",
    baseUrl: "https://www.romimo.ro",
    seedUrls: ["https://www.romimo.ro/anunturi/imobiliare/de-vanzare/", "https://www.romimo.ro/anunturi/imobiliare/de-inchiriat/"],
    detailUrlPatterns: ["/anunturi/imobiliare/", "/(?:vanzare|inchiriere|de-vanzare|de-inchiriat)"]
  }),
  realPortal({
    id: "homezz",
    name: "HomeZZ.ro",
    baseUrl: "https://www.homezz.ro",
    seedUrls: ["https://www.homezz.ro/anunturi/vanzari-apartamente/", "https://www.homezz.ro/anunturi/inchirieri-apartamente/"],
    detailUrlPatterns: ["/anunturi/", "/(?:vanzari|inchirieri)-"]
  }),
  realPortal({
    id: "anuntul",
    name: "Anuntul.ro Imobiliare",
    baseUrl: "https://www.anuntul.ro",
    seedUrls: ["https://www.anuntul.ro/anunturi-imobiliare-vanzari/", "https://www.anuntul.ro/anunturi-imobiliare-inchirieri/"],
    detailUrlPatterns: ["/anunt-", "/anunturi-imobiliare"]
  }),
  realPortal({
    id: "lajumate",
    name: "LaJumate Imobiliare",
    baseUrl: "https://www.lajumate.ro",
    seedUrls: ["https://www.lajumate.ro/anunturi-imobiliare/", "https://www.lajumate.ro/imobiliare/"],
    detailUrlPatterns: ["/anunturi-imobiliare/", "/imobiliare/"]
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
      crawlStrategy: "sitemap",
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
