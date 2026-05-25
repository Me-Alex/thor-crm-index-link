import { getAdapter } from "@thor-crm/adapters";
import { normalizeListingObservation } from "../ingest/normalization";
import type { Env, FetchMessage } from "../runtime/env";
import { persistCanonicalMatch, type CanonicalListingRepositoryOptions } from "./canonicalListingRepository";
import { fetchHtml, type HtmlFetchOptions } from "./httpFetch";
import { upsertSourceListing, type SourceListingRepositoryOptions } from "./sourceListingRepository";

export interface FetchPipelineOptions extends SourceListingRepositoryOptions, CanonicalListingRepositoryOptions, HtmlFetchOptions {}

export async function handleFetchMessage(message: FetchMessage, env: Env, options: FetchPipelineOptions = {}): Promise<void> {
  const html = message.fixtureHtml ?? (await fetchHtml(message.url, options));
  const adapter = getAdapter(message.sourceId);
  const parsed = adapter.parseListingDetail(html, {
    sourceId: message.sourceId,
    url: message.url,
    observedAt: message.discoveredAt
  });

  if (!parsed.ok) {
    throw new Error(`listing_parse_failed:${parsed.errors.join(",")}`);
  }

  const normalized = normalizeListingObservation(parsed.observation);
  const sourceListingId = await upsertSourceListing(
    env,
    {
      source_id: normalized.sourceId,
      source_listing_key: normalized.sourceListingId ?? normalized.contentFingerprint,
      url: normalized.url,
      normalized_payload: normalized,
      content_hash: normalized.contentFingerprint,
      crawl_status: "active",
      last_fetched_at: normalized.observedAt,
      last_seen_at: normalized.observedAt,
      parse_error: null
    },
    options
  );
  await persistCanonicalMatch(env, sourceListingId, normalized, options);
}
