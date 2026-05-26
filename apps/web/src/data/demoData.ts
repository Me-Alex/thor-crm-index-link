export type PropertyType = "apartment" | "house" | "land" | "commercial" | "other";
export type TransactionType = "sale" | "rent";
export type ListingStatus = "Nou" | "In lucru" | "Contactat" | "Ignorat";
export type SourceMode = "on" | "degraded" | "off";

export interface SourceLink {
  name: string;
  url: string;
  matchScore: number;
}

export interface ListingHistoryPoint {
  date: string;
  priceEur: number;
  availability: "active" | "changed" | "removed";
}

export interface DemoListing {
  id: string;
  title: string;
  city: string;
  district: string;
  neighborhood: string;
  propertyType: PropertyType;
  transactionType: TransactionType;
  priceEur: number;
  areaSqm: number;
  rooms: number;
  floor?: number;
  status: ListingStatus;
  assignee: string;
  tags: string[];
  matchScore: number;
  changedToday: boolean;
  sources: SourceLink[];
  history: ListingHistoryPoint[];
}

export interface SavedSearch {
  id: string;
  name: string;
  criteria: string;
  matches: number;
  frequency: "near real-time" | "hourly" | "daily";
  alertChannel: "in_app" | "email" | "webhook";
  alertsEnabled: boolean;
}

export interface AlertDelivery {
  id: string;
  title: string;
  channel: "email" | "webhook" | "in-app";
  status: "sent" | "pending" | "failed";
  deliveredAt: string;
}

export interface SourceHealth {
  id: string;
  name: string;
  mode: SourceMode;
  listingCount?: number;
  latestSeenAt?: string;
  crawlSuccessRate: number;
  parseSuccessRate: number;
  fieldCoverageRate: number;
  matchRate: number;
  timeToIndexMinutes: number;
}

export interface BillingPlan {
  id: "pilot" | "pro" | "scale";
  name: string;
  priceEurMonthly: number;
  trialDays: number;
  seatsIncluded: number;
  checkoutRequired: boolean;
  features: string[];
}

export interface CommercialReadinessGate {
  id: string;
  label: string;
  status: "ready" | "needs_secrets" | "review_required" | "blocked";
  owner: string;
}

export const workerHealthUrl = "https://thor-crm-index-link-worker.floreaalexandru2002.workers.dev/health";
export const githubRepoUrl = "https://github.com/Me-Alex/thor-crm-index-link";
export const supabaseProjectUrl = "https://mqzchppokgaoacgkqkzh.supabase.co";

export const demoListings: DemoListing[] = [
  {
    id: "cl-apt-titan",
    title: "Apartament 2 camere Titan",
    city: "bucuresti",
    district: "sector 3",
    neighborhood: "Titan",
    propertyType: "apartment",
    transactionType: "sale",
    priceEur: 89500,
    areaSqm: 54,
    rooms: 2,
    floor: 3,
    status: "Nou",
    assignee: "Alex",
    tags: ["metrou", "pret schimbat"],
    matchScore: 0.91,
    changedToday: true,
    sources: [
      {
        name: "imobiliare.ro",
        url: "https://example.test/imobiliare/titan-2-camere",
        matchScore: 0.91
      },
      {
        name: "storia.ro",
        url: "https://example.test/storia/titan-2-camere",
        matchScore: 0.88
      }
    ],
    history: [
      { date: "2026-05-23", priceEur: 91000, availability: "changed" },
      { date: "2026-05-25", priceEur: 89500, availability: "active" }
    ]
  },
  {
    id: "cl-house-cluj",
    title: "Casa individuala cu teren Borhanci",
    city: "cluj napoca",
    district: "cluj",
    neighborhood: "Borhanci",
    propertyType: "house",
    transactionType: "sale",
    priceEur: 249000,
    areaSqm: 142,
    rooms: 5,
    status: "In lucru",
    assignee: "Mara",
    tags: ["teren", "premium"],
    matchScore: 0.87,
    changedToday: false,
    sources: [
      {
        name: "olx.ro",
        url: "https://example.test/olx/casa-borhanci",
        matchScore: 0.87
      }
    ],
    history: [
      { date: "2026-05-20", priceEur: 249000, availability: "active" }
    ]
  },
  {
    id: "cl-rent-herastrau",
    title: "Studio premium Herastrau",
    city: "bucuresti",
    district: "sector 1",
    neighborhood: "Herastrau",
    propertyType: "apartment",
    transactionType: "rent",
    priceEur: 720,
    areaSqm: 42,
    rooms: 1,
    floor: 6,
    status: "Contactat",
    assignee: "Ioana",
    tags: ["inchiriere", "mobilat"],
    matchScore: 0.82,
    changedToday: true,
    sources: [
      {
        name: "publi24.ro",
        url: "https://example.test/publi24/studio-herastrau",
        matchScore: 0.82
      }
    ],
    history: [
      { date: "2026-05-24", priceEur: 750, availability: "changed" },
      { date: "2026-05-25", priceEur: 720, availability: "active" }
    ]
  },
  {
    id: "cl-land-iasi",
    title: "Teren intravilan Copou",
    city: "iasi",
    district: "iasi",
    neighborhood: "Copou",
    propertyType: "land",
    transactionType: "sale",
    priceEur: 67000,
    areaSqm: 580,
    rooms: 0,
    status: "Ignorat",
    assignee: "Neasignat",
    tags: ["teren"],
    matchScore: 0.88,
    changedToday: false,
    sources: [
      {
        name: "romimo.ro",
        url: "https://example.test/romimo/teren-copou",
        matchScore: 0.88
      }
    ],
    history: [
      { date: "2026-05-19", priceEur: 67000, availability: "active" }
    ]
  }
];

