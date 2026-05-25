import type { Env } from "../runtime/env";
import { badGateway, jsonResponse, notFound } from "../http/responses";
import type { PropertyType, TransactionType } from "../ingest/types";
import { supabaseServiceHeaders } from "../runtime/supabaseRest";

export interface ListingsApiOptions {
  fetch?: typeof fetch;
}

interface SourceListingRow {
  id: string;
  source_id: string;
  source_listing_key: string;
  url: string;
  normalized_payload: Record<string, unknown> | null;
  last_seen_at: string | null;
  last_fetched_at: string | null;
  crawl_status: string;
  parse_error: string | null;
}

interface CanonicalListingRow {
  id: string;
  title: string;
  description_excerpt: string | null;
  property_type: string;
  transaction_type: string;
  price_eur: number | string | null;
  area_sqm: number | string | null;
  rooms: number | null;
  floor: number | null;
  city: string | null;
  district: string | null;
  neighborhood: string | null;
  status: string;
  first_seen_at: string | null;
  last_seen_at: string | null;
}

interface ApiListing {
  id: string;
  recordType: "source_listing" | "canonical_listing";
  sourceId: string | null;
  sourceListingKey: string | null;
  sourceListingId: string | null;
  canonicalListingId: string | null;
  title: string;
  descriptionExcerpt: string;
  priceEur: number | null;
  areaSqm: number | null;
  rooms: number | null;
  floor: number | null;
  propertyType: PropertyType;
  transactionType: TransactionType;
  city: string | null;
  district: string | null;
  neighborhood: string | null;
  url: string | null;
  sourceLinks: Array<{
    sourceId: string;
    url: string;
  }>;
  observedAt: string | null;
  lastSeenAt: string | null;
}

class SupabaseRestError extends Error {
  constructor(readonly status: number) {
    super(`supabase_rest_error:${status}`);
  }
}

const sourceListingSelect = [
  "id",
  "source_id",
  "source_listing_key",
  "url",
  "normalized_payload",
  "last_seen_at",
  "last_fetched_at",
  "crawl_status",
  "parse_error"
].join(",");

const canonicalListingSelect = [
  "id",
  "title",
  "description_excerpt",
  "property_type",
  "transaction_type",
  "price_eur",
  "area_sqm",
  "rooms",
  "floor",
  "city",
  "district",
  "neighborhood",
  "status",
  "first_seen_at",
  "last_seen_at"
].join(",");

export async function listListings(request: Request, env: Env, options: ListingsApiOptions = {}): Promise<Response> {
  try {
    const url = new URL(request.url);
    const rows = await querySourceListings(env, options, {
      limit: parseLimit(url.searchParams.get("limit"))
    });

    const listings = rows.map(mapSourceListingRow);
    return jsonResponse({
      data: listings,
      count: listings.length
    });
  } catch (error) {
    if (error instanceof SupabaseRestError) {
      return badGateway("supabase_rest_error", "Unable to read listings");
    }
    throw error;
  }
}

export async function getListingById(listingId: string, env: Env, options: ListingsApiOptions = {}): Promise<Response> {
  try {
    const sourceRows = await querySourceListings(env, options, {
      id: listingId,
      limit: 1
    });

    const sourceListing = sourceRows[0];
    if (sourceListing) {
      return jsonResponse({
        data: mapSourceListingRow(sourceListing)
      });
    }

    const canonicalRows = await queryCanonicalListings(env, options, listingId);
    const canonicalListing = canonicalRows[0];
    if (!canonicalListing) {
      return notFound();
    }

    return jsonResponse({
      data: mapCanonicalListingRow(canonicalListing)
    });
  } catch (error) {
    if (error instanceof SupabaseRestError) {
      return badGateway("supabase_rest_error", "Unable to read listings");
    }
    throw error;
  }
}

async function querySourceListings(
  env: Env,
  options: ListingsApiOptions,
  filters: {
    id?: string;
    limit: number;
  }
): Promise<SourceListingRow[]> {
  const url = supabaseRestUrl(env, "source_listings");
  url.searchParams.set("select", sourceListingSelect);
  url.searchParams.set("crawl_status", "eq.active");
  url.searchParams.set("order", "last_seen_at.desc");
  url.searchParams.set("limit", String(filters.limit));
  if (filters.id) {
    url.searchParams.set("id", `eq.${filters.id}`);
  }

  return querySupabaseRows<SourceListingRow>(env, url, options);
}

