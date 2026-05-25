import { describe, expect, it } from "vitest";
import { planAndPersistAlertDeliveriesForListing } from "../src/workflow/alertDeliveryRepository";
import { evaluateSavedSearchCriteria, planAlertDeliveries } from "../src/workflow/alerts";
import type { Env } from "../src/runtime/env";
import type { SavedSearch, WorkflowListing } from "../src/workflow/types";

const titanListing: WorkflowListing = {
  canonicalListingId: "canon-titan-1",
  title: "Apartament 2 camere Titan",
  priceEur: 89500,
  areaSqm: 54,
  rooms: 2,
  propertyType: "apartment",
  transactionType: "sale",
  city: "bucuresti",
  district: "sector 3",
  neighborhood: "titan",
  searchText: "apartament 2 camere titan metrou parc"
};

const matchingSearch: SavedSearch = {
  savedSearchId: "search-1",
  tenantId: "tenant-a",
  name: "Titan 2 camere",
  alertsEnabled: true,
  criteria: {
    cities: ["bucuresti"],
    districts: ["sector 3"],
    neighborhoods: ["titan"],
    propertyTypes: ["apartment"],
    transactionTypes: ["sale"],
    priceEur: { min: 80000, max: 95000 },
    areaSqm: { min: 50, max: 60 },
    rooms: { min: 2, max: 2 },
    keywords: ["metrou"]
  }
};

describe("evaluateSavedSearchCriteria", () => {
  it("matches a normalized listing when all supplied criteria are satisfied", () => {
    const result = evaluateSavedSearchCriteria(titanListing, matchingSearch.criteria);

    expect(result.matches).toBe(true);
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        "city_match",
        "district_match",
        "neighborhood_match",
        "property_type_match",
        "transaction_type_match",
        "price_range_match",
        "area_range_match",
        "rooms_range_match",
        "keyword_match"
      ])
    );
  });

  it("rejects listings outside criteria without relying on tenant workflow state", () => {
    const result = evaluateSavedSearchCriteria(
      {
        ...titanListing,
        canonicalListingId: "canon-cluj-1",
        city: "cluj napoca",
        district: "centru",
        neighborhood: "central",
        searchText: "apartament centru"
      },
      matchingSearch.criteria
    );

    expect(result.matches).toBe(false);
    expect(result.reasons).toContain("city_mismatch");
  });
});

describe("planAlertDeliveries", () => {
  it("plans alert deliveries only for saved searches owned by the requested tenant", () => {
    const result = planAlertDeliveries({
      tenantId: "tenant-a",
      changedListings: [titanListing],
      savedSearches: [
        matchingSearch,
        {
          ...matchingSearch,
          savedSearchId: "search-other-tenant",
          tenantId: "tenant-b"
        }
      ],
      existingDeliveries: [],
      evaluatedAt: "2026-05-25T08:00:00.000Z"
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      tenantId: "tenant-a",
      savedSearchId: "search-1",
      canonicalListingId: "canon-titan-1",
      channel: "in_app"
    });
  });

  it("does not plan a duplicate alert for the same tenant, search, and listing", () => {
    const result = planAlertDeliveries({
      tenantId: "tenant-a",
      changedListings: [titanListing],
      savedSearches: [matchingSearch],
      existingDeliveries: [
        {
          tenantId: "tenant-a",
          savedSearchId: "search-1",
          canonicalListingId: "canon-titan-1"
        }
      ],
      evaluatedAt: "2026-05-25T08:00:00.000Z"
    });

    expect(result).toEqual([]);
  });
});

