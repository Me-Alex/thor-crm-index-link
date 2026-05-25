import { describe, expect, it } from "vitest";
import { getSourceRegistryEntry, sourceRegistry } from "../src/sourceRegistry";

describe("sourceRegistry", () => {
  it("registers imobiliare as the only active Romanian portal source", () => {
    const expectedSourceIds = ["imobiliare", "storia", "olx", "publi24", "romimo", "homezz", "anuntul", "lajumate"];

    expect(sourceRegistry.map((source) => source.id)).toEqual(expect.arrayContaining(expectedSourceIds));

    const imobiliare = getSourceRegistryEntry("imobiliare");
    expect(imobiliare).toBeDefined();
    expect(imobiliare?.mode).toBe("on");
    expect(imobiliare?.crawlConfig.allowLiveCrawl).toBe(true);
    expect(imobiliare?.crawlConfig.reviewStatus).toBe("approved_initial_crawl");
    expect(imobiliare?.crawlConfig.maxDiscoverUrls).toBe(25);

    for (const sourceId of expectedSourceIds) {
      const source = getSourceRegistryEntry(sourceId);
      expect(source).toBeDefined();
      expect(source?.crawlConfig.rehostPolicy).toBe("index_link_only");
      expect(source?.crawlConfig.adapterStatus).toBe("generic_implemented_pending_source_review");
      expect(source?.robotsPolicyUrl).toMatch(/^https:\/\/.+\/robots\.txt$/);
      expect(source?.crawlConfig.seedUrls.length).toBeGreaterThan(0);
      expect(source?.crawlConfig.detailUrlPatterns.length).toBeGreaterThan(0);

      if (sourceId !== "imobiliare") {
        expect(source?.mode).toBe("off");
        expect(source?.crawlConfig.allowLiveCrawl).toBe(false);
        expect(source?.crawlConfig.reviewStatus).toBe("pending_review");
      }
    }
  });

  it("returns undefined for unknown sources instead of inventing a crawl policy", () => {
    expect(getSourceRegistryEntry("unknown-portal")).toBeUndefined();
  });
});
