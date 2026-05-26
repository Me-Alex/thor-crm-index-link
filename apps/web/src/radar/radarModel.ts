import type { AlertDelivery, DemoListing, PropertyType, SavedSearch, SourceHealth, TransactionType } from "../data/demoData";
import type { TenantWorkflowItem } from "../lib/tenantWorkflowApi";

export interface RadarFilters {
  query: string;
  location: string;
  propertyType: PropertyType | "all";
  transactionType: TransactionType | "all";
  priceMin: string;
  priceMax: string;
}

export interface RadarOpportunity {
  listing: DemoListing;
  priceDeltaEur: number;
  priceDeltaPct: number;
  sourceNames: string[];
}

export interface RadarCluster {
  id: string;
  label: string;
  x: number;
  y: number;
  count: number;
  delta: number;
  tone: "hot" | "cool" | "stable";
  representativeListingId?: string;
  summary: string;
}

export interface RadarKpi {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: "good" | "warning" | "danger" | "neutral";
}

export interface RadarActivityEvent {
  id: string;
  time: string;
  title: string;
  detail: string;
  tone: "good" | "warning" | "danger" | "neutral";
}

export interface RadarViewModel {
  opportunities: RadarOpportunity[];
  clusters: RadarCluster[];
  kpis: RadarKpi[];
  events: RadarActivityEvent[];
  selectedListing: DemoListing | undefined;
  selectedWorkflowItem: TenantWorkflowItem | undefined;
  selectedCluster: RadarCluster | undefined;
  sourceHealthSummary: SourceHealth[];
}

interface BuildRadarViewModelOptions {
  listings: DemoListing[];
  sourceHealth: SourceHealth[];
  workflowItems: TenantWorkflowItem[];
  savedSearches: SavedSearch[];
  alertDeliveries: AlertDelivery[];
  selectedTarget: RadarSelectionTarget | null;
  filters: RadarFilters;
}

export interface RadarSelectionTarget {
  type: "listing" | "cluster";
  id: string;
}

interface ClusterBlueprint {
  id: string;
  label: string;
  x: number;
  y: number;
  baseCount: number;
  baseDelta: number;
  defaultTone: RadarCluster["tone"];
  matchers: string[];
}

const CLUSTER_BLUEPRINTS: ClusterBlueprint[] = [
  { id: "baneasa", label: "Baneasa", x: 36, y: 14, baseCount: 37, baseDelta: -2, defaultTone: "cool", matchers: ["baneasa", "herastrau"] },
  { id: "pipera", label: "Pipera", x: 74, y: 25, baseCount: 41, baseDelta: 1, defaultTone: "cool", matchers: ["pipera", "voluntari"] },
  { id: "floreasca", label: "Floreasca", x: 44, y: 38, baseCount: 62, baseDelta: 5, defaultTone: "cool", matchers: ["floreasca", "aviatiei", "dorobanti"] },
  { id: "titan", label: "Titan", x: 60, y: 48, baseCount: 78, baseDelta: 12, defaultTone: "hot", matchers: ["titan", "sector 3", "dristor"] },
  { id: "drumul-taberei", label: "Drumul Taberei", x: 18, y: 59, baseCount: 28, baseDelta: 0, defaultTone: "cool", matchers: ["drumul taberei", "sector 6"] },
  { id: "rahova", label: "Rahova", x: 39, y: 79, baseCount: 23, baseDelta: -3, defaultTone: "stable", matchers: ["rahova", "sector 5"] },
  { id: "dristor", label: "Dristor", x: 69, y: 83, baseCount: 33, baseDelta: 2, defaultTone: "cool", matchers: ["dristor", "mihai bravu"] }
];

const formatCompactNumber = new Intl.NumberFormat("ro-RO");
const formatCurrency = new Intl.NumberFormat("ro-RO", {
  maximumFractionDigits: 0,
  style: "currency",
  currency: "EUR"
});

