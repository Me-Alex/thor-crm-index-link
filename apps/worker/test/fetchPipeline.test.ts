import { describe, expect, it, vi } from "vitest";
import { demoHouseFixtureHtml, demoListingFixtureHtml, demoSearchFixtureHtml } from "@thor-crm/adapters";
import { handleDiscoverMessage } from "../src/queue/discoverPipeline";
import { handleQueueBatch } from "../src/queue/handler";
import { handleFetchMessage } from "../src/queue/fetchPipeline";
import type { Env } from "../src/runtime/env";

describe("handleFetchMessage", () => {
  it("parses a fixture listing and persists a normalized SourceListing", async () => {
    const writes: unknown[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      writes.push({
        url,
        method: init?.method,
        body: init?.body ? JSON.parse(String(init.body)) : undefined
      });

      if (url.includes("/rest/v1/canonical_listings") && init?.method === "GET") {
        return Response.json([]);
      }
      if (url.includes("/rest/v1/canonical_listings")) {
        return Response.json([{ id: "canonical-listing-id" }], { status: 201 });
      }
      return new Response(JSON.stringify([{ id: "source-listing-id" }]), {
        status: 201,
        headers: { "content-type": "application/json" }
      });
    });

    await handleFetchMessage(
      {
        kind: "fetch",
        sourceId: "demo",
        url: "https://example.test/listings/demo-apt-titan",
        discoveredAt: "2026-05-25T00:00:00.000Z",
        fixtureHtml: demoListingFixtureHtml
      },
      env(),
      { fetch: fetchMock }
    );

    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(writes[0]).toEqual({
      url: "https://project.supabase.co/rest/v1/source_listings?on_conflict=source_id%2Csource_listing_key",
      method: "POST",
      body: {
        source_id: "demo",
        source_listing_key: "demo-apt-titan",
        url: "https://example.test/listings/demo-apt-titan",
        normalized_payload: expect.objectContaining({
          title: "Apartament 2 camere Titan",
          priceEur: 89500,
          areaSqm: 54,
          rooms: 2,
          city: "bucuresti",
          district: "sector 3",
          neighborhood: "titan"
        }),
        content_hash: expect.any(String),
        crawl_status: "active",
        last_fetched_at: "2026-05-25T00:00:00.000Z",
        last_seen_at: "2026-05-25T00:00:00.000Z",
        parse_error: null
      }
    });
  });

  it("fetches approved detail HTML when no fixture is provided", async () => {
    const calls: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(String(input));

      if (String(input) === "https://example.test/listings/demo-apt-titan") {
        expect(init?.headers).toEqual({
          "user-agent": "ThorCRMIndexLink/0.1 (+https://github.com/Me-Alex/thor-crm-index-link)"
        });
        return new Response(demoListingFixtureHtml, { status: 200 });
      }

      if (String(input).includes("/rest/v1/canonical_listings") && init?.method === "GET") {
        return Response.json([]);
      }
      if (String(input).includes("/rest/v1/canonical_listings")) {
        return Response.json([{ id: "canonical-listing-id" }], { status: 201 });
      }

      return Response.json([{ id: "source-listing-id" }], { status: 201 });
    });

    await handleFetchMessage(
      {
        kind: "fetch",
        sourceId: "demo",
        url: "https://example.test/listings/demo-apt-titan",
        discoveredAt: "2026-05-25T00:00:00.000Z"
      },
      env(),
      { fetch: fetchMock }
    );

    expect(calls).toEqual([
      "https://example.test/listings/demo-apt-titan",
      "https://project.supabase.co/rest/v1/source_listings?on_conflict=source_id%2Csource_listing_key",
      expect.stringContaining("https://project.supabase.co/rest/v1/canonical_listings"),
      "https://project.supabase.co/rest/v1/canonical_listings",
      "https://project.supabase.co/rest/v1/canonical_listing_links?on_conflict=source_listing_id",
      "https://project.supabase.co/rest/v1/listing_history"
    ]);
  });

  it("fails before database writes when Supabase write config is missing", async () => {
    const fetchMock = vi.fn();

    await expect(
      handleFetchMessage(
        {
          kind: "fetch",
          sourceId: "demo",
          url: "https://example.test/listings/demo-apt-titan",
          discoveredAt: "2026-05-25T00:00:00.000Z",
          fixtureHtml: demoListingFixtureHtml
        },
        { ...env(), SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: "" },
        { fetch: fetchMock }
      )
    ).rejects.toThrow("source_listing_repository_config_missing");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates a canonical listing, source link, and history row when no duplicate candidate exists", async () => {
    const calls: Array<{ url: string; method?: string; body?: unknown }> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({
        url,
        method: init?.method,
        body: init?.body ? JSON.parse(String(init.body)) : undefined
      });

      if (url.includes("/rest/v1/source_listings")) {
        return Response.json([{ id: "source-listing-id" }], { status: 201 });
      }
      if (url.includes("/rest/v1/canonical_listings") && init?.method === "GET") {
        return Response.json([]);
      }
      if (url.includes("/rest/v1/canonical_listings")) {
        return Response.json([{ id: "canonical-listing-id" }], { status: 201 });
      }

      return Response.json([{ id: "write-ok" }], { status: 201 });
    });

    await handleFetchMessage(
      {
        kind: "fetch",
        sourceId: "demo",
        url: "https://example.test/listings/demo-apt-titan",
        discoveredAt: "2026-05-25T00:00:00.000Z",
        fixtureHtml: demoListingFixtureHtml
      },
      env(),
      { fetch: fetchMock }
    );

    expect(calls.map((call) => new URL(call.url).pathname)).toEqual([
      "/rest/v1/source_listings",
      "/rest/v1/canonical_listings",
      "/rest/v1/canonical_listings",
      "/rest/v1/canonical_listing_links",
      "/rest/v1/listing_history"
    ]);
    expect(calls[2]?.body).toMatchObject({
      title: "Apartament 2 camere Titan",
      property_type: "apartment",
      transaction_type: "sale",
      price_eur: 89500,
      area_sqm: 54,
      city: "bucuresti",
      status: "active"
    });
    expect(calls[3]?.body).toMatchObject({
      source_listing_id: "source-listing-id",
      canonical_listing_id: "canonical-listing-id",
      match_score: 1,
      match_reasons: ["new_canonical_listing"]
    });
    expect(calls[4]?.body).toMatchObject({
      canonical_listing_id: "canonical-listing-id",
      source_listing_id: "source-listing-id",
      price_eur: 89500,
      availability_status: "active"
    });
  });

  it("links a source listing to an existing canonical listing when the match score is conservative", async () => {
    const calls: Array<{ url: string; method?: string; body?: unknown }> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({
        url,
        method: init?.method,
        body: init?.body ? JSON.parse(String(init.body)) : undefined
      });

      if (url.includes("/rest/v1/source_listings")) {
        return Response.json([{ id: "source-listing-id" }], { status: 201 });
      }
      if (url.includes("/rest/v1/canonical_listings") && init?.method === "GET") {
        return Response.json([
          {
            id: "canonical-existing-id",
            title: "Apartament decomandat 2 camere Titan",
            price_eur: 90000,
            area_sqm: 55,
            rooms: 2,
            floor: 4,
            property_type: "apartment",
            transaction_type: "sale",
            city: "bucuresti",
            district: "sector 3",
            neighborhood: "titan",
            description_excerpt: "Etaj intermediar."
          }
        ]);
      }

      return Response.json([{ id: "write-ok" }], { status: 201 });
    });

    await handleFetchMessage(
      {
        kind: "fetch",
        sourceId: "demo",
        url: "https://example.test/listings/demo-apt-titan",
        discoveredAt: "2026-05-25T00:00:00.000Z",
        fixtureHtml: demoListingFixtureHtml
      },
      env(),
      { fetch: fetchMock }
    );

    expect(calls.map((call) => new URL(call.url).pathname)).toEqual([
      "/rest/v1/source_listings",
      "/rest/v1/canonical_listings",
      "/rest/v1/canonical_listings",
      "/rest/v1/canonical_listing_links",
      "/rest/v1/listing_history"
    ]);
    expect(calls[2]).toMatchObject({
      method: "PATCH",
      body: {
        last_seen_at: "2026-05-25T00:00:00.000Z",
        status: "active"
      }
    });
    expect(calls[3]?.body).toMatchObject({
      source_listing_id: "source-listing-id",
      canonical_listing_id: "canonical-existing-id",
      match_reasons: expect.arrayContaining(["same_location", "price_close", "area_close"])
    });
    expect(calls[3]?.body).not.toMatchObject({
      match_reasons: ["new_canonical_listing"]
    });
  });
});

