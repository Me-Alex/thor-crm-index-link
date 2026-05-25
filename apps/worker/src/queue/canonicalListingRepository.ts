import { buildCandidateBlock, scoreCandidateMatch, shouldLinkCandidate } from "../ingest/matcher";
import { normalizeSearchText } from "../ingest/normalization";
import type { CanonicalCandidate, NormalizedListingObservation, PropertyType, TransactionType } from "../ingest/types";
import type { Env } from "../runtime/env";
import { supabaseServiceHeaders } from "../runtime/supabaseRest";

export interface CanonicalListingRepositoryOptions {
  fetch?: typeof fetch;
}

interface CanonicalListingRow {
  id: string;
  title: string;
  description_excerpt: string | null;
  property_type: PropertyType;
  transaction_type: TransactionType;
  price_eur: number | string | null;
  area_sqm: number | string | null;
  rooms: number | null;
  floor: number | null;
  city: string | null;
  district: string | null;
  neighborhood: string | null;
}

interface PersistedCanonicalMatch {
  canonicalListingId: string;
  matchScore: number;
  matchReasons: string[];
}

const canonicalSelect = [
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
  "neighborhood"
].join(",");

export async function persistCanonicalMatch(
  env: Env,
  sourceListingId: string,
  observation: NormalizedListingObservation,
  options: CanonicalListingRepositoryOptions = {}
): Promise<PersistedCanonicalMatch> {
  assertCanonicalRepositoryConfig(env);

  const candidates = await queryCanonicalCandidates(env, observation, options);
  const bestMatch = candidates
    .map((candidate) => scoreCandidateMatch(observation, candidate))
    .sort((left, right) => right.score - left.score)[0];

  const match = bestMatch && shouldLinkCandidate(bestMatch)
    ? {
        canonicalListingId: bestMatch.candidateId,
        matchScore: bestMatch.score,
        matchReasons: bestMatch.reasons
      }
    : {
        canonicalListingId: await createCanonicalListing(env, observation, options),
        matchScore: 1,
        matchReasons: ["new_canonical_listing"]
      };

  if (bestMatch && shouldLinkCandidate(bestMatch)) {
    await touchCanonicalListing(env, match.canonicalListingId, observation.observedAt, options);
  }

  await upsertCanonicalListingLink(env, sourceListingId, match, options);
  await insertListingHistory(env, sourceListingId, observation, match.canonicalListingId, options);

  return match;
}

async function queryCanonicalCandidates(
  env: Env,
  observation: NormalizedListingObservation,
  options: CanonicalListingRepositoryOptions
): Promise<CanonicalCandidate[]> {
  const block = buildCandidateBlock(observation);
  const url = supabaseRestUrl(env, "canonical_listings");
  url.searchParams.set("select", canonicalSelect);
  url.searchParams.set("property_type", `eq.${block.propertyType}`);
  url.searchParams.set("transaction_type", `eq.${block.transactionType}`);
  if (observation.city) {
    url.searchParams.set("city", `eq.${observation.city}`);
  }
  if (observation.district) {
    url.searchParams.set("district", `eq.${observation.district}`);
  }
  url.searchParams.set("limit", "25");

  const rows = await supabaseJson<CanonicalListingRow[]>(env, url, { method: "GET" }, options);
  if (!Array.isArray(rows)) {
    throw new Error("canonical_candidate_query_invalid_response");
  }

  return rows.map(rowToCandidate);
}

async function createCanonicalListing(
  env: Env,
  observation: NormalizedListingObservation,
  options: CanonicalListingRepositoryOptions
): Promise<string> {
  const url = supabaseRestUrl(env, "canonical_listings");
  const rows = await supabaseJson<Array<{ id: string }>>(
    env,
    url,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        prefer: "return=representation"
      },
      body: JSON.stringify({
        title: observation.title,
        description_excerpt: excerpt(observation.description),
        property_type: observation.propertyType,
        transaction_type: observation.transactionType,
        price_eur: observation.priceEur ?? null,
        area_sqm: observation.areaSqm ?? null,
        rooms: observation.rooms ?? null,
        floor: observation.floor ?? null,
        city: observation.city ?? null,
        district: observation.district ?? null,
        neighborhood: observation.neighborhood ?? null,
        field_provenance: provenanceFromObservation(observation),
        status: "active",
        first_seen_at: observation.observedAt,
        last_seen_at: observation.observedAt
      })
    },
    options
  );

  if (!Array.isArray(rows) || typeof rows[0]?.id !== "string") {
    throw new Error("canonical_listing_insert_missing_id");
  }

  return rows[0].id;
}

