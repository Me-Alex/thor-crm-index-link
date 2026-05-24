import type { DemoListing, PropertyType, TransactionType } from "../data/demoData";

export interface ListingFilters {
  city?: string;
  transactionType?: TransactionType;
  propertyType?: PropertyType;
  minPrice?: number;
  maxPrice?: number;
}

export interface ListingSummary {
  total: number;
  active: number;
  averageMatchScore: number;
  changedToday: number;
}

export function filterListings(listings: DemoListing[], filters: ListingFilters): DemoListing[] {
  return listings.filter((listing) => {
    if (filters.city && listing.city !== filters.city) {
      return false;
    }
    if (filters.transactionType && listing.transactionType !== filters.transactionType) {
      return false;
    }
    if (filters.propertyType && listing.propertyType !== filters.propertyType) {
      return false;
    }
    if (filters.minPrice !== undefined && listing.priceEur < filters.minPrice) {
      return false;
    }
    if (filters.maxPrice !== undefined && listing.priceEur > filters.maxPrice) {
      return false;
    }
    return true;
  });
}

export function summarizeListings(listings: DemoListing[]): ListingSummary {
  const active = listings.filter((listing) => listing.status !== "Ignorat").length;
  const averageMatchScore =
    listings.length === 0
      ? 0
      : Number((listings.reduce((sum, listing) => sum + listing.matchScore, 0) / listings.length).toFixed(2));
  const changedToday = listings.filter((listing) => listing.changedToday).length;

  return {
    total: listings.length,
    active,
    averageMatchScore,
    changedToday
  };
}
