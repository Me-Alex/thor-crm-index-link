import { describe, expect, it } from "vitest";
import { buildCandidateBlock, scoreCandidateMatch, shouldLinkCandidate } from "../src/ingest/matcher";
import type { CanonicalCandidate, NormalizedListingObservation } from "../src/ingest/types";

const observation: NormalizedListingObservation = {
  sourceId: "source-a",
  sourceListingId: "a-1",
  url: "https://a.test/1",
  title: "Apartament 2 camere Titan",
  description: "54 mp utili, etaj 3, aproape de metrou.",
  priceEur: 89500,
  areaSqm: 54,
  rooms: 2,
  propertyType: "apartment",
  transactionType: "sale",
  city: "bucuresti",
  district: "sector 3",
  neighborhood: "titan",
  floor: 3,
  contentFingerprint: "fingerprint-a",
  searchText: "apartament 2 camere titan 54 mp utili etaj 3 aproape de metrou",
  observedAt: "2026-05-24T10:00:00Z"
};

const candidate: CanonicalCandidate = {
  canonicalListingId: "canon-1",
  title: "Apartament decomandat 2 camere Titan",
  priceEur: 90000,
  areaSqm: 55,
  rooms: 2,
  propertyType: "apartment",
  transactionType: "sale",
  city: "bucuresti",
  district: "sector 3",
  neighborhood: "titan",
  floor: 3,
  searchText: "apartament decomandat 2 camere titan etaj 3",
  sourceSignals: {
    phoneHash: "phone-1"
  }
};

describe("buildCandidateBlock", () => {
  it("creates a conservative blocking key from stable property fields", () => {
    expect(buildCandidateBlock(observation)).toEqual({
      city: "bucuresti",
      district: "sector 3",
      propertyType: "apartment",
      transactionType: "sale",
      roomsBand: "2",
      areaBand: "50-59"
    });
  });
});

describe("scoreCandidateMatch", () => {
  it("scores obvious duplicates above the linking threshold with explainable reasons", () => {
    const score = scoreCandidateMatch(observation, candidate);

    expect(score.score).toBeGreaterThanOrEqual(0.78);
    expect(score.reasons).toEqual(
      expect.arrayContaining(["same_location", "same_property_type", "price_close", "area_close", "title_similar"])
    );
    expect(shouldLinkCandidate(score)).toBe(true);
  });

  it("rejects mismatches even when titles share generic words", () => {
    const mismatch = scoreCandidateMatch(observation, {
      ...candidate,
      canonicalListingId: "canon-2",
      priceEur: 145000,
      areaSqm: 82,
      rooms: 3,
      neighborhood: "aviatiei",
      floor: 8,
      searchText: "apartament 3 camere aviatiei"
    });

    expect(mismatch.score).toBeLessThan(0.78);
    expect(shouldLinkCandidate(mismatch)).toBe(false);
  });
});