describe("handleDiscoverMessage", () => {
  it("fetches an approved seed URL and enqueues discovered detail links", async () => {
    const sent: unknown[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("https://example.test/listings");
      expect(init?.headers).toEqual({
        "user-agent": "ThorCRMIndexLink/0.1 (+https://github.com/Me-Alex/thor-crm-index-link)"
      });
      return new Response(demoSearchFixtureHtml, { status: 200 });
    });
    const testEnv = {
      ...env(),
      FETCH_QUEUE: {
        send: async (message: unknown) => {
          sent.push(message);
        }
      } as Queue
    };

    await handleDiscoverMessage(
      {
        kind: "discover",
        sourceId: "demo",
        seedUrl: "https://example.test/listings",
        requestedAt: "2026-05-25T00:00:00.000Z"
      },
      testEnv,
      { fetch: fetchMock }
    );

    expect(sent).toEqual([
      {
        kind: "fetch",
        sourceId: "demo",
        url: "https://example.test/listings/demo-apt-titan",
        discoveredAt: "2026-05-25T00:00:00.000Z",
        fixtureHtml: demoListingFixtureHtml
      },
      {
        kind: "fetch",
        sourceId: "demo",
        url: "https://example.test/listings/demo-house-borhanci",
        discoveredAt: "2026-05-25T00:00:00.000Z",
        fixtureHtml: demoHouseFixtureHtml
      }
    ]);
  });

  it("uses provided discover fixture HTML without fetching the seed URL", async () => {
    const sent: unknown[] = [];
    const fetchMock = vi.fn();
    const testEnv = {
      ...env(),
      FETCH_QUEUE: {
        send: async (message: unknown) => {
          sent.push(message);
        }
      } as Queue
    };

    await handleDiscoverMessage(
      {
        kind: "discover",
        sourceId: "demo",
        seedUrl: "https://example.test/listings",
        requestedAt: "2026-05-25T00:00:00.000Z",
        fixtureHtml: demoSearchFixtureHtml
      },
      testEnv,
      { fetch: fetchMock }
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(sent).toHaveLength(2);
  });

  it("rejects unapproved seed URLs before fetching or enqueueing links", async () => {
    const sent: unknown[] = [];
    const fetchMock = vi.fn(async () => new Response(demoSearchFixtureHtml, { status: 200 }));
    const testEnv = {
      ...env(),
      FETCH_QUEUE: {
        send: async (message: unknown) => {
          sent.push(message);
        }
      } as Queue
    };

    await expect(
      handleDiscoverMessage(
        {
          kind: "discover",
          sourceId: "demo",
          seedUrl: "https://unapproved.example.test/listings",
          requestedAt: "2026-05-25T00:00:00.000Z"
        },
        testEnv,
        { fetch: fetchMock }
      )
    ).rejects.toThrow("unapproved_seed_url");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(sent).toEqual([]);
  });
});

describe("handleQueueBatch", () => {
  it("acks fetch messages after the fixture pipeline persists them", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/rest/v1/canonical_listings") && init?.method === "GET") {
        return Response.json([]);
      }
      if (url.includes("/rest/v1/canonical_listings")) {
        return Response.json([{ id: "canonical-listing-id" }], { status: 201 });
      }
      return Response.json([{ id: "source-listing-id" }], { status: 201 });
    });
    const ack = vi.fn();
    const retry = vi.fn();
    globalThis.fetch = fetchMock as typeof fetch;

    try {
      await handleQueueBatch(
        {
          messages: [
            {
              id: "message-1",
              body: {
                kind: "fetch",
                sourceId: "demo",
                url: "https://example.test/listings/demo-apt-titan",
                discoveredAt: "2026-05-25T00:00:00.000Z",
                fixtureHtml: demoListingFixtureHtml
              },
              ack,
              retry
            }
          ]
        } as unknown as MessageBatch,
        env()
      );
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(ack).toHaveBeenCalledOnce();
    expect(retry).not.toHaveBeenCalled();
  });
});

function env(): Env {
  return {
    ENVIRONMENT: "test",
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role",
    ADMIN_API_KEY: "admin"
  };
}
