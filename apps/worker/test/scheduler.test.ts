import { describe, expect, it } from "vitest";
import { getSourceRegistryEntry } from "@thor-crm/adapters";
import { buildScheduledDiscoverMessages } from "../src/crawler/scheduler";

describe("crawler scheduler", () => {
  it("builds discover messages only for active sources explicitly allowed for live crawling", () => {
    const olx = getSourceRegistryEntry("olx");
    if (!olx) {
      throw new Error("missing_test_source");
    }

    const messages = buildScheduledDiscoverMessages([getSourceRegistryEntry("imobiliare"), olx].filter(Boolean), "2026-05-25T00:00:00.000Z");

    expect(messages).toEqual([
      {
        kind: "discover",
        sourceId: "imobiliare",
        seedUrl: "https://www.imobiliare.ro/sitemap-listings-apartments-for-rent-bucuresti-ro.xml",
        requestedAt: "2026-05-25T00:00:00.000Z"
      }
    ]);
  });
});
