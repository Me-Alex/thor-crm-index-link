import type { SourceRegistryEntry } from "@thor-crm/adapters";
import type { DiscoverMessage } from "../runtime/env";

export function buildScheduledDiscoverMessages(sources: readonly SourceRegistryEntry[], requestedAt: string): DiscoverMessage[] {
  return sources
    .filter((source) => source.mode === "on" && source.crawlConfig.allowLiveCrawl)
    .flatMap((source) => discoverSeedUrls(source).map((seedUrl) => ({ kind: "discover" as const, sourceId: source.id, seedUrl, requestedAt })));
}

function discoverSeedUrls(source: SourceRegistryEntry): readonly string[] {
  if (source.crawlConfig.crawlStrategy === "sitemap" && source.crawlConfig.sitemapUrls.length > 0) {
    return source.crawlConfig.sitemapUrls;
  }
  return source.crawlConfig.seedUrls;
}
