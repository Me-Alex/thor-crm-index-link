import { describe, expect, it } from "vitest";
import { parseSitemapUrls } from "../src/crawler/sitemap";

describe("sitemap parser", () => {
  it("extracts same-origin HTTP URLs up to the requested limit", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset>
  <url><loc>https://example.test/listings/a</loc></url>
  <url><loc>https://example.test/listings/b?utm_source=feed</loc></url>
  <url><loc>https://other.test/listings/c</loc></url>
  <url><loc>javascript:alert(1)</loc></url>
</urlset>`;

    expect(parseSitemapUrls(xml, { baseUrl: "https://example.test", limit: 2 })).toEqual([
      "https://example.test/listings/a",
      "https://example.test/listings/b?utm_source=feed"
    ]);
  });

  it("deduplicates XML loc entries and decodes escaped ampersands", () => {
    const xml = `
<sitemapindex>
  <sitemap><loc>https://example.test/sitemap-a.xml?x=1&amp;y=2</loc></sitemap>
  <sitemap><loc>https://example.test/sitemap-a.xml?x=1&amp;y=2</loc></sitemap>
</sitemapindex>`;

    expect(parseSitemapUrls(xml, { baseUrl: "https://example.test", limit: 10 })).toEqual([
      "https://example.test/sitemap-a.xml?x=1&y=2"
    ]);
  });
});
