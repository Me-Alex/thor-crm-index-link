import type { PropertyType, TransactionType } from "../ingest/types";

export interface NumericRange {
  min?: number;
  max?: number;
}

export interface WorkflowListing {
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
  searchText: string;
}

export interface SavedSearchCriteria {
  cities?: string[];
  districts?: string[];
  neighborhoods?: string[];
  propertyTypes?: PropertyType[];
  transactionTypes?: TransactionType[];
  priceEur?: NumericRange;
  areaSqm?: NumericRange;
  rooms?: NumericRange;
  keywords?: string[];
}

export interface SavedSearch {
  savedSearchId: string;
  tenantId: string;
  name: string;
  alertsEnabled: boolean;
  alertChannel: "in_app" | "email" | "webhook";
  criteria: SavedSearchCriteria;
}

export interface CriteriaEvaluation {
  matches: boolean;
  reasons: string[];
}

export interface ExistingAlertDelivery {
  tenantId: string;
  savedSearchId: string;
  canonicalListingId: string;
  channel: "in_app" | "email" | "webhook";
}

export interface AlertDeliveryCandidate extends ExistingAlertDelivery {
  evaluatedAt: string;
  deliveryKey: string;
  matchedReasons: string[];
}

export interface PlanAlertDeliveriesInput {
  tenantId: string;
  changedListings: WorkflowListing[];
  savedSearches: SavedSearch[];
  existingDeliveries: ExistingAlertDelivery[];
  evaluatedAt: string;
}
