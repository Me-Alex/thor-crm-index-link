import { describe, expect, it } from "vitest";
import { filterListings, summarizeListings } from "../src/lib/filterListings";
import { demoListings } from "../src/data/demoData";

describe("filterListings", () => {
  it("filters listings by city, transaction, property type and price range", () => {
    const results = filterListings(demoListings, {
      city: "bucuresti",
      transactionType: "sale",
      propertyType: "apartment",
      minPrice: 80000,
      maxPrice: 120000
    });

    expect(results.map((listing) => listing.id)).toEqual(["cl-apt-titan"]);
  });

  it("keeps all listings when filters are empty", () => {
    expect(filterListings(demoListings, {})).toHaveLength(demoListings.length);
  });
});

describe("summarizeListings", () => {
  it("summarizes total inventory and urgent alerts", () => {
    expect(summarizeListings(demoListings)).toEqual({
      total: 4,
      active: 3,
      averageMatchScore: 0.87,
      changedToday: 2
    });
  });
});
