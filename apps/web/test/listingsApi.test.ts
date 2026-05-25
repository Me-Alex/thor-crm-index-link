import { describe, expect, it, vi } from "vitest";
import {
  fetchWorkerHealth,
  fetchWorkerListings,
  ListingsApiError,
  resolveWorkerApiBaseUrl
} from "../src/lib/listingsApi";

describe("resolveWorkerApiBaseUrl", () => {
  it("normalizes configured Worker URLs", () => {
    expect(resolveWorkerApiBaseUrl(" https://worker.example.dev/ ")).toBe("https://worker.example.dev");
  });

  it("returns undefined when the Worker URL is missing", () => {
    expect(resolveWorkerApiBaseUrl("")).toBeUndefined();
  });
});

describe("fetchWorkerListings", () => {
  it("loads listings from the Worker API contract", async () => {
    const workerListing = {
      id: "source-row-1",
      recordType: "source_listing",
      sourceId: "demo",
      sourceListingKey: "demo-apt-titan",
      sourceListingId: "demo-apt-titan",
      canonicalListingId: null,
      title: "Apartament 2 camere Titan",
      descriptionExcerpt: "Text scurt pentru index + link.",
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
      sourceLinks: [{ sourceId: "demo", url: "https://example.test/listings/demo-apt-titan" }],
      searchText: "apartament titan",
      observedAt: "2026-05-25T00:00:00.000Z",
      lastSeenAt: "2026-05-25T00:00:00.000Z"
    };
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [workerListing], count: 1 }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    await expect(fetchWorkerListings({ baseUrl: "https://worker.example.dev/", fetchImpl })).resolves.toMatchObject([
      {
        id: "demo-apt-titan",
        title: "Apartament 2 camere Titan",
        city: "bucuresti",
        district: "sector 3",
        neighborhood: "titan",
        priceEur: 89500,
        areaSqm: 54,
        rooms: 2,
        floor: 4,
        status: "Nou",
        assignee: "Neasignat",
        sources: [
          {
            name: "Demo Source",
            url: "https://example.test/listings/demo-apt-titan",
            matchScore: 1
          }
        ]
      }
    ]);
    expect(fetchImpl).toHaveBeenCalledWith("https://worker.example.dev/api/listings", expect.any(Object));
  });

  it("fails before fetch when VITE_WORKER_API_URL is not configured", async () => {
    const fetchImpl = vi.fn();

    await expect(fetchWorkerListings({ baseUrl: "", fetchImpl })).rejects.toThrow(ListingsApiError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("wraps non-ok responses as client errors", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("nope", { status: 503 }));

    await expect(fetchWorkerListings({ baseUrl: "https://worker.example.dev", fetchImpl })).rejects.toThrow(
      /503/
    );
  });
});

describe("fetchWorkerHealth", () => {
  it("loads Worker health JSON through the same configured API client", async () => {
    const health = { ok: true, source: "worker" };
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(health), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    await expect(fetchWorkerHealth({ baseUrl: "https://worker.example.dev", fetchImpl })).resolves.toEqual(health);
    expect(fetchImpl).toHaveBeenCalledWith("https://worker.example.dev/health", expect.any(Object));
  });
});