export const savedSearches: SavedSearch[] = [
  {
    id: "ss-bucuresti-apartamente",
    name: "Bucuresti apartamente sub 120k",
    criteria: "sale · apartment · Bucuresti · max 120.000 EUR",
    matches: 1,
    frequency: "near real-time",
    alertChannel: "in_app",
    alertsEnabled: true
  },
  {
    id: "ss-inchirieri-premium",
    name: "Inchirieri premium nord",
    criteria: "rent · apartment · Sector 1 · min 600 EUR",
    matches: 1,
    frequency: "hourly",
    alertChannel: "email",
    alertsEnabled: true
  }
];

export const alertDeliveries: AlertDelivery[] = [
  {
    id: "ad-1",
    title: "Pret modificat: Apartament 2 camere Titan",
    channel: "email",
    status: "sent",
    deliveredAt: "2026-05-25 09:14"
  },
  {
    id: "ad-2",
    title: "Listing nou: Studio premium Herastrau",
    channel: "in-app",
    status: "pending",
    deliveredAt: "2026-05-25 09:16"
  }
];

export const sourceHealth: SourceHealth[] = [
  {
    id: "imobiliare",
    name: "imobiliare.ro",
    mode: "on",
    crawlSuccessRate: 0.96,
    parseSuccessRate: 0.91,
    fieldCoverageRate: 0.88,
    matchRate: 0.42,
    timeToIndexMinutes: 4
  },
  {
    id: "olx",
    name: "olx.ro",
    mode: "degraded",
    crawlSuccessRate: 0.78,
    parseSuccessRate: 0.72,
    fieldCoverageRate: 0.64,
    matchRate: 0.31,
    timeToIndexMinutes: 9
  },
  {
    id: "demo",
    name: "Demo Source",
    mode: "off",
    crawlSuccessRate: 1,
    parseSuccessRate: 1,
    fieldCoverageRate: 1,
    matchRate: 0,
    timeToIndexMinutes: 0
  }
];

export const billingPlans: BillingPlan[] = [
  {
    id: "pilot",
    name: "Pilot",
    priceEurMonthly: 299,
    trialDays: 14,
    seatsIncluded: 3,
    checkoutRequired: false,
    features: ["workspace agentie", "surse activate gradual", "workflow status/note/taguri", "support async"]
  },
  {
    id: "pro",
    name: "Pro",
    priceEurMonthly: 699,
    trialDays: 14,
    seatsIncluded: 10,
    checkoutRequired: true,
    features: ["crawler monitorizat", "alerte salvate", "source health", "raport prospetime/dedup"]
  },
  {
    id: "scale",
    name: "Scale",
    priceEurMonthly: 1499,
    trialDays: 14,
    seatsIncluded: 25,
    checkoutRequired: true,
    features: ["surse prioritare", "SLA operational", "support prioritar", "audit export"]
  }
];

export const commercialReadinessGates: CommercialReadinessGate[] = [
  { id: "crawler_governance", label: "Crawler governance", status: "ready", owner: "ops" },
  { id: "tenant_onboarding", label: "Tenant onboarding", status: "ready", owner: "product" },
  { id: "billing_checkout", label: "Billing checkout", status: "needs_secrets", owner: "ops" },
  { id: "legal_pack", label: "Legal pack", status: "review_required", owner: "legal" },
  { id: "dedup_quality", label: "Dedup quality reporting", status: "ready", owner: "engineering" },
  { id: "freshness_sla", label: "Freshness SLA reporting", status: "ready", owner: "ops" }
];