async function queryCanonicalListings(env: Env, options: ListingsApiOptions, id: string): Promise<CanonicalListingRow[]> {
  const url = supabaseRestUrl(env, "canonical_listings");
  url.searchParams.set("select", canonicalListingSelect);
  url.searchParams.set("id", `eq.${id}`);
  url.searchParams.set("limit", "1");

  return querySupabaseRows<CanonicalListingRow>(env, url, options);
}

async function querySupabaseRows<Row>(env: Env, url: URL, options: ListingsApiOptions): Promise<Row[]> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new SupabaseRestError(503);
  }

  const fetcher = options.fetch ?? fetch;
  const response = await fetcher(url.toString(), {
    method: "GET",
    headers: supabaseServiceHeaders(env)
  });

  if (!response.ok) {
    throw new SupabaseRestError(response.status);
  }

  const body = (await response.json()) as unknown;
  if (!Array.isArray(body)) {
    throw new SupabaseRestError(502);
  }

  return body as Row[];
}

function supabaseRestUrl(env: Env, table: string): URL {
  if (!env.SUPABASE_URL) {
    throw new SupabaseRestError(503);
  }

  return new URL(`/rest/v1/${table}`, env.SUPABASE_URL);
}

function mapSourceListingRow(row: SourceListingRow): ApiListing {
  const payload = isRecord(row.normalized_payload) ? row.normalized_payload : {};
  const sourceId = stringValue(payload.sourceId) ?? row.source_id;
  const description = stringValue(payload.description) ?? "";

  return {
    id: row.id,
    recordType: "source_listing",
    sourceId,
    sourceListingKey: row.source_listing_key,
    sourceListingId: stringValue(payload.sourceListingId),
    canonicalListingId: null,
    title: stringValue(payload.title) ?? "Untitled listing",
    descriptionExcerpt: excerpt(description),
    priceEur: numberValue(payload.priceEur),
    areaSqm: numberValue(payload.areaSqm),
    rooms: numberValue(payload.rooms),
    floor: numberValue(payload.floor),
    propertyType: propertyTypeValue(payload.propertyType),
    transactionType: transactionTypeValue(payload.transactionType),
    city: stringValue(payload.city),
    district: stringValue(payload.district),
    neighborhood: stringValue(payload.neighborhood),
    url: row.url,
    sourceLinks: [
      {
        sourceId,
        url: row.url
      }
    ],
    observedAt: stringValue(payload.observedAt) ?? row.last_fetched_at ?? row.last_seen_at,
    lastSeenAt: row.last_seen_at
  };
}

function mapCanonicalListingRow(row: CanonicalListingRow): ApiListing {
  return {
    id: row.id,
    recordType: "canonical_listing",
    sourceId: null,
    sourceListingKey: null,
    sourceListingId: null,
    canonicalListingId: row.id,
    title: row.title,
    descriptionExcerpt: excerpt(row.description_excerpt ?? ""),
    priceEur: numberValue(row.price_eur),
    areaSqm: numberValue(row.area_sqm),
    rooms: numberValue(row.rooms),
    floor: numberValue(row.floor),
    propertyType: propertyTypeValue(row.property_type),
    transactionType: transactionTypeValue(row.transaction_type),
    city: row.city,
    district: row.district,
    neighborhood: row.neighborhood,
    url: null,
    sourceLinks: [],
    observedAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at
  };
}

function parseLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return 50;
  }
  return Math.min(Math.max(parsed, 1), 100);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function propertyTypeValue(value: unknown): PropertyType {
  return value === "apartment" || value === "house" || value === "land" || value === "commercial" || value === "other"
    ? value
    : "other";
}

function transactionTypeValue(value: unknown): TransactionType {
  return value === "rent" ? "rent" : "sale";
}

function excerpt(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 240 ? `${normalized.slice(0, 237)}...` : normalized;
}
