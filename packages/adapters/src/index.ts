import {
  demoDetailFixtureHtmlByUrl,
  demoHouseFixtureHtml,
  demoListingFixtureHtml,
  demoSearchFixtureHtml
} from "./demoFixture";
import { demoPortalAdapter } from "./demoPortalAdapter";
import { createGenericRealEstateAdapter } from "./genericRealEstateAdapter";
import { getGenericPortalSourceEntries, getSourceRegistryEntry, sourceRegistry } from "./sourceRegistry";
import type { SourceRegistryEntry } from "./sourceRegistry";
import type { ListingDetailAdapter, ListingParseResult, ListingUrlParseResult, ParseContext } from "./types";

const adapters = new Map<string, ListingDetailAdapter>([
  [demoPortalAdapter.sourceId, demoPortalAdapter],
  ...getGenericPortalSourceEntries().map((source) => [source.id, createGenericRealEstateAdapter(source)] as const)
]);

export { demoDetailFixtureHtmlByUrl, demoHouseFixtureHtml, demoListingFixtureHtml, demoSearchFixtureHtml };
export { getSourceRegistryEntry, sourceRegistry };
export type { ListingDetailAdapter, ListingParseResult, ListingUrlParseResult, ParseContext, SourceRegistryEntry };

export function getAdapterIfAvailable(sourceId: string): ListingDetailAdapter | undefined {
  return adapters.get(sourceId);
}

export function getAdapter(sourceId: string): ListingDetailAdapter {
  const adapter = adapters.get(sourceId);
  if (!adapter) {
    throw new Error(`Adapter not found for source: ${sourceId}`);
  }
  return adapter;
}
