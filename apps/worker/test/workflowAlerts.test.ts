import { describe, expect, it } from "vitest";
import { evaluateSavedSearchCriteria, planAlertDeliveries } from "../src/workflow/alerts";
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
