import { describe, expect, it } from "vitest";
import { demoListingFixtureHtml, getAdapter } from "../src";

describe("demo portal adapter", () => {
  it("parses permitted fixture HTML into a raw listing observation", () => {
    const adapter = getAdapter("demo");
    const result = adapter.parseListingDetail(demoListingFixtureHtml, {
      sourceId: "demo",
      url: "https://example.test/listings/demo-apt-titan",
      observedAt: "2026-05-25T00:00:00.000Z"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected fixture parse to succeed");
    }

    expect(result.observation).toMatchObject({
      sourceId: "demo",
      sourceListingId: "demo-apt-titan",
      url: "https://example.test/listings/demo-apt-titan",
      title: "Apartament 2 camere Titan",
      priceText: "89.500 EUR",
      areaText: "54 mp",
      roomsText: "2 camere",
      propertyTypeText: "Apartament",
      transactionTypeText: "Vanzare",
      cityText: "Bucuresti",
      districtText: "Sector 3",
      neighborhoodText: "Titan",
      floorText: "4",
      agentNameText: "Agent Demo"
    });
  });

  it("fails closed when required fixture fields are missing", () => {
    const adapter = getAdapter("demo");
    const result = adapter.parseListingDetail("<article data-source-listing-id=\"broken\"></article>", {
      sourceId: "demo",
      url: "https://example.test/listings/broken",
      observedAt: "2026-05-25T00:00:00.000Z"
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected fixture parse to fail");
    }
    expect(result.errors).toEqual(["missing_title", "missing_price", "missing_area"]);
    expect(result.coverage).toMatchObject({
      sourceListingId: true,
      title: false,
      price: false,
      area: false
    });
  });
});
