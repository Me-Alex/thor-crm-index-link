import { normalizeSearchText } from "../ingest/normalization";
import type {
  AlertDeliveryCandidate,
  CriteriaEvaluation,
  ExistingAlertDelivery,
  NumericRange,
  PlanAlertDeliveriesInput,
  SavedSearchCriteria,
  WorkflowListing
} from "./types";

export function evaluateSavedSearchCriteria(listing: WorkflowListing, criteria: SavedSearchCriteria): CriteriaEvaluation {
  const reasons: string[] = [];
  let matches = true;

  matches = evaluateStringSet(listing.city, criteria.cities, "city", reasons) && matches;
  matches = evaluateStringSet(listing.district, criteria.districts, "district", reasons) && matches;
  matches = evaluateStringSet(listing.neighborhood, criteria.neighborhoods, "neighborhood", reasons) && matches;
  matches = evaluateLiteralSet(listing.propertyType, criteria.propertyTypes, "property_type", reasons) && matches;
  matches = evaluateLiteralSet(listing.transactionType, criteria.transactionTypes, "transaction_type", reasons) && matches;
  matches = evaluateNumericRange(listing.priceEur, criteria.priceEur, "price_range", reasons) && matches;
  matches = evaluateNumericRange(listing.areaSqm, criteria.areaSqm, "area_range", reasons) && matches;
  matches = evaluateNumericRange(listing.rooms, criteria.rooms, "rooms_range", reasons) && matches;
  matches = evaluateKeywords(listing, criteria.keywords, reasons) && matches;

  return { matches, reasons };
}

export function planAlertDeliveries(input: PlanAlertDeliveriesInput): AlertDeliveryCandidate[] {
  const plannedDeliveries: AlertDeliveryCandidate[] = [];
  const emittedKeys = new Set(input.existingDeliveries.map(alertDeliveryKey));
  const tenantSearches = input.savedSearches.filter((search) => search.tenantId === input.tenantId && search.alertsEnabled);

  for (const search of tenantSearches) {
    for (const listing of input.changedListings) {
      const evaluation = evaluateSavedSearchCriteria(listing, search.criteria);
      const deliveryKey = alertDeliveryKey({
        tenantId: input.tenantId,
        savedSearchId: search.savedSearchId,
        canonicalListingId: listing.canonicalListingId,
        channel: search.alertChannel
      });

      if (!evaluation.matches || emittedKeys.has(deliveryKey)) {
        continue;
      }

      emittedKeys.add(deliveryKey);
      plannedDeliveries.push({
        tenantId: input.tenantId,
        savedSearchId: search.savedSearchId,
        canonicalListingId: listing.canonicalListingId,
        channel: search.alertChannel,
        evaluatedAt: input.evaluatedAt,
        deliveryKey,
        matchedReasons: evaluation.reasons
      });
    }
  }

  return plannedDeliveries;
}

function evaluateStringSet(value: string | undefined, allowedValues: string[] | undefined, reasonPrefix: string, reasons: string[]): boolean {
  if (!allowedValues?.length) {
    return true;
  }

  const normalizedValue = normalizeSearchText(value ?? "");
  const normalizedAllowedValues = allowedValues.map((allowedValue) => normalizeSearchText(allowedValue));
  const matches = normalizedValue !== "" && normalizedAllowedValues.includes(normalizedValue);
  reasons.push(matches ? `${reasonPrefix}_match` : `${reasonPrefix}_mismatch`);

  return matches;
}

function evaluateLiteralSet<T extends string>(value: T, allowedValues: T[] | undefined, reasonPrefix: string, reasons: string[]): boolean {
  if (!allowedValues?.length) {
    return true;
  }

  const matches = allowedValues.includes(value);
  reasons.push(matches ? `${reasonPrefix}_match` : `${reasonPrefix}_mismatch`);

  return matches;
}

function evaluateNumericRange(value: number | undefined, range: NumericRange | undefined, reasonPrefix: string, reasons: string[]): boolean {
  if (!range) {
    return true;
  }

  const matches = value !== undefined && (range.min === undefined || value >= range.min) && (range.max === undefined || value <= range.max);
  reasons.push(matches ? `${reasonPrefix}_match` : `${reasonPrefix}_mismatch`);

  return matches;
}

function evaluateKeywords(listing: WorkflowListing, keywords: string[] | undefined, reasons: string[]): boolean {
  if (!keywords?.length) {
    return true;
  }

  const searchableText = normalizeSearchText(`${listing.title} ${listing.searchText}`);
  const matches = keywords.every((keyword) => searchableText.includes(normalizeSearchText(keyword)));
  reasons.push(matches ? "keyword_match" : "keyword_mismatch");

  return matches;
}

function alertDeliveryKey(delivery: ExistingAlertDelivery): string {
  return `${delivery.tenantId}:${delivery.savedSearchId}:${delivery.canonicalListingId}:${delivery.channel}`;
}