export function filterRadarListings(listings: DemoListing[], filters: RadarFilters): DemoListing[] {
  const normalizedQuery = normalize(filters.query);
  const normalizedLocation = normalize(filters.location);
  const minPrice = Number(filters.priceMin);
  const maxPrice = Number(filters.priceMax);

  return listings.filter((listing) => {
    if (filters.propertyType !== "all" && listing.propertyType !== filters.propertyType) {
      return false;
    }

    if (filters.transactionType !== "all" && listing.transactionType !== filters.transactionType) {
      return false;
    }

    if (Number.isFinite(minPrice) && filters.priceMin.trim() && listing.priceEur < minPrice) {
      return false;
    }

    if (Number.isFinite(maxPrice) && filters.priceMax.trim() && listing.priceEur > maxPrice) {
      return false;
    }

    if (normalizedLocation && normalizedLocation !== "toate zonele") {
      const locationHaystack = normalize([listing.city, listing.district, listing.neighborhood].join(" "));
      if (!locationHaystack.includes(normalizedLocation)) {
        return false;
      }
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = normalize(
      [
        listing.title,
        listing.city,
        listing.district,
        listing.neighborhood,
        listing.propertyType,
        listing.transactionType,
        listing.assignee,
        ...listing.tags,
        ...listing.sources.map((source) => source.name)
      ].join(" ")
    );

    return haystack.includes(normalizedQuery);
  });
}

export function buildRadarClusters(listings: DemoListing[], sourceHealth: SourceHealth[]): RadarCluster[] {
  const overallCoverage = average(sourceHealth.map((source) => source.fieldCoverageRate));

  return CLUSTER_BLUEPRINTS.map((blueprint) => {
    const matchingListings = listings.filter((listing) => listingMatchesCluster(listing, blueprint.matchers));
    const representativeListing = matchingListings
      .slice()
      .sort((left, right) => Number(right.changedToday) - Number(left.changedToday) || right.matchScore - left.matchScore)[0];
    const dynamicCount = blueprint.baseCount + matchingListings.length * 3;
    const delta = representativeListing?.changedToday ? Math.max(blueprint.baseDelta, 4) : blueprint.baseDelta;
    const tone = representativeListing?.changedToday ? "hot" : representativeListing ? "cool" : blueprint.defaultTone;
    const summary = representativeListing
      ? `${representativeListing.title} · ${formatCurrency.format(representativeListing.priceEur)}`
      : `${Math.round(overallCoverage * 100)}% coverage dashboard`;

    return {
      id: blueprint.id,
      label: blueprint.label,
      x: blueprint.x,
      y: blueprint.y,
      count: dynamicCount,
      delta,
      tone,
      summary,
      ...(representativeListing ? { representativeListingId: representativeListing.id } : {})
    };
  });
}

export function buildRadarKpis(
  listings: DemoListing[],
  savedSearches: SavedSearch[],
  alertDeliveries: AlertDelivery[],
  sourceHealth: SourceHealth[]
): RadarKpi[] {
  const changedTodayCount = listings.filter((listing) => listing.changedToday).length;
  const dedupCandidates = listings.filter((listing) => listing.matchScore < 0.9).length;
  const averageCoverage = average(sourceHealth.map((source) => source.fieldCoverageRate));
  const averageTimeToIndex = average(sourceHealth.map((source) => source.timeToIndexMinutes));
  const averageMatchScore = average(listings.map((listing) => listing.matchScore));
  const activeSources = sourceHealth.filter((source) => source.mode === "on").length;

  return [
    { id: "canonical", label: "Anunturi canonice", value: formatCompactNumber.format(listings.length), detail: "listings indexate", tone: "neutral" },
    { id: "changed", label: "Pret schimbat", value: formatCompactNumber.format(changedTodayCount), detail: "in ultimele 24h", tone: changedTodayCount > 0 ? "warning" : "neutral" },
    { id: "dedup", label: "Dedup candidates", value: formatCompactNumber.format(dedupCandidates), detail: `${Math.round(averageMatchScore * 100)}% score mediu`, tone: dedupCandidates > 0 ? "warning" : "good" },
    { id: "alerts", label: "Alerte trimise", value: formatCompactNumber.format(alertDeliveries.length), detail: `${savedSearches.length} cautari salvate`, tone: "good" },
    { id: "coverage", label: "Source parse coverage", value: `${Math.round(averageCoverage * 100)}%`, detail: `${activeSources}/${sourceHealth.length} surse active`, tone: averageCoverage >= 0.8 ? "good" : "warning" },
    { id: "tti", label: "Time-to-index", value: `${averageTimeToIndex.toFixed(1)} min`, detail: "dashboard metric", tone: averageTimeToIndex <= 5 ? "good" : "warning" }
  ];
}

export function buildActivityEvents(
  alertDeliveries: AlertDelivery[],
  sourceHealth: SourceHealth[],
  selectedListing?: DemoListing,
  workflowItem?: TenantWorkflowItem
): RadarActivityEvent[] {
  const degradedSource = sourceHealth.find((source) => source.mode === "degraded");
  const primarySource = selectedListing?.sources[0];
  const latestHistoryPoint = selectedListing?.history[selectedListing.history.length - 1];

  const events: RadarActivityEvent[] = [];

  if (alertDeliveries[0]) {
    events.push({
      id: `alert-${alertDeliveries[0].id}`,
      time: alertDeliveries[0].deliveredAt,
      title: "Alerta trimisa",
      detail: alertDeliveries[0].title,
      tone: alertDeliveries[0].status === "failed" ? "danger" : "good"
    });
  }

  if (selectedListing) {
    events.push({
      id: `match-${selectedListing.id}`,
      time: latestHistoryPoint?.date ?? "azi",
      title: "Match creat",
      detail: `Dedup score ${Math.round(selectedListing.matchScore * 100)}% · ${primarySource?.name ?? "sursa"}`,
      tone: "good"
    });
    events.push({
      id: `fetch-${selectedListing.id}`,
      time: latestHistoryPoint?.date ?? "azi",
      title: "Fetched",
      detail: `${primarySource?.name ?? "Sursa"} · ${formatCurrency.format(selectedListing.priceEur)}`,
      tone: selectedListing.changedToday ? "warning" : "neutral"
    });
  }

  if (workflowItem) {
    events.push({
      id: `workflow-${workflowItem.id}`,
      time: workflowItem.updatedAt,
      title: "Workflow agentie",
      detail: `${workflowItem.assignee} · ${workflowItem.status}`,
      tone: "neutral"
    });
  }

  if (degradedSource) {
    events.push({
      id: `source-${degradedSource.id}`,
      time: degradedSource.latestSeenAt ?? "recent",
      title: "Sursa degradată",
      detail: `${degradedSource.name} · parse ${Math.round(degradedSource.parseSuccessRate * 100)}%`,
      tone: "warning"
    });
  }

  return events.slice(0, 5);
}

export function buildRadarViewModel(options: BuildRadarViewModelOptions): RadarViewModel {
  const filteredListings = filterRadarListings(options.listings, options.filters);
  const opportunities = filteredListings
    .map((listing) => toRadarOpportunity(listing))
    .sort(
      (left, right) =>
        Number(right.listing.changedToday) - Number(left.listing.changedToday) ||
        right.listing.matchScore - left.listing.matchScore ||
        right.listing.priceEur - left.listing.priceEur
    )
    .slice(0, 4);

  const clusters = buildRadarClusters(filteredListings, options.sourceHealth);
  const selectedListing =
    options.selectedTarget?.type === "listing"
      ? filteredListings.find((listing) => listing.id === options.selectedTarget?.id) ?? opportunities[0]?.listing
      : filteredListings.find((listing) => listing.id === clusters.find((cluster) => cluster.id === options.selectedTarget?.id)?.representativeListingId) ??
        opportunities[0]?.listing;
  const selectedCluster =
    options.selectedTarget?.type === "cluster"
      ? clusters.find((cluster) => cluster.id === options.selectedTarget?.id)
      : selectedListing
        ? clusters.find((cluster) => cluster.representativeListingId === selectedListing.id)
        : clusters[0];
  const selectedWorkflowItem = selectedListing
    ? options.workflowItems.find((item) => item.listingId === selectedListing.id)
    : undefined;

  return {
    opportunities,
    clusters,
    kpis: buildRadarKpis(filteredListings, options.savedSearches, options.alertDeliveries, options.sourceHealth),
    events: buildActivityEvents(options.alertDeliveries, options.sourceHealth, selectedListing, selectedWorkflowItem),
    selectedListing,
    selectedWorkflowItem,
    selectedCluster,
    sourceHealthSummary: options.sourceHealth
      .slice()
      .sort((left, right) => sourceModeRank(left.mode) - sourceModeRank(right.mode) || right.parseSuccessRate - left.parseSuccessRate)
      .slice(0, 5)
  };
}

function toRadarOpportunity(listing: DemoListing): RadarOpportunity {
  const previousPoint = listing.history[listing.history.length - 2];
  const latestPoint = listing.history[listing.history.length - 1];
  const priceDeltaEur = previousPoint ? listing.priceEur - previousPoint.priceEur : 0;
  const priceDeltaPct = previousPoint?.priceEur ? (priceDeltaEur / previousPoint.priceEur) * 100 : 0;

  return {
    listing,
    priceDeltaEur,
    priceDeltaPct,
    sourceNames: listing.sources.map((source) => source.name)
  };
}

function listingMatchesCluster(listing: DemoListing, matchers: string[]) {
  const haystack = normalize([listing.city, listing.district, listing.neighborhood].join(" "));
  return matchers.some((matcher) => haystack.includes(normalize(matcher)));
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sourceModeRank(mode: SourceHealth["mode"]) {
  if (mode === "on") {
    return 0;
  }

  if (mode === "degraded") {
    return 1;
  }

  return 2;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}
