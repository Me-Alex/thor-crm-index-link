import { describe, expect, it, vi } from "vitest";
import { fetchHtml } from "../src/queue/httpFetch";

describe("fetchHtml", () => {
  it("allows callers to raise the byte limit for reviewed sitemap fetches", async () => {
    const body = "x".repeat(1_000_001);
    const fetchMock = vi.fn(async () => new Response(body, { headers: { "content-length": String(body.length) } }));

    await expect(fetchHtml("https://example.test/sitemap.xml", { fetch: fetchMock, maxBytes: 1_000_001 })).resolves.toBe(body);
  });

  it("keeps the default response size limit for regular HTML fetches", async () => {
    const body = "x".repeat(1_000_001);
    const fetchMock = vi.fn(async () => new Response(body, { headers: { "content-length": String(body.length) } }));

    await expect(fetchHtml("https://example.test/listing", { fetch: fetchMock })).rejects.toThrow("html_fetch_too_large");
  });
});
