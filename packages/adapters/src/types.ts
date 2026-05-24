export interface ParseContext {
  sourceId: string;
  url: string;
  observedAt: string;
}

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

export type ListingParseResult =
  | {
      ok: true;
      observation: RawListingObservation;
      coverage: Record<string, boolean>;
    }
  | {
      ok: false;
      errors: string[];
      coverage: Record<string, boolean>;
    };

export interface ListingDetailAdapter {
  sourceId: string;
  parseListingDetail(html: string, context: ParseContext): ListingParseResult;
}
