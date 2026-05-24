import { describe, expect, it, vi } from "vitest";
import { demoListingFixtureHtml } from "@thor-crm/adapters";
import { handleQueueBatch } from "../src/queue/handler";
import { handleFetchMessage } from "../src/queue/fetchPipeline";
import type { Env } from "../src/runtime/env";

describe("handleFetchMessage", () => {
  it("parses a fixture listing and persists a normalized SourceListing", async () => {
    const writes: unknown[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      writes.push({
        url: String(input),
        method: init?.method,
        body: JSON.parse(String(init?.body))
      });

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

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(writes).toEqual([
      {
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
      }
    ]);
  });
});

describe("handleQueueBatch", () => {
  it("acks fetch messages after the fixture pipeline persists them", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([{ id: "source-listing-id" }]), { status: 201 }));
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

    expect(fetchMock).toHaveBeenCalledOnce();
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
