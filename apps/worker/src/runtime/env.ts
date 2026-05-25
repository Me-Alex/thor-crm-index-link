export interface Env {
  ENVIRONMENT: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ADMIN_API_KEY: string;
  DISCOVER_QUEUE?: Queue<DiscoverMessage>;
  FETCH_QUEUE?: Queue<FetchMessage>;
  MATCH_QUEUE?: Queue<MatchMessage>;
}

export interface DiscoverMessage {
  kind: "discover";
  sourceId: string;
  seedUrl: string;
  requestedAt: string;
  fixtureHtml?: string;
}

export interface FetchMessage {
  kind: "fetch";
  sourceId: string;
  url: string;
  discoveredAt: string;
  fixtureHtml?: string;
}

export interface MatchMessage {
  kind: "match";
  sourceListingId: string;
  observedAt: string;
}