describe("planAndPersistAlertDeliveriesForListing", () => {
  it("loads saved searches and inserts pending in-app alert deliveries for matching tenants", async () => {
    const calls: Array<{ url: string; method?: string; body?: unknown }> = [];
    const fetchMock = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({
        url,
        method: init?.method,
        body: init?.body ? JSON.parse(String(init.body)) : undefined
      });

      if (url.includes("/rest/v1/canonical_listings")) {
        return Response.json([
          {
            id: "canon-titan-1",
            title: "Apartament 2 camere Titan",
            description_excerpt: "Aproape de metrou.",
            property_type: "apartment",
            transaction_type: "sale",
            price_eur: 89500,
            area_sqm: 54,
            rooms: 2,
            city: "bucuresti",
            district: "sector 3",
            neighborhood: "titan"
          }
        ]);
      }
      if (url.includes("/rest/v1/alerts")) {
        return Response.json([
          {
            id: "alert-1",
            org_id: "tenant-a",
            saved_search_id: "search-1",
            channel: "in_app",
            is_enabled: true
          }
        ]);
      }
      if (url.includes("/rest/v1/saved_searches")) {
        return Response.json([
          {
            id: "search-1",
            org_id: "tenant-a",
            name: "Titan 2 camere",
            criteria: matchingSearch.criteria
          }
        ]);
      }
      if (url.includes("/rest/v1/alert_deliveries") && init?.method === "GET") {
        return Response.json([]);
      }
      if (url.includes("/rest/v1/alert_deliveries")) {
        return Response.json([], { status: 201 });
      }

      throw new Error(`unexpected_url:${url}`);
    };

    await expect(
      planAndPersistAlertDeliveriesForListing(env(), "canon-titan-1", "2026-05-25T08:00:00.000Z", {
        fetch: fetchMock
      })
    ).resolves.toBe(1);

    expect(calls.map((call) => new URL(call.url).pathname)).toEqual([
      "/rest/v1/canonical_listings",
      "/rest/v1/alerts",
      "/rest/v1/saved_searches",
      "/rest/v1/alert_deliveries",
      "/rest/v1/alert_deliveries"
    ]);
    expect(calls[4]).toMatchObject({
      method: "POST",
      body: [
        {
          org_id: "tenant-a",
          alert_id: "alert-1",
          canonical_listing_id: "canon-titan-1",
          status: "pending",
          payload: {
            delivery_key: "tenant-a:search-1:canon-titan-1",
            evaluated_at: "2026-05-25T08:00:00.000Z",
            matched_reasons: expect.arrayContaining(["city_match", "keyword_match"])
          }
        }
      ]
    });
  });

  it("does not insert duplicate alert deliveries for the same tenant search and listing", async () => {
    const calls: Array<{ url: string; method?: string }> = [];
    const fetchMock = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, method: init?.method });

      if (url.includes("/rest/v1/canonical_listings")) {
        return Response.json([
          {
            id: "canon-titan-1",
            title: "Apartament 2 camere Titan",
            description_excerpt: "Aproape de metrou.",
            property_type: "apartment",
            transaction_type: "sale",
            price_eur: 89500,
            area_sqm: 54,
            rooms: 2,
            city: "bucuresti",
            district: "sector 3",
            neighborhood: "titan"
          }
        ]);
      }
      if (url.includes("/rest/v1/alerts")) {
        return Response.json([
          {
            id: "alert-1",
            org_id: "tenant-a",
            saved_search_id: "search-1",
            channel: "in_app",
            is_enabled: true
          }
        ]);
      }
      if (url.includes("/rest/v1/saved_searches")) {
        return Response.json([
          {
            id: "search-1",
            org_id: "tenant-a",
            name: "Titan 2 camere",
            criteria: matchingSearch.criteria
          }
        ]);
      }
      if (url.includes("/rest/v1/alert_deliveries")) {
        return Response.json([
          {
            org_id: "tenant-a",
            alert_id: "alert-1",
            canonical_listing_id: "canon-titan-1"
          }
        ]);
      }

      throw new Error(`unexpected_url:${url}`);
    };

    await expect(
      planAndPersistAlertDeliveriesForListing(env(), "canon-titan-1", "2026-05-25T08:00:00.000Z", {
        fetch: fetchMock
      })
    ).resolves.toBe(0);

    expect(calls.map((call) => call.method)).toEqual(["GET", "GET", "GET", "GET"]);
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
