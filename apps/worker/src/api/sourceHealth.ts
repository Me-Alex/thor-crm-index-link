import type { Env } from "../runtime/env";
import { supabaseServiceHeaders } from "../runtime/supabaseRest";
import { jsonResponse, serviceUnavailable } from "../http/responses";

type SourceMode = "on" | "degraded" | "off";

interface SourceRow {
  id: string;
  name: string;
  mode: SourceMode;
  crawl_config: unknown;
}

interface SourceListingHealthRow {
  id: string;
  source_id: string;
  last_seen_at: string | null;
  crawl_status: "new" | "active" | "stale" | "removed" | "parse_failed";
  normalized_payload: Record<string, unknown> | null;
}

interface CanonicalListingLinkHealthRow {
  source_listing_id: string;
}

interface SourceHealthCard {
  id: string;
  name: string;
  mode: SourceMode;
  listingCount: number;
  latestSeenAt: string | null;
  crawlSuccessRate: number;
  parseSuccessRate: number;
  fieldCoverageRate: number;
  matchRate: number;
  timeToIndexMinutes: number;
}

export interface SourceHealthOptions {
  fetch?: typeof fetch;
  now?: Date;
}

export async function listSourceHealth(env: Env, options: SourceHealthOptions = {}): Promise<Response> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return serviceUnavailable({
      ok: false,
      service: "thor-crm-index-link-worker",
      supabase: "missing_config"
    });
  }

  const fetcher = options.fetch ?? fetch;
  const [sourcesResponse, listingsResponse, linksResponse] = await Promise.all([
    fetcher(sourceHealthUrl(env, "/rest/v1/sources", { select: "id,name,mode,crawl_config", order: "id.asc" }), {
      method: "GET",
      headers: supabaseServiceHeaders(env)
    }),
    fetcher(
      sourceHealthUrl(env, "/rest/v1/source_listings", {
        select: "id,source_id,last_seen_at,crawl_status,normalized_payload",
        order: "last_seen_at.desc",
        limit: "2000"
      }),
      {
        method: "GET",
        headers: supabaseServiceHeaders(env)
      }
    ),
    fetcher(
      sourceHealthUrl(env, "/rest/v1/canonical_listing_links", {
        select: "source_listing_id",
        limit: "5000"
      }),
      {
        method: "GET",
        headers: supabaseServiceHeaders(env)
      }
    )
  ]);

  if (!sourcesResponse.ok || !listingsResponse.ok || !linksResponse.ok) {
    return serviceUnavailable({
      ok: false,
      service: "thor-crm-index-link-worker",
      supabase: "unreachable",
      upstreamStatus: firstFailedStatus([sourcesResponse, listingsResponse, linksResponse])
    });
  }

  const sources = await sourcesResponse.json<unknown>();
  const listings = await listingsResponse.json<unknown>();
  const links = await linksResponse.json<unknown>();
  if (
    !Array.isArray(sources) ||
    !sources.every(isSourceRow) ||
    !Array.isArray(listings) ||
    !listings.every(isSourceListingHealthRow) ||
    !Array.isArray(links) ||
    !links.every(isCanonicalListingLinkHealthRow)
  ) {
    return serviceUnavailable({
      ok: false,
      service: "thor-crm-index-link-worker",
      supabase: "invalid_source_health_payload"
    });
  }

  const linkedSourceListingIds = new Set(links.map((link) => link.source_listing_id));
  const cards = sources.map((source) => toSourceHealthCard(source, listings, linkedSourceListingIds, options.now ?? new Date()));
  return jsonResponse({
    data: cards,
    count: cards.length
  });
}

function sourceHealthUrl(env: Env, path: string, params: Record<string, string>): string {
  const url = new URL(path, env.SUPABASE_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function toSourceHealthCard(
  source: SourceRow,
  listings: readonly SourceListingHealthRow[],
  linkedSourceListingIds: ReadonlySet<string>,
  now: Date
): SourceHealthCard {
  const sourceListings = listings.filter((listing) => listing.source_id === source.id);
  const latestSeenAt = sourceListings.map((listing) => listing.last_seen_at).filter((value): value is string => Boolean(value)).sort().at(-1) ?? null;
  const activeCount = sourceListings.filter((listing) => listing.crawl_status === "active").length;
  const parseFailedCount = sourceListings.filter((listing) => listing.crawl_status === "parse_failed").length;
  const parsedTotal = activeCount + parseFailedCount;
  const linkedCount = sourceListings.filter((listing) => linkedSourceListingIds.has(listing.id)).length;
  const fieldCoverageRate = averageFieldCoverage(sourceListings);

  return {
    id: source.id,
    name: source.name,
    mode: source.mode,
    listingCount: sourceListings.length,
    latestSeenAt,
    crawlSuccessRate: sourceListings.length > 0 ? 1 : 0,
    parseSuccessRate: parsedTotal > 0 ? activeCount / parsedTotal : 0,
    fieldCoverageRate,
    matchRate: sourceListings.length > 0 ? linkedCount / sourceListings.length : 0,
    timeToIndexMinutes: latestSeenAt ? Math.max(0, Math.round((now.getTime() - Date.parse(latestSeenAt)) / 60000)) : 0
  };
}

function isSourceRow(value: unknown): value is SourceRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    isSourceMode(value.mode)
  );
}

function isSourceListingHealthRow(value: unknown): value is SourceListingHealthRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.source_id === "string" &&
    (value.last_seen_at === null || typeof value.last_seen_at === "string") &&
    isCrawlStatus(value.crawl_status) &&
    (value.normalized_payload === null || isRecord(value.normalized_payload))
  );
}

function averageFieldCoverage(listings: readonly SourceListingHealthRow[]): number {
  if (listings.length === 0) {
    return 0;
  }

  const requiredFields = ["priceEur", "areaSqm", "rooms", "city"] as const;
  const totalCoverage = listings.reduce((sum, listing) => {
    const payload = listing.normalized_payload ?? {};
    const coveredFields = requiredFields.filter((field) => payload[field] !== undefined && payload[field] !== null && payload[field] !== "").length;
    return sum + coveredFields / requiredFields.length;
  }, 0);

  return Number((totalCoverage / listings.length).toFixed(2));
}

function isCanonicalListingLinkHealthRow(value: unknown): value is CanonicalListingLinkHealthRow {
  return isRecord(value) && typeof value.source_listing_id === "string";
}

function firstFailedStatus(responses: readonly Response[]): number {
  return responses.find((response) => !response.ok)?.status ?? 500;
}

function isSourceMode(value: unknown): value is SourceMode {
  return value === "on" || value === "degraded" || value === "off";
}

function isCrawlStatus(value: unknown): value is SourceListingHealthRow["crawl_status"] {
  return value === "new" || value === "active" || value === "stale" || value === "removed" || value === "parse_failed";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
