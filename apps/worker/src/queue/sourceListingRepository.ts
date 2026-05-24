import type { Env } from "../runtime/env";
import type { NormalizedListingObservation } from "../ingest/types";

export interface SourceListingWrite {
  source_id: string;
  source_listing_key: string;
  url: string;
  normalized_payload: NormalizedListingObservation;
  content_hash: string;
  crawl_status: "active" | "parse_failed";
  last_fetched_at: string;
  last_seen_at: string;
  parse_error: string | null;
}

export interface SourceListingRepositoryOptions {
  fetch?: typeof fetch;
}

export async function upsertSourceListing(
  env: Env,
  write: SourceListingWrite,
  options: SourceListingRepositoryOptions = {}
): Promise<void> {
  const fetcher = options.fetch ?? fetch;
  const endpoint = `${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/source_listings?on_conflict=source_id%2Csource_listing_key`;
  const response = await fetcher(endpoint, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify(write)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`source_listing_upsert_failed:${response.status}:${body}`);
  }
}
