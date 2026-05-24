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
  sourceId: string;
  seedUrl: string;
  requestedAt: string;
}

export interface FetchMessage {
  sourceId: string;
  url: string;
  discoveredAt: string;
}

export interface MatchMessage {
  sourceListingId: string;
  observedAt: string;
}
