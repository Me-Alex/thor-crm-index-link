export type PropertyType = "apartment" | "house" | "land" | "commercial" | "other";
export type TransactionType = "sale" | "rent";

export interface RawListingObservation {
  sourceId: string;
  sourceListingId?: string;
  url: string;
  title: string;
  description?: string;
  priceText?: string;
  areaText?: string;
  roomsText?: string;
  propertyTypeText?: string;
  transactionTypeText?: string;
  cityText?: string;
  districtText?: string;
  neighborhoodText?: string;
  floorText?: string;
  agentNameText?: string;
  phoneHash?: string;
  observedAt?: string;
}

export interface NormalizedListingObservation {
  sourceId: string;
  sourceListingId?: string;
  url: string;
  title: string;
  description: string;
  priceEur?: number;
  areaSqm?: number;
  rooms?: number;
  propertyType: PropertyType;
  transactionType: TransactionType;
  city?: string;
  district?: string;
  neighborhood?: string;
  floor?: number;
  agentName?: string;
  phoneHash?: string;
  contentFingerprint: string;
  searchText: string;
  observedAt: string;
}

export interface CanonicalCandidate {
  canonicalListingId: string;
  title: string;
  priceEur?: number;
  areaSqm?: number;
  rooms?: number;
  propertyType: PropertyType;
  transactionType: TransactionType;
  city?: string;
  district?: string;
  neighborhood?: string;
  floor?: number;
  searchText: string;
  sourceSignals?: {
    phoneHash?: string;
    agentName?: string;
  };
}

export interface CandidateBlock {
  city: string;
  district: string;
  propertyType: PropertyType;
  transactionType: TransactionType;
  roomsBand: string;
  areaBand: string;
}

export interface MatchScore {
  score: number;
  threshold: number;
  reasons: string[];
  candidateId: string;
}

export interface CanonicalFieldObservation<T> {
  value: T | undefined;
  confidence: number;
  observedAt: string;
  sourceId: string;
}

export interface CanonicalFieldChoice<T> {
  value: T;
  sourceId: string;
  confidence: number;
}
