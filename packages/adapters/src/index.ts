import {
  demoDetailFixtureHtmlByUrl,
  demoHouseFixtureHtml,
  demoListingFixtureHtml,
  demoSearchFixtureHtml
} from "./demoFixture";
import { demoPortalAdapter } from "./demoPortalAdapter";
import type { ListingDetailAdapter, ListingParseResult, ListingUrlParseResult, ParseContext } from "./types";

const adapters = new Map<string, ListingDetailAdapter>([[demoPortalAdapter.sourceId, demoPortalAdapter]]);

export { demoDetailFixtureHtmlByUrl, demoHouseFixtureHtml, demoListingFixtureHtml, demoSearchFixtureHtml };
export type { ListingDetailAdapter, ListingParseResult, ListingUrlParseResult, ParseContext };

export function getAdapter(sourceId: string): ListingDetailAdapter {
  const adapter = adapters.get(sourceId);
  if (!adapter) {
    throw new Error(`Adapter not found for source: ${sourceId}`);
  }
  return adapter;
}
