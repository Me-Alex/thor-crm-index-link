import { badGateway, jsonResponse, serviceUnavailable } from "../http/responses";
import type { Env } from "../runtime/env";
import { supabaseServiceHeaders } from "../runtime/supabaseRest";

export interface DedupReviewOptions {
  fetch?: typeof fetch;
}

interface CanonicalListingLinkReviewRow {
  source_listing_id: string;
  canonical_listing_id: string;
  match_score: number | string;
  match_reasons: unknown;
  linked_at: string;
}

export async function listDedupReviewLinks(
  request: Request,
  env: Env,
  options: DedupReviewOptions = {}
): Promise<Response> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return serviceUnavailable({
      ok: false,
      service: "thor-crm-index-link-worker",
      supabase: "missing_config"
    });
  }

  const requestUrl = new URL(request.url);
  const url = new URL("/rest/v1/canonical_listing_links", env.SUPABASE_URL);
  url.searchParams.set("select", "source_listing_id,canonical_listing_id,match_score,match_reasons,linked_at");
  url.searchParams.set("order", "linked_at.desc");
  url.searchParams.set("limit", String(parseLimit(requestUrl.searchParams.get("limit"))));

  const response = await (options.fetch ?? fetch)(url.toString(), {
    method: "GET",
    headers: supabaseServiceHeaders(env)
  });

  if (!response.ok) {
    return badGateway("supabase_rest_error", "Unable to load dedup review links");
  }

  const body = (await response.json()) as unknown;
  if (!Array.isArray(body) || !body.every(isCanonicalListingLinkReviewRow)) {
    return badGateway("supabase_rest_error", "Invalid dedup review payload");
  }

  const data = body.map((row) => ({
    sourceListingId: row.source_listing_id,
    canonicalListingId: row.canonical_listing_id,
    matchScore: numberValue(row.match_score),
    matchReasons: Array.isArray(row.match_reasons) ? row.match_reasons.filter((reason): reason is string => typeof reason === "string") : [],
    linkedAt: row.linked_at
  }));

  return jsonResponse({
    data,
    count: data.length
  });
}

function parseLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return 100;
  }
  return Math.min(Math.max(parsed, 1), 500);
}

function numberValue(value: number | string): number {
  return typeof value === "number" ? value : Number.parseFloat(value);
}

function isCanonicalListingLinkReviewRow(value: unknown): value is CanonicalListingLinkReviewRow {
  return (
    isRecord(value) &&
    typeof value.source_listing_id === "string" &&
    typeof value.canonical_listing_id === "string" &&
    (typeof value.match_score === "number" || typeof value.match_score === "string") &&
    Array.isArray(value.match_reasons) &&
    typeof value.linked_at === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
