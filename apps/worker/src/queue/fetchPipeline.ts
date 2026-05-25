import { getAdapter, getSourceRegistryEntry } from "@thor-crm/adapters";
import { normalizeListingObservation } from "../ingest/normalization";
import type { NormalizedListingObservation } from "../ingest/types";
import type { Env, FetchMessage } from "../runtime/env";
import { planAndPersistAlertDeliveriesForWorkflowListing, type AlertDeliveryRepositoryOptions } from "../workflow/alertDeliveryRepository";
import type { WorkflowListing } from "../workflow/types";
import { persistCanonicalMatch, type CanonicalListingRepositoryOptions } from "./canonicalListingRepository";
import { fetchHtml, type HtmlFetchOptions } from "./httpFetch";
import { upsertSourceListing, type SourceListingRepositoryOptions } from "./sourceListingRepository";

export interface FetchPipelineOptions
  extends SourceListingRepositoryOptions,
    CanonicalListingRepositoryOptions,
    AlertDeliveryRepositoryOptions,
    HtmlFetchOptions {}

export async function handleFetchMessage(message: FetchMessage, env: Env, options: FetchPipelineOptions = {}): Promise<void> {
  const source = getSourceRegistryEntry(message.sourceId);
  const maxBytes = source?.crawlConfig.maxDetailBytes ?? options.maxBytes;
  const fetchOptions = maxBytes === undefined ? options : { ...options, maxBytes };
  const html = message.fixtureHtml ?? (await fetchHtml(message.url, fetchOptions));
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
  const canonicalMatch = await persistCanonicalMatch(env, sourceListingId, normalized, options);
  await planAndPersistAlertDeliveriesForWorkflowListing(env, toWorkflowListing(canonicalMatch.canonicalListingId, normalized), normalized.observedAt, options);
}

function toWorkflowListing(canonicalListingId: string, observation: NormalizedListingObservation): WorkflowListing {
  const listing: WorkflowListing = {
    canonicalListingId,
    title: observation.title,
    propertyType: observation.propertyType,
    transactionType: observation.transactionType,
    searchText: observation.searchText
  };

  if (observation.priceEur !== undefined) listing.priceEur = observation.priceEur;
  if (observation.areaSqm !== undefined) listing.areaSqm = observation.areaSqm;
  if (observation.rooms !== undefined) listing.rooms = observation.rooms;
  if (observation.city) listing.city = observation.city;
  if (observation.district) listing.district = observation.district;
  if (observation.neighborhood) listing.neighborhood = observation.neighborhood;

  return listing;
}