async function touchCanonicalListing(
  env: Env,
  canonicalListingId: string,
  observedAt: string,
  options: CanonicalListingRepositoryOptions
): Promise<void> {
  const url = supabaseRestUrl(env, "canonical_listings");
  url.searchParams.set("id", `eq.${canonicalListingId}`);

  await supabaseJson(
    env,
    url,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        prefer: "return=minimal"
      },
      body: JSON.stringify({
        last_seen_at: observedAt,
        status: "active"
      })
    },
    options
  );
}

async function upsertCanonicalListingLink(
  env: Env,
  sourceListingId: string,
  match: PersistedCanonicalMatch,
  options: CanonicalListingRepositoryOptions
): Promise<void> {
  const url = supabaseRestUrl(env, "canonical_listing_links");
  url.searchParams.set("on_conflict", "source_listing_id");

  await supabaseJson(
    env,
    url,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify({
        source_listing_id: sourceListingId,
        canonical_listing_id: match.canonicalListingId,
        match_score: match.matchScore,
        match_reasons: match.matchReasons
      })
    },
    options
  );
}

async function insertListingHistory(
  env: Env,
  sourceListingId: string,
  observation: NormalizedListingObservation,
  canonicalListingId: string,
  options: CanonicalListingRepositoryOptions
): Promise<void> {
  const url = supabaseRestUrl(env, "listing_history");

  await supabaseJson(
    env,
    url,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        prefer: "return=minimal"
      },
      body: JSON.stringify({
        canonical_listing_id: canonicalListingId,
        source_listing_id: sourceListingId,
        observed_at: observation.observedAt,
        price_eur: observation.priceEur ?? null,
        availability_status: "active",
        changed_fields: {
          price_eur: observation.priceEur ?? null,
          area_sqm: observation.areaSqm ?? null,
          rooms: observation.rooms ?? null
        }
      })
    },
    options
  );
}

async function supabaseJson<T>(
  env: Env,
  url: URL,
  init: RequestInit,
  options: CanonicalListingRepositoryOptions
): Promise<T> {
  const fetcher = options.fetch ?? fetch;
  const headers = supabaseServiceHeaders(env, init.headers);

  const response = await fetcher(url.toString(), {
    ...init,
    headers
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`canonical_repository_request_failed:${response.status}:${body}`);
  }

  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

function assertCanonicalRepositoryConfig(env: Env): void {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("canonical_repository_config_missing");
  }
}

function supabaseRestUrl(env: Env, table: string): URL {
  return new URL(`/rest/v1/${table}`, env.SUPABASE_URL);
}

function rowToCandidate(row: CanonicalListingRow): CanonicalCandidate {
  const priceEur = numberValue(row.price_eur);
  const areaSqm = numberValue(row.area_sqm);
  const candidate: CanonicalCandidate = {
    canonicalListingId: row.id,
    title: row.title,
    ...(row.rooms !== null ? { rooms: row.rooms } : {}),
    propertyType: row.property_type,
    transactionType: row.transaction_type,
    ...(row.city ? { city: row.city } : {}),
    ...(row.district ? { district: row.district } : {}),
    ...(row.neighborhood ? { neighborhood: row.neighborhood } : {}),
    ...(row.floor !== null ? { floor: row.floor } : {}),
    searchText: normalizeSearchText([row.title, row.description_excerpt, row.city, row.district, row.neighborhood].filter(Boolean).join(" "))
  };

  if (priceEur !== undefined) {
    candidate.priceEur = priceEur;
  }
  if (areaSqm !== undefined) {
    candidate.areaSqm = areaSqm;
  }

  return candidate;
}

function numberValue(value: number | string | null): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function excerpt(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 240 ? `${normalized.slice(0, 237)}...` : normalized;
}

function provenanceFromObservation(observation: NormalizedListingObservation): Record<string, { source_id: string; observed_at: string }> {
  const provenance: Record<string, { source_id: string; observed_at: string }> = {};
  for (const field of ["title", "description", "price_eur", "area_sqm", "rooms", "floor", "city", "district", "neighborhood"] as const) {
    provenance[field] = {
      source_id: observation.sourceId,
      observed_at: observation.observedAt
    };
  }
  return provenance;
}
