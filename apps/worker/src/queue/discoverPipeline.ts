import { getAdapter } from "@thor-crm/adapters";
import type { ListingDetailAdapter } from "@thor-crm/adapters";
import type { DiscoverMessage, Env, FetchMessage } from "../runtime/env";
import { fetchHtml, type HtmlFetchOptions } from "./httpFetch";

export interface DiscoverPipelineOptions extends HtmlFetchOptions {}

export async function handleDiscoverMessage(
  message: DiscoverMessage,
  env: Env,
  options: DiscoverPipelineOptions = {}
): Promise<void> {
  if (!env.FETCH_QUEUE) {
    throw new Error("fetch_queue_missing");
  }

  const adapter = getAdapter(message.sourceId);
  assertApprovedSeedUrl(message.seedUrl, adapter);

  const html = message.fixtureHtml ?? (await fetchHtml(message.seedUrl, options));
  const parsed = adapter.parseListingUrls(html, {
    sourceId: message.sourceId,
    url: message.seedUrl,
    observedAt: message.requestedAt
  });

  if (!parsed.ok) {
    throw new Error(`listing_discover_failed:${parsed.errors.join(",")}`);
  }

  for (const url of parsed.urls) {
    const fixtureHtml = adapter.detailFixtureHtmlByUrl?.[url];
    const fetchMessage: FetchMessage = {
      kind: "fetch",
      sourceId: message.sourceId,
      url,
      discoveredAt: message.requestedAt,
      ...(fixtureHtml ? { fixtureHtml } : {})
    };
    await env.FETCH_QUEUE.send(fetchMessage);
  }
}

function assertApprovedSeedUrl(seedUrl: string, adapter: ListingDetailAdapter): void {
  const normalizedSeedUrl = normalizeCrawlUrl(seedUrl);
  const approvedSeedUrls = adapter.approvedSeedUrls.map(normalizeCrawlUrl);

  if (!approvedSeedUrls.includes(normalizedSeedUrl)) {
    throw new Error("unapproved_seed_url");
  }
}

function normalizeCrawlUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("invalid_crawl_url");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("unsupported_crawl_url_protocol");
  }

  return url.toString();
}
