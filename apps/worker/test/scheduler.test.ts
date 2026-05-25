import { describe, expect, it } from "vitest";
import { getSourceRegistryEntry, sourceRegistry } from "@thor-crm/adapters";
import { buildScheduledDiscoverMessages } from "../src/crawler/scheduler";

describe("crawler scheduler", () => {
  it("builds discover messages only for active sources explicitly allowed for live crawling", () => {
    const messages = buildScheduledDiscoverMessages(sourceRegistry, "2026-05-25T00:00:00.000Z");

    expect(messages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "discover",
        sourceId: "imobiliare",
        seedUrl: "https://www.imobiliare.ro/sitemap-listings-apartments-for-rent-bucuresti-ro.xml",
        requestedAt: "2026-05-25T00:00:00.000Z"
      }),
      expect.objectContaining({ sourceId: "storia", seedUrl: "https://www.storia.ro/ro/rezultate/inchiriere/apartament/bucuresti" }),
      expect.objectContaining({ sourceId: "olx", seedUrl: "https://www.olx.ro/imobiliare/apartamente-garsoniere-de-inchiriat/bucuresti/" }),
      expect.objectContaining({ sourceId: "publi24", seedUrl: "https://www.publi24.ro/Sitemaps/sitemap-publi24-articles-by-category-Imobiliare-1.xml" }),
      expect.objectContaining({ sourceId: "romimo", seedUrl: "https://www.romimo.ro/Sitemaps/sitemap-romimo-articles-by-category-Imobiliare-1.xml" }),
      expect.objectContaining({ sourceId: "homezz", seedUrl: "https://homezz.ro/sitemap/sitemap-anunturi-apartamente-vanzare.xml" }),
      expect.objectContaining({ sourceId: "anuntul", seedUrl: "https://www.anuntul.ro/anunturi-imobiliare-inchirieri/" }),
      expect.objectContaining({ sourceId: "lajumate", seedUrl: "https://lajumate.ro/sitemap-anunt-1.xml" })
    ]));
    expect(messages.some((message) => message.sourceId === "demo")).toBe(false);
  });
});
