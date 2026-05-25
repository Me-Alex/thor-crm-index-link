import { describe, expect, it } from "vitest";
import { getSourceRegistryEntry, sourceRegistry } from "../src/sourceRegistry";

describe("sourceRegistry", () => {
  it("registers every reviewed Romanian portal source as active with conservative crawl limits", () => {
    const expectedSourceIds = ["imobiliare", "storia", "olx", "publi24", "romimo", "homezz", "anuntul", "lajumate"];

    expect(sourceRegistry.map((source) => source.id)).toEqual(expect.arrayContaining(expectedSourceIds));

    for (const sourceId of expectedSourceIds) {
      const source = getSourceRegistryEntry(sourceId);
      expect(source).toBeDefined();
      expect(source?.mode).toBe("on");
      expect(source?.crawlConfig.allowLiveCrawl).toBe(true);
      expect(source?.crawlConfig.reviewStatus).toBe("approved_initial_crawl");
      expect(source?.crawlConfig.rehostPolicy).toBe("index_link_only");
      expect(source?.crawlConfig.adapterStatus).toBe("generic_implemented_pending_source_review");
      expect(source?.robotsPolicyUrl).toMatch(/^https:\/\/.+\/robots\.txt$/);
      expect(source?.crawlConfig.seedUrls.length).toBeGreaterThan(0);
      expect(source?.crawlConfig.detailUrlPatterns.length).toBeGreaterThan(0);
      expect(source?.crawlConfig.maxDiscoverUrls).toBeLessThanOrEqual(25);
    }
  });

  it("returns undefined for unknown sources instead of inventing a crawl policy", () => {
    expect(getSourceRegistryEntry("unknown-portal")).toBeUndefined();
  });
});
