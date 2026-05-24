import { describe, expect, it } from "vitest";
import { normalizeListingObservation, chooseCanonicalField } from "../src/ingest/normalization";

describe("normalizeListingObservation", () => {
  it("normalizes Romanian listing fields into comparable values", () => {
    const normalized = normalizeListingObservation({
      sourceId: "imobiliare-ro",
      sourceListingId: "abc-123",
      url: "https://example.test/anunt/abc-123",
      title: "Apartament 2 camere decomandat, Titan",
      description: "Apartament luminos, 54 mp utili, etaj 3/10.",
      priceText: "89.500 €",
      areaText: "54 mp",
      roomsText: "2 camere",
      propertyTypeText: "Apartament",
      transactionTypeText: "Vânzare",
      cityText: "București",
      districtText: "Sector 3",
      neighborhoodText: "Titan",
      floorText: "3/10"
    });

    expect(normalized).toMatchObject({
      sourceId: "imobiliare-ro",
      sourceListingId: "abc-123",
      url: "https://example.test/anunt/abc-123",
      title: "Apartament 2 camere decomandat, Titan",
      priceEur: 89500,
      areaSqm: 54,
      rooms: 2,
      propertyType: "apartment",
      transactionType: "sale",
      city: "bucuresti",
      district: "sector 3",
      neighborhood: "titan",
      floor: 3
    });
    expect(normalized.contentFingerprint).toHaveLength(64);
    expect(normalized.searchText).toContain("apartament 2 camere decomandat titan");
  });

  it("keeps source data optional when fields are missing or ambiguous", () => {
    const normalized = normalizeListingObservation({
      sourceId: "portal-test",
      url: "https://example.test/listing",
      title: "Casă cu teren",
      description: "",
      priceText: "Preț la cerere",
      areaText: "",
      roomsText: "",
      propertyTypeText: "Vila",
      transactionTypeText: "Închiriere",
      cityText: "Cluj-Napoca"
    });

    expect(normalized.priceEur).toBeUndefined();
    expect(normalized.areaSqm).toBeUndefined();
    expect(normalized.rooms).toBeUndefined();
    expect(normalized.propertyType).toBe("house");
    expect(normalized.transactionType).toBe("rent");
    expect(normalized.city).toBe("cluj napoca");
  });
});

describe("chooseCanonicalField", () => {
  it("prefers higher confidence values, then fresher observations", () => {
    const chosenByConfidence = chooseCanonicalField([
      { value: 100000, confidence: 0.6, observedAt: "2026-05-24T09:00:00Z", sourceId: "a" },
      { value: 98000, confidence: 0.8, observedAt: "2026-05-24T08:00:00Z", sourceId: "b" }
    ]);

    const chosenByFreshness = chooseCanonicalField([
      { value: "titan", confidence: 0.7, observedAt: "2026-05-24T09:00:00Z", sourceId: "a" },
      { value: "dristor", confidence: 0.7, observedAt: "2026-05-24T10:00:00Z", sourceId: "b" }
    ]);

    expect(chosenByConfidence).toEqual({ value: 98000, sourceId: "b", confidence: 0.8 });
    expect(chosenByFreshness).toEqual({ value: "dristor", sourceId: "b", confidence: 0.7 });
  });
});
