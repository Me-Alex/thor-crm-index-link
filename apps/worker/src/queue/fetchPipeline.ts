import { getAdapter } from "@thor-crm/adapters";
import { normalizeListingObservation } from "../ingest/normalization";
import type { Env, FetchMessage } from "../runtime/env";
import { upsertSourceListing, type SourceListingRepositoryOptions } from "./sourceListingRepository";

export interface FetchPipelineOptions extends SourceListingRepositoryOptions {}

export async function handleFetchMessage(message: FetchMessage, env: Env, options: FetchPipelineOptions = {}): Promise<void> {
  if (!message.fixtureHtml) {
    throw new Error("fixture_html_required_for_mvp_fetch_pipeline");
  }

  const adapter = getAdapter(message.sourceId);
  const parsed = adapter.parseListingDetail(message.fixtureHtml, {
    sourceId: message.sourceId,
    url: message.url,
    observedAt: message.discoveredAt
  });

  if (!parsed.ok) {
    throw new Error(`listing_parse_failed:${parsed.errors.join(",")}`);
  }

  const normalized = normalizeListingObservation(parsed.observation);
  await upsertSourceListing(
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
}
