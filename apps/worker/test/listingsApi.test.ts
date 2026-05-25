import { describe, expect, it, vi } from "vitest";
import { handleRequest } from "../src/http/router";
import type { Env } from "../src/runtime/env";

describe("listings API", () => {
  it("returns normalized search-ready listings from source_listings without exposing secrets", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json([
        {
          id: "source-row-1",
          source_id: "demo",
          source_listing_key: "demo-apt-titan",
          url: "https://example.test/listings/demo-apt-titan",
          normalized_payload: {
            sourceId: "demo",
            sourceListingId: "demo-apt-titan",
            url: "https://example.test/listings/demo-apt-titan",
            title: "Apartament 2 camere Titan",
            description: "Etaj intermediar, aproape de metrou.",
            priceEur: 89500,
            areaSqm: 54,
            rooms: 2,
            propertyType: "apartment",
            transactionType: "sale",
            city: "bucuresti",
            district: "sector 3",
            neighborhood: "titan",
            floor: 4,
            agentName: "Agent Demo",
            phoneHash: "phone-hash",
            searchText: "apartament 2 camere titan",
            observedAt: "2026-05-25T00:00:00.000Z"
          },
          last_seen_at: "2026-05-25T00:00:00.000Z",
          last_fetched_at: "2026-05-25T00:00:00.000Z",
          crawl_status: "active",
          parse_error: null
        }
      ])
    );

    const response = await handleRequest(new Request("https://worker.test/api/listings?limit=10"), env(), {
      fetch: fetchMock
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    const body = await response.json();
    expect(body).toEqual({
      data: [
        {
          id: "source-row-1",
          recordType: "source_listing",
          sourceId: "demo",
          sourceListingKey: "demo-apt-titan",
          sourceListingId: "demo-apt-titan",
          canonicalListingId: null,
          title: "Apartament 2 camere Titan",
          descriptionExcerpt: "Etaj intermediar, aproape de metrou.",
          priceEur: 89500,
          areaSqm: 54,
          rooms: 2,
          floor: 4,
          propertyType: "apartment",
          transactionType: "sale",
          city: "bucuresti",
          district: "sector 3",
          neighborhood: "titan",
          url: "https://example.test/listings/demo-apt-titan",
          sourceLinks: [
            {
              sourceId: "demo",
              url: "https://example.test/listings/demo-apt-titan"
            }
          ],
          searchText: "apartament 2 camere titan",
          observedAt: "2026-05-25T00:00:00.000Z",
          lastSeenAt: "2026-05-25T00:00:00.000Z"
        }
      ],
      count: 1
    });
    expect(JSON.stringify(body)).not.toContain("service-role-secret");
    expect(JSON.stringify(body)).not.toContain("Agent Demo");
    expect(JSON.stringify(body)).not.toContain("phone-hash");

    const requestUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(requestUrl.pathname).toBe("/rest/v1/source_listings");
    expect(requestUrl.searchParams.get("limit")).toBe("10");
    expect(requestUrl.searchParams.get("crawl_status")).toBe("eq.active");
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      apikey: "service-role-secret",
      authorization: "Bearer service-role-secret"
    });
  });

  it("returns one listing by source listing id", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json([
        {
          id: "source-row-1",
          source_id: "demo",
          source_listing_key: "demo-apt-titan",
          url: "https://example.test/listings/demo-apt-titan",
          normalized_payload: {
            sourceId: "demo",
            url: "https://example.test/listings/demo-apt-titan",
            title: "Apartament 2 camere Titan",
            description: "",
            propertyType: "apartment",
            transactionType: "sale",
            searchText: "apartament 2 camere titan",
            observedAt: "2026-05-25T00:00:00.000Z"
          },
          last_seen_at: "2026-05-25T00:00:00.000Z",
          last_fetched_at: "2026-05-25T00:00:00.000Z",
          crawl_status: "active",
          parse_error: null
        }
      ])
    );

    const response = await handleRequest(new Request("https://worker.test/api/listings/source-row-1"), env(), {
      fetch: fetchMock
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        id: "source-row-1",
        title: "Apartament 2 camere Titan",
        url: "https://example.test/listings/demo-apt-titan"
      }
    });

    const requestUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(requestUrl.searchParams.get("id")).toBe("eq.source-row-1");
    expect(requestUrl.searchParams.get("limit")).toBe("1");
  });

  it("falls back to canonical_listings when a detail id is not a source listing id", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(
        Response.json([
          {
            id: "canonical-1",
            title: "Apartament 2 camere Titan",
            description_excerpt: "Etaj intermediar.",
            property_type: "apartment",
            transaction_type: "sale",
            price_eur: 89500,
            area_sqm: 54,
            rooms: 2,
            floor: 4,
            city: "bucuresti",
            district: "sector 3",
            neighborhood: "titan",
            status: "active",
            first_seen_at: "2026-05-24T00:00:00.000Z",
            last_seen_at: "2026-05-25T00:00:00.000Z"
          }
        ])
      );

    const response = await handleRequest(new Request("https://worker.test/api/listings/canonical-1"), env(), {
      fetch: fetchMock
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        id: "canonical-1",
        recordType: "canonical_listing",
        title: "Apartament 2 camere Titan",
        sourceLinks: []
      }
    });
    expect(new URL(String(fetchMock.mock.calls[1]?.[0])).pathname).toBe("/rest/v1/canonical_listings");
  });

  it("returns 502 when Supabase REST fails", async () => {
    const response = await handleRequest(new Request("https://worker.test/api/listings"), env(), {
      fetch: vi.fn(async () => Response.json({ message: "upstream failed" }, { status: 503 }))
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "supabase_rest_error",
      message: "Unable to read listings"
    });
  });

  it("returns 502 when Supabase credentials are not configured", async () => {
    const response = await handleRequest(
      new Request("https://worker.test/api/listings"),
      { ...env(), SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: "" },
      { fetch: vi.fn() }
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "supabase_rest_error",
      message: "Unable to read listings"
    });
  });
});

function env(): Env {
  return {
    ENVIRONMENT: "test",
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-secret",
    ADMIN_API_KEY: "admin"
  };
}
