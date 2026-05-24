import { demoListingFixtureHtml } from "./demoFixture";
import { demoPortalAdapter } from "./demoPortalAdapter";
import type { ListingDetailAdapter, ListingParseResult, ParseContext } from "./types";

const adapters = new Map<string, ListingDetailAdapter>([[demoPortalAdapter.sourceId, demoPortalAdapter]]);

export { demoListingFixtureHtml };
export type { ListingDetailAdapter, ListingParseResult, ParseContext };

export function getAdapter(sourceId: string): ListingDetailAdapter {
  const adapter = adapters.get(sourceId);
  if (!adapter) {
    throw new Error(`Adapter not found for source: ${sourceId}`);
  }
  return adapter;
}
