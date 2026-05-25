import { getAdapter, getSourceRegistryEntry } from "@thor-crm/adapters";
import type { ListingDetailAdapter, SourceRegistryEntry } from "@thor-crm/adapters";
import { isRobotsAllowed, parseRobotsTxt } from "../crawler/robots";
import { parseSitemapUrls } from "../crawler/sitemap";
import type { DiscoverMessage, Env, FetchMessage } from "../runtime/env";
import { crawlerUserAgent, fetchHtml, type HtmlFetchOptions } from "./httpFetch";

export interface DiscoverPipelineOptions extends HtmlFetchOptions {
  sourceLookup?: (sourceId: string) => SourceRegistryEntry | undefined;
}

export async function handleDiscoverMessage(
  message: DiscoverMessage,
  env: Env,
  options: DiscoverPipelineOptions = {}
): Promise<void> {
  if (!env.FETCH_QUEUE) {
    throw new Error("fetch_queue_missing");
  }

  const source = (options.sourceLookup ?? getSourceRegistryEntry)(message.sourceId);
  if (source && source.id !== "demo" && (source.mode !== "on" || !source.crawlConfig.allowLiveCrawl)) {
    console.warn("discover_skipped_source_inactive", {
      sourceId: source.id,
      mode: source.mode,
      reviewStatus: source.crawlConfig.reviewStatus,
      allowLiveCrawl: source.crawlConfig.allowLiveCrawl
    });
    return;
  }

  const adapter = getAdapter(message.sourceId);
  assertApprovedSeedUrl(message.seedUrl, adapter);

  if (source && source.id !== "demo") {
    await assertRobotsAllowed(source, message.seedUrl, options);
  }

  const html = await discoverSeedBody(message, source, options);
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

async function discoverSeedBody(message: DiscoverMessage, source: SourceRegistryEntry | undefined, options: DiscoverPipelineOptions): Promise<string> {
  const maxBytes = source?.crawlConfig.maxSitemapBytes ?? options.maxBytes;
  const fetchOptions = maxBytes === undefined ? options : { ...options, maxBytes };
  const body = message.fixtureHtml ?? (await fetchHtml(message.seedUrl, fetchOptions));
  if (!source || source.crawlConfig.crawlStrategy !== "sitemap") {
    return body;
  }

  const urls = parseSitemapUrls(body, {
    baseUrl: source.baseUrl,
    limit: source.crawlConfig.maxDiscoverUrls
  });
  return `<urlset>${urls.map((url) => `<url><loc>${escapeXml(url)}</loc></url>`).join("")}</urlset>`;
}

async function assertRobotsAllowed(source: SourceRegistryEntry, seedUrl: string, options: DiscoverPipelineOptions): Promise<void> {
  const robotsTxt = await fetchHtml(source.robotsPolicyUrl, options);
  const policy = parseRobotsTxt(robotsTxt);
  const decision = isRobotsAllowed(policy, crawlerUserAgent, seedUrl);
  if (!decision.allowed) {
    throw new Error(`robots_disallowed_seed_url:${decision.matchedRule ?? "unknown"}`);
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

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
