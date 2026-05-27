import { useDeferredValue, useEffect, useState, type FormEvent } from "react";
import type {
  AlertDelivery,
  BillingPlan,
  CommercialReadinessGate,
  DemoListing,
  PropertyType,
  SavedSearch,
  SourceHealth,
  TransactionType
} from "../data/demoData";
import type { TenantWorkflowItem, TenantWorkflowStatus } from "../lib/tenantWorkflowApi";
import type { RuntimeMode } from "../lib/runtimeConfig";
import { ActivityTimeline } from "./ActivityTimeline";
import { CommercialReadinessPanel } from "./CommercialReadinessPanel";
import { HotOpportunitiesPanel } from "./HotOpportunitiesPanel";
import { MarketMap } from "./MarketMap";
import { RadarCommandBar } from "./RadarCommandBar";
import { RadarKpiStrip } from "./RadarKpiStrip";
import { RadarSelect, type RadarSelectOption } from "./RadarSelect";
import { buildRadarViewModel, type RadarFilters, type RadarOpportunity, type RadarSelectionTarget } from "./radarModel";
import { RadarSidebar } from "./RadarSidebar";
import "./radarStyles.css";
import { SelectedListingDrawer } from "./SelectedListingDrawer";

export interface MarketRadarAppShellProps {
  listings: DemoListing[];
  sourceHealth: SourceHealth[];
  workflowItems: TenantWorkflowItem[];
  savedSearches: SavedSearch[];
  alertDeliveries: AlertDelivery[];
  dataMode: "fallback" | "live";
  dataMessage: string;
  workflowMode: "demo" | "live";
  runtimeMode: RuntimeMode;
  workflowMessage: string;
  workflowActionMessage: string;
  isLoadingListings: boolean;
  isLoadingWorkflow: boolean;
  authSessionEmail: string | undefined;
  activeWorkspaceName: string;
  activeWorkspaceSubtitle: string;
  authEmail: string;
  authPassword: string;
  authMessage: string;
  isAuthLoading: boolean;
  savedSearchName: string;
  savedSearchCriteria: string;
  savedSearchFrequency: SavedSearch["frequency"];
  savedSearchAlertChannel: SavedSearch["alertChannel"];
  savedSearchAlertsEnabled: boolean;
  savedSearchMessage: string;
  editingSavedSearchId: string | null;
  billingPlans: BillingPlan[];
  readinessGates: CommercialReadinessGate[];
  workspaceName: string;
  workspaceSlug: string;
  billingEmail: string;
  onboardingMessage: string;
  billingMessage: string;
  complianceEmail: string;
  complianceSubject: string;
  complianceTargetUrl: string;
  complianceDetails: string;
  complianceMessage: string;
  isCommercialActionLoading: boolean;
  onRefreshListings: () => void;
  onWorkflowStatusChange: (listingId: string, status: TenantWorkflowStatus) => void;
  onWorkflowNoteCreate: (listingId: string, body: string) => void;
  onAuthEmailChange: (email: string) => void;
  onAuthPasswordChange: (password: string) => void;
  onAuthSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onAuthLogout: () => void;
  onSavedSearchNameChange: (name: string) => void;
  onSavedSearchCriteriaChange: (criteria: string) => void;
  onSavedSearchFrequencyChange: (frequency: SavedSearch["frequency"]) => void;
  onSavedSearchAlertChannelChange: (channel: SavedSearch["alertChannel"]) => void;
  onSavedSearchAlertsEnabledChange: (enabled: boolean) => void;
  onSavedSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSavedSearchEdit: (search: SavedSearch) => void;
  onSavedSearchDelete: (search: SavedSearch) => void;
  onWorkspaceNameChange: (value: string) => void;
  onWorkspaceSlugChange: (value: string) => void;
  onBillingEmailChange: (value: string) => void;
  onWorkspaceSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPlanSelect: (plan: BillingPlan) => void;
  onComplianceEmailChange: (value: string) => void;
  onComplianceSubjectChange: (value: string) => void;
  onComplianceTargetUrlChange: (value: string) => void;
  onComplianceDetailsChange: (value: string) => void;
  onComplianceSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

const defaultFilters: RadarFilters = {
  query: "",
  location: "Bucuresti",
  propertyType: "all",
  transactionType: "all",
  priceMin: "",
  priceMax: ""
};

const savedSearchFrequencyOptions: Array<RadarSelectOption<SavedSearch["frequency"]>> = [
  { label: "near real-time", value: "near real-time" },
  { label: "hourly", value: "hourly" },
  { label: "daily", value: "daily" }
];

const savedSearchAlertChannelOptions: Array<RadarSelectOption<SavedSearch["alertChannel"]>> = [
  { label: "in-app", value: "in_app" },
  { label: "email", value: "email" },
  { label: "webhook", value: "webhook" }
];

type RadarPageId = "monitor" | "listings" | "saved-searches" | "alerts" | "sources" | "dedup" | "settings";
type ListingWorkTabId = "all" | "changed" | "open-workflow" | "dedup-review";
type SourceHealthTabId = "overview" | "issues" | "all";

const pageCopy: Record<RadarPageId, { eyebrow: string; title: string; description: string }> = {
  monitor: {
    eyebrow: "Market radar",
    title: "Monitor anunturi imobiliare",
    description: "Harta, semnale de piata si oportunitati relevante pentru zona activa."
  },
  listings: {
    eyebrow: "Listing workflow",
    title: "Anunturi si detalii",
    description: "Analizeaza anunturile canonice, sursele si statusul operational al agentiei."
  },
  "saved-searches": {
    eyebrow: "Automatizari",
    title: "Cautari salvate",
    description: "Configureaza criterii, frecventa si canale de alerta fara sa incarci monitorul principal."
  },
  alerts: {
    eyebrow: "Evenimente",
    title: "Alerte si activitate",
    description: "Vezi livrarile, crawl events si semnalele operationale recente."
  },
  sources: {
    eyebrow: "Ingestie",
    title: "Surse si sanatate crawl",
    description: "Urmareste acoperirea, modul surselor si timpul mediu pana la indexare."
  },
  dedup: {
    eyebrow: "Calitate date",
    title: "Dedup si audit listing",
    description: "Verifica scoruri, surse asociate si semnale de potrivire pentru anuntul selectat."
  },
  settings: {
    eyebrow: "Administrare",
    title: "Setari, billing si GDPR",
    description: "Onboarding, planuri, gate-uri production si cereri Takedown/GDPR."
  }
};

const listingWorkTabs: Array<{ id: ListingWorkTabId; label: string; description: string }> = [
  { id: "all", label: "Toate", description: "lista filtrata" },
  { id: "changed", label: "Pret schimbat", description: "prioritate azi" },
  { id: "open-workflow", label: "Workflow deschis", description: "necesita actiune" },
  { id: "dedup-review", label: "Dedup review", description: "scor sub 90%" }
];

const fallbackListingWorkTab = listingWorkTabs[0] as (typeof listingWorkTabs)[number];

export function MarketRadarAppShell(props: MarketRadarAppShellProps) {
  const [filters, setFilters] = useState<RadarFilters>(defaultFilters);
  const deferredQuery = useDeferredValue(filters.query);
  const [activePage, setActivePage] = useState<RadarPageId>("monitor");
  const [activeListingWorkTab, setActiveListingWorkTab] = useState<ListingWorkTabId>("all");
  const [isAccountPanelOpen, setIsAccountPanelOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<RadarSelectionTarget | null>(
    props.listings[0] ? { type: "listing", id: props.listings[0].id } : null
  );

  const viewModel = buildRadarViewModel({
    listings: props.listings,
    sourceHealth: props.sourceHealth,
    workflowItems: props.workflowItems,
    savedSearches: props.savedSearches,
    alertDeliveries: props.alertDeliveries,
    selectedTarget,
    filters: {
      ...filters,
      query: deferredQuery
    }
  });

  useEffect(() => {
    if (viewModel.selectedListing) {
      if (selectedTarget?.type !== "listing" || selectedTarget.id !== viewModel.selectedListing.id) {
        setSelectedTarget({ type: "listing", id: viewModel.selectedListing.id });
      }
      return;
    }

    if (viewModel.selectedCluster && (!selectedTarget || selectedTarget.id !== viewModel.selectedCluster.id)) {
      setSelectedTarget({ type: "cluster", id: viewModel.selectedCluster.id });
    }
  }, [selectedTarget, viewModel.selectedCluster, viewModel.selectedListing]);

  const handleListingSelect = (listingId: string) => {
    setSelectedTarget({ type: "listing", id: listingId });
    setActivePage("listings");
  };

  const handleDrawerListingSelect = (listingId: string) => {
    setSelectedTarget({ type: "listing", id: listingId });
    if (activePage !== "dedup") {
      setActivePage("listings");
    }
  };

  const handlePageNavigate = (pageId: string) => {
    setActivePage(pageId as RadarPageId);
    if (!window.navigator.userAgent.toLowerCase().includes("jsdom")) {
      window.scrollTo?.({ top: 0, behavior: "smooth" });
    }
  };

  const currentPage = pageCopy[activePage];
  const showCommandBar = activePage === "monitor" || activePage === "listings";
  const listingWorkTabCounts = buildListingWorkTabCounts(viewModel.opportunities);
  const listingWorkTabOpportunities = filterListingWorkTabOpportunities(viewModel.opportunities, activeListingWorkTab);
  const activeListingWorkTabCopy = listingWorkTabs.find((tab) => tab.id === activeListingWorkTab) ?? fallbackListingWorkTab;

  return (
    <main className="radar-shell" data-testid="market-radar-shell">
      <RadarSidebar
        authSessionEmail={props.authSessionEmail}
        activeWorkspaceName={props.activeWorkspaceName}
        activeWorkspaceSubtitle={props.activeWorkspaceSubtitle}
        activePage={activePage}
        onNavigate={handlePageNavigate}
      />

      <section className="radar-workspace">
        <header className="radar-page-header">
          <div>
            <span>{currentPage.eyebrow}</span>
            <h1>{currentPage.title}</h1>
            <p>{currentPage.description}</p>
          </div>
          <div className="radar-header-stack">
            <div className="radar-page-actions" aria-label="Stare sistem">
              <span>{props.dataMode === "live" ? "Date conectate" : "Mod demonstrativ"}</span>
              <span>{props.workflowMode === "live" ? "Workflow live" : "Workflow demo"}</span>
            </div>
            <div className={`account-menu${isAccountPanelOpen ? " is-open" : ""}`}>
              <button
                type="button"
                className="account-menu-trigger"
                aria-expanded={isAccountPanelOpen}
                aria-controls="account-access-panel"
                onClick={() => setIsAccountPanelOpen((currentValue) => !currentValue)}
              >
                <span className="account-menu-avatar" aria-hidden="true">
                  {props.authSessionEmail?.slice(0, 1).toUpperCase() ?? "A"}
                </span>
                <span>
                  <strong>{props.authSessionEmail ?? "Cont agentie"}</strong>
                  <small>{props.authSessionEmail ? "Autentificat" : "Login necesar"}</small>
                </span>
                <i aria-hidden="true">⌄</i>
              </button>
              {isAccountPanelOpen ? (
                <div className="account-access-popover">
                  <AccountAccessPanel
                    authSessionEmail={props.authSessionEmail}
                    authEmail={props.authEmail}
                    authPassword={props.authPassword}
                    authMessage={props.authMessage}
                    isAuthLoading={props.isAuthLoading}
                    onAuthEmailChange={props.onAuthEmailChange}
                    onAuthPasswordChange={props.onAuthPasswordChange}
                    onAuthSubmit={props.onAuthSubmit}
                    onAuthLogout={props.onAuthLogout}
                    compact
                  />
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {showCommandBar ? (
          <RadarCommandBar
            location={filters.location}
            propertyType={filters.propertyType}
            transactionType={filters.transactionType}
            priceMin={filters.priceMin}
            priceMax={filters.priceMax}
            query={filters.query}
            dataMode={props.dataMode}
            dataMessage={props.dataMessage}
            runtimeMode={props.runtimeMode}
            activeWorkspaceName={props.activeWorkspaceName}
            isLoadingListings={props.isLoadingListings}
            onLocationChange={(value) => setFilters((current) => ({ ...current, location: value }))}
            onPropertyTypeChange={(value) => setFilters((current) => ({ ...current, propertyType: value as PropertyType | "all" }))}
            onTransactionTypeChange={(value) =>
              setFilters((current) => ({ ...current, transactionType: value as TransactionType | "all" }))
            }
            onPriceMinChange={(value) => setFilters((current) => ({ ...current, priceMin: value }))}
            onPriceMaxChange={(value) => setFilters((current) => ({ ...current, priceMax: value }))}
            onQueryChange={(value) => setFilters((current) => ({ ...current, query: value }))}
            onRefreshListings={props.onRefreshListings}
          />
        ) : null}

        {activePage === "monitor" ? (
        <div className="radar-grid">
          <div className="radar-primary-column">
            <div id="market-monitor-section">
              <MarketMap
                clusters={viewModel.clusters}
                selectedTarget={selectedTarget}
                sourceHealth={viewModel.sourceHealthSummary}
                onSelectCluster={(cluster) =>
                  setSelectedTarget(
                    cluster.representativeListingId ? { type: "listing", id: cluster.representativeListingId } : { type: "cluster", id: cluster.id }
                  )
                }
              />
            </div>
            <div id="activity-section">
              <ActivityTimeline events={viewModel.events} />
            </div>
            <RadarKpiStrip kpis={viewModel.kpis} />
          </div>

          <div className="radar-secondary-column">
            <div id="market-listings-section">
              <HotOpportunitiesPanel
                opportunities={viewModel.opportunities}
                selectedListingId={viewModel.selectedListing?.id}
                summary="selectie din monitor"
                onSelectListing={handleListingSelect}
              />
            </div>
            <OperatorCommandCenter
              opportunities={viewModel.opportunities}
              sources={viewModel.sourceHealthSummary}
              savedSearches={props.savedSearches}
              readinessGates={props.readinessGates}
              onNavigate={handlePageNavigate}
            />
          </div>
        </div>
        ) : null}

        {activePage === "listings" || activePage === "dedup" ? (
        <div className={`radar-detail-grid${activePage === "dedup" ? " is-dedup-page" : ""}`} aria-label="Listing workflow and operations">
          {activePage === "listings" ? (
            <div className="radar-operations-column">
              <ListingWorkTabs
                activeTab={activeListingWorkTab}
                counts={listingWorkTabCounts}
                onTabChange={setActiveListingWorkTab}
              />
              <ListingWorkSummary opportunities={viewModel.opportunities} />
              <HotOpportunitiesPanel
                opportunities={listingWorkTabOpportunities}
                selectedListingId={viewModel.selectedListing?.id}
                title={activeListingWorkTabCopy.label}
                summary={activeListingWorkTabCopy.description}
                onSelectListing={handleListingSelect}
              />
            </div>
          ) : null}
          {activePage === "dedup" ? (
            <DedupAuditCockpit listing={viewModel.selectedListing} opportunities={viewModel.opportunities} />
          ) : null}
          <SelectedListingDrawer
            listing={viewModel.selectedListing}
            workflowItem={viewModel.selectedWorkflowItem}
            cluster={viewModel.selectedCluster}
            availableListings={viewModel.opportunities.map((item) => item.listing)}
            workflowMode={props.workflowMode}
            workflowMessage={props.workflowMessage}
            workflowActionMessage={props.workflowActionMessage}
            isLoadingWorkflow={props.isLoadingWorkflow}
            showListingNavigation={activePage === "dedup"}
            onSelectListing={handleDrawerListingSelect}
            onWorkflowStatusChange={props.onWorkflowStatusChange}
            onWorkflowNoteCreate={props.onWorkflowNoteCreate}
          />
        </div>
        ) : null}

        {activePage === "saved-searches" ? (
          <div className="radar-page-stack">
            <SavedSearchesPanel
                savedSearches={props.savedSearches}
                savedSearchName={props.savedSearchName}
                savedSearchCriteria={props.savedSearchCriteria}
                savedSearchFrequency={props.savedSearchFrequency}
                savedSearchAlertChannel={props.savedSearchAlertChannel}
                savedSearchAlertsEnabled={props.savedSearchAlertsEnabled}
                savedSearchMessage={props.savedSearchMessage}
                editingSavedSearchId={props.editingSavedSearchId}
                onSavedSearchNameChange={props.onSavedSearchNameChange}
                onSavedSearchCriteriaChange={props.onSavedSearchCriteriaChange}
                onSavedSearchFrequencyChange={props.onSavedSearchFrequencyChange}
                onSavedSearchAlertChannelChange={props.onSavedSearchAlertChannelChange}
                onSavedSearchAlertsEnabledChange={props.onSavedSearchAlertsEnabledChange}
                onSavedSearchSubmit={props.onSavedSearchSubmit}
                onSavedSearchEdit={props.onSavedSearchEdit}
                onSavedSearchDelete={props.onSavedSearchDelete}
              />
          </div>
        ) : null}

        {activePage === "alerts" ? (
          <div className="radar-page-stack is-alerts-page">
            <div className="alerts-dashboard-grid">
              <ActivityTimeline events={viewModel.events} />
              <AlertDeliveryPanel deliveries={props.alertDeliveries} />
              <AlertOpsPanel deliveries={props.alertDeliveries} savedSearches={props.savedSearches} />
            </div>
            <RadarKpiStrip kpis={viewModel.kpis} />
          </div>
        ) : null}

        {activePage === "sources" ? (
          <div className="radar-page-stack">
            <SourceHealthPanel sources={viewModel.sourceHealthSummary} />
          </div>
        ) : null}

        {activePage === "settings" ? (
        <div id="settings-section" className="radar-commercial-section">
          <CommercialReadinessPanel
            runtimeMode={props.runtimeMode}
            billingPlans={props.billingPlans}
            readinessGates={props.readinessGates}
            workspaceName={props.workspaceName}
            workspaceSlug={props.workspaceSlug}
            billingEmail={props.billingEmail}
            onboardingMessage={props.onboardingMessage}
            billingMessage={props.billingMessage}
            complianceEmail={props.complianceEmail}
            complianceSubject={props.complianceSubject}
            complianceTargetUrl={props.complianceTargetUrl}
            complianceDetails={props.complianceDetails}
            complianceMessage={props.complianceMessage}
            isCommercialActionLoading={props.isCommercialActionLoading}
            onWorkspaceNameChange={props.onWorkspaceNameChange}
            onWorkspaceSlugChange={props.onWorkspaceSlugChange}
            onBillingEmailChange={props.onBillingEmailChange}
            onWorkspaceSubmit={props.onWorkspaceSubmit}
            onPlanSelect={props.onPlanSelect}
            onComplianceEmailChange={props.onComplianceEmailChange}
            onComplianceSubjectChange={props.onComplianceSubjectChange}
            onComplianceTargetUrlChange={props.onComplianceTargetUrlChange}
            onComplianceDetailsChange={props.onComplianceDetailsChange}
            onComplianceSubmit={props.onComplianceSubmit}
          />
        </div>
        ) : null}
      </section>
    </main>
  );
}

interface AccountAccessPanelProps {
  authSessionEmail: string | undefined;
  authEmail: string;
  authPassword: string;
  authMessage: string;
  isAuthLoading: boolean;
  onAuthEmailChange: (email: string) => void;
  onAuthPasswordChange: (password: string) => void;
  onAuthSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onAuthLogout: () => void;
  compact?: boolean;
}

interface ListingWorkTabsProps {
  activeTab: ListingWorkTabId;
  counts: Record<ListingWorkTabId, number>;
  onTabChange: (tabId: ListingWorkTabId) => void;
}

function ListingWorkTabs({ activeTab, counts, onTabChange }: ListingWorkTabsProps) {
  return (
    <section className="listing-work-tabs" aria-label="Filtre lucru anunturi" data-testid="listing-work-tabs">
      {listingWorkTabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={activeTab === tab.id ? "is-active" : ""}
          aria-pressed={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
        >
          <span>{tab.label}</span>
          <strong>{counts[tab.id]}</strong>
          <small>{tab.description}</small>
        </button>
      ))}
    </section>
  );
}

function ListingWorkSummary({ opportunities }: { opportunities: RadarOpportunity[] }) {
  const changedCount = opportunities.filter((opportunity) => opportunity.listing.changedToday).length;
  const openWorkflowCount = opportunities.filter((opportunity) =>
    ["Nou", "In lucru"].includes(opportunity.listing.status)
  ).length;
  const reviewCount = opportunities.filter((opportunity) => opportunity.listing.matchScore < 0.9).length;

  return (
    <section className="listing-work-summary" aria-label="Rezumat lucru anunturi">
      <article>
        <span>Actiuni azi</span>
        <strong>{changedCount + openWorkflowCount}</strong>
        <small>pret schimbat + workflow</small>
      </article>
      <article>
        <span>Dedup review</span>
        <strong>{reviewCount}</strong>
        <small>sub prag 90%</small>
      </article>
      <article>
        <span>Index + link</span>
        <strong>{opportunities.length}</strong>
        <small>fara re-hosting continut</small>
      </article>
    </section>
  );
}

function buildListingWorkTabCounts(opportunities: RadarOpportunity[]): Record<ListingWorkTabId, number> {
  return {
    all: opportunities.length,
    changed: filterListingWorkTabOpportunities(opportunities, "changed").length,
    "open-workflow": filterListingWorkTabOpportunities(opportunities, "open-workflow").length,
    "dedup-review": filterListingWorkTabOpportunities(opportunities, "dedup-review").length
  };
}

function filterListingWorkTabOpportunities(opportunities: RadarOpportunity[], tabId: ListingWorkTabId) {
  if (tabId === "changed") {
    return opportunities.filter((opportunity) => opportunity.listing.changedToday);
  }

  if (tabId === "open-workflow") {
    return opportunities.filter((opportunity) => ["Nou", "In lucru"].includes(opportunity.listing.status));
  }

  if (tabId === "dedup-review") {
    return opportunities.filter((opportunity) => opportunity.listing.matchScore < 0.9);
  }

  return opportunities;
}

function DedupAuditCockpit({
  listing,
  opportunities
}: {
  listing: DemoListing | undefined;
  opportunities: RadarOpportunity[];
}) {
  const reviewQueue = opportunities.filter((opportunity) => opportunity.listing.matchScore < 0.9).length;
  const selectedSourceCount = listing?.sources.length ?? 0;
  const selectedHistoryCount = listing?.history.length ?? 0;
  const recommendation = getDedupRecommendation(listing);

  return (
    <section className="operations-panel dedup-audit-cockpit" data-testid="dedup-audit-cockpit">
      <div className="drawer-section-header">
        <strong>Dedup audit cockpit</strong>
        <span>{reviewQueue} review</span>
      </div>
      <div className="dedup-audit-grid">
        <article>
          <span>Scor selectie</span>
          <strong>{listing ? `${Math.round(listing.matchScore * 100)}%` : "—"}</strong>
          <small>{recommendation.tone}</small>
        </article>
        <article>
          <span>Surse asociate</span>
          <strong>{selectedSourceCount}</strong>
          <small>link-uri auditabile</small>
        </article>
        <article>
          <span>Istoric pret</span>
          <strong>{selectedHistoryCount}</strong>
          <small>observatii disponibile</small>
        </article>
      </div>
      <div className={`dedup-recommendation is-${recommendation.level}`}>
        <span>Recomandare</span>
        <strong>{recommendation.title}</strong>
        <p>{recommendation.detail}</p>
      </div>
      <div className="dedup-checklist" aria-label="Checklist audit dedup">
        <article>
          <strong>1. Verifica overlap surse</strong>
          <span>Compara linkurile sursa si semnalele care au produs canonical listing.</span>
        </article>
        <article>
          <strong>2. Confirma campurile stabile</strong>
          <span>Zona, camere, suprafata si pret trebuie sa fie compatibile inainte de merge.</span>
        </article>
        <article>
          <strong>3. Pastreaza false negatives</strong>
          <span>Daca semnalele sunt slabe, lasa listing-ul separat pana exista dovada mai buna.</span>
        </article>
      </div>
    </section>
  );
}

function getDedupRecommendation(listing: DemoListing | undefined) {
  if (!listing) {
    return {
      detail: "Selecteaza un listing pentru audit.",
      level: "review",
      title: "Nu exista selectie",
      tone: "neutru"
    };
  }

  if (listing.matchScore >= 0.9 && listing.sources.length > 1) {
    return {
      detail: "Scorul si numarul de surse sustin pastrarea legaturii canonice.",
      level: "safe",
      title: "Link canonic stabil",
      tone: "risc scazut"
    };
  }

  if (listing.matchScore >= 0.85) {
    return {
      detail: "Scorul este aproape de prag; verifica manual campurile care pot produce fals-pozitive.",
      level: "review",
      title: "Review manual inainte de merge",
      tone: "risc mediu"
    };
  }

  return {
    detail: "Semnalele sunt insuficiente pentru unificare automata in MVP.",
    level: "hold",
    title: "Pastreaza separat",
    tone: "risc ridicat"
  };
}

function OperatorCommandCenter({
  opportunities,
  sources,
  savedSearches,
  readinessGates,
  onNavigate
}: {
  opportunities: RadarOpportunity[];
  sources: SourceHealth[];
  savedSearches: SavedSearch[];
  readinessGates: CommercialReadinessGate[];
  onNavigate: (pageId: RadarPageId) => void;
}) {
  const degradedSources = sources.filter((source) => source.mode !== "on").length;
  const dedupReviewCount = opportunities.filter((opportunity) => opportunity.listing.matchScore < 0.9).length;
  const blockedGates = readinessGates.filter((gate) => gate.status !== "ready").length;

  return (
    <section className="operator-command-panel" data-testid="operator-command-center" aria-label="Command center operational">
      <div className="panel-heading">
        <div>
          <strong>Command center</strong>
          <span>urmatorul pas recomandat</span>
        </div>
      </div>
      <div className="operator-command-list">
        <article className={degradedSources > 0 ? "is-warning" : "is-ok"}>
          <span>{degradedSources}</span>
          <div>
            <strong>Surse de verificat</strong>
            <p>{degradedSources > 0 ? "Exista surse degradate sau oprite." : "Sursele principale ruleaza in parametri."}</p>
          </div>
          <button type="button" onClick={() => onNavigate("sources")}>
            Deschide surse
          </button>
        </article>
        <article className={dedupReviewCount > 0 ? "is-warning" : "is-ok"}>
          <span>{dedupReviewCount}</span>
          <div>
            <strong>Dedup de revizuit</strong>
            <p>{dedupReviewCount > 0 ? "Anunturi sub pragul conservator de potrivire." : "Nu exista candidati sub prag in filtrul curent."}</p>
          </div>
          <button type="button" onClick={() => onNavigate("dedup")}>
            Verifica dedup
          </button>
        </article>
        <article className={savedSearches.length > 0 ? "is-ok" : "is-warning"}>
          <span>{savedSearches.length}</span>
          <div>
            <strong>Cautari salvate</strong>
            <p>{blockedGates > 0 ? `${blockedGates} gate-uri production necesita atentie.` : "Alertele pot fi operate din workspace."}</p>
          </div>
          <button type="button" onClick={() => onNavigate("saved-searches")}>
            Gestioneaza alerte
          </button>
        </article>
      </div>
    </section>
  );
}

function SourceHealthPanel({ sources }: { sources: SourceHealth[] }) {
  const [activeTab, setActiveTab] = useState<SourceHealthTabId>("overview");
  const activeSources = sources.filter((source) => source.mode === "on").length;
  const degradedSources = sources.filter((source) => source.mode === "degraded").length;
  const issueSources = getSourceIssueSources(sources);
  const actionCount = buildSourceActions(sources).filter((action) => action.priority !== "ok").length;
  const averageCoverage = sources.length
    ? Math.round((sources.reduce((total, source) => total + source.fieldCoverageRate, 0) / sources.length) * 100)
    : 0;
  const averageTimeToIndex = sources.length
    ? sources.reduce((total, source) => total + source.timeToIndexMinutes, 0) / sources.length
    : 0;

  return (
    <section className="operations-panel source-health-page" data-testid="source-health-page">
      <div className="drawer-section-header">
        <strong>Sanatate surse</strong>
        <span>{sources.length} surse</span>
      </div>
      <div className="source-health-tabs" aria-label="Taburi sanatate surse">
        <button type="button" className={activeTab === "overview" ? "is-active" : ""} onClick={() => setActiveTab("overview")}>
          Overview
        </button>
        <button type="button" className={activeTab === "issues" ? "is-active" : ""} onClick={() => setActiveTab("issues")}>
          Issues <span>{actionCount}</span>
        </button>
        <button type="button" className={activeTab === "all" ? "is-active" : ""} onClick={() => setActiveTab("all")}>
          Toate sursele
        </button>
      </div>

      {activeTab === "overview" ? (
        <>
          <div className="source-health-summary">
            <article>
              <span>Surse active</span>
              <strong>{activeSources}</strong>
              <small>{degradedSources} degradate</small>
            </article>
            <article>
              <span>Coverage mediu</span>
              <strong>{averageCoverage}%</strong>
              <small>campuri cheie parsate</small>
            </article>
            <article>
              <span>Time-to-index</span>
              <strong>{averageTimeToIndex.toFixed(1)} min</strong>
              <small>medie operationala</small>
            </article>
          </div>
          <SourceActionQueue sources={sources} />
        </>
      ) : null}

      {activeTab === "issues" ? (
        <>
          <SourceActionQueue sources={sources} />
          <SourceRunbookPanel sources={issueSources.length > 0 ? issueSources : sources} />
          <SourceHealthCards sources={issueSources.length > 0 ? issueSources : sources} />
        </>
      ) : null}

      {activeTab === "all" ? <SourceHealthCards sources={sources} /> : null}
    </section>
  );
}

function SourceHealthCards({ sources }: { sources: SourceHealth[] }) {
  return (
    <div className="source-health-grid">
      {sources.map((source) => (
        <article key={source.id} className={`source-health-card is-${source.mode}`}>
          <div>
            <strong>{source.name}</strong>
            <span>{source.mode}</span>
          </div>
          <dl>
            <div>
              <dt>Parse success</dt>
              <dd>{Math.round(source.parseSuccessRate * 100)}%</dd>
            </div>
            <div>
              <dt>Coverage</dt>
              <dd>{Math.round(source.fieldCoverageRate * 100)}%</dd>
            </div>
            <div>
              <dt>Time-to-index</dt>
              <dd>{source.timeToIndexMinutes.toFixed(1)} min</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}

function SourceRunbookPanel({ sources }: { sources: SourceHealth[] }) {
  const primarySource =
    sources
      .slice()
      .sort((left, right) => sourceOperationalRiskScore(right) - sourceOperationalRiskScore(left))[0] ?? sources[0];

  return (
    <section className="source-runbook-panel" data-testid="source-runbook-panel" aria-label="Runbook sursa">
      <div className="drawer-section-header">
        <strong>Runbook sursa</strong>
        <span>{primarySource?.name ?? "n/a"}</span>
      </div>
      <div className="source-runbook-steps">
        <article>
          <strong>1. Reduce ritmul</strong>
          <span>Pastreaza politeness, backoff si circuit breaker; nu implementa bypass tehnic.</span>
        </article>
        <article>
          <strong>2. Rejoaca fixture parser</strong>
          <span>Valideaza coverage pe HTML permis inainte de a creste din nou frecventa.</span>
        </article>
        <article>
          <strong>3. Marcheaza degraded/off</strong>
          <span>Daca sursa ramane instabila, opreste joburile noi si pastreaza dead-letter pentru audit.</span>
        </article>
      </div>
    </section>
  );
}

function getSourceIssueSources(sources: SourceHealth[]) {
  return sources.filter((source) => source.mode !== "on" || source.fieldCoverageRate < 0.75 || source.timeToIndexMinutes > 8);
}

function sourceOperationalRiskScore(source: SourceHealth) {
  return Number(source.mode !== "on") * 100 + Math.max(0, 0.75 - source.fieldCoverageRate) * 100 + Math.max(0, source.timeToIndexMinutes - 8);
}

interface SourceActionItem {
  id: string;
  title: string;
  detail: string;
  priority: "urgent" | "review" | "ok";
}

function SourceActionQueue({ sources }: { sources: SourceHealth[] }) {
  const actions = buildSourceActions(sources);

  return (
    <section className="source-action-queue" aria-label="Actiuni operationale recomandate">
      <div className="drawer-section-header">
        <strong>Actiuni recomandate</strong>
        <span>{actions.length}</span>
      </div>
      <div className="source-action-list">
        {actions.map((action) => (
          <article key={action.id} className={`is-${action.priority}`}>
            <span>{action.priority === "urgent" ? "urgent" : action.priority === "review" ? "review" : "ok"}</span>
            <div>
              <strong>{action.title}</strong>
              <p>{action.detail}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function buildSourceActions(sources: SourceHealth[]): SourceActionItem[] {
  const actions = sources.flatMap((source): SourceActionItem[] => {
    const items: SourceActionItem[] = [];

    if (source.mode === "degraded" || source.mode === "off") {
      items.push({
        id: `${source.id}-mode`,
        title: `Revizuieste ${source.name}`,
        detail: `Sursa este ${source.mode}; verifica rate limit, robots, parser si ultimul batch inainte de reactivare.`,
        priority: "urgent"
      });
    }

    if (source.fieldCoverageRate < 0.75) {
      items.push({
        id: `${source.id}-coverage`,
        title: `Creste coverage pentru ${source.name}`,
        detail: `Coverage este ${Math.round(source.fieldCoverageRate * 100)}%; prioritizeaza campurile pret, mp, camere si locatie.`,
        priority: "review"
      });
    }

    if (source.timeToIndexMinutes > 8) {
      items.push({
        id: `${source.id}-freshness`,
        title: `Optimizeaza freshness pentru ${source.name}`,
        detail: `Time-to-index este ${source.timeToIndexMinutes.toFixed(1)} min; verifica backlog-ul si frecventa discover.`,
        priority: "review"
      });
    }

    return items;
  });

  if (actions.length > 0) {
    return actions.slice(0, 5);
  }

  return [
    {
      id: "all-sources-ok",
      title: "Sursele sunt in parametri",
      detail: "Nu exista surse degradate, coverage critic sau time-to-index peste pragul operational.",
      priority: "ok"
    }
  ];
}

function AlertDeliveryPanel({ deliveries }: { deliveries: AlertDelivery[] }) {
  return (
    <section className="operations-panel alert-delivery-panel" data-testid="alert-deliveries">
      <div className="drawer-section-header">
        <strong>Livrari alerte</strong>
        <span>{deliveries.length}</span>
      </div>
      <div className="alert-delivery-list">
        {deliveries.map((delivery) => (
          <article key={delivery.id} className={`is-${delivery.status}`}>
            <div>
              <strong>{delivery.title}</strong>
              <span>
                {delivery.channel} · {delivery.deliveredAt}
              </span>
            </div>
            <em>{delivery.status}</em>
          </article>
        ))}
      </div>
    </section>
  );
}

function AlertOpsPanel({
  deliveries,
  savedSearches
}: {
  deliveries: AlertDelivery[];
  savedSearches: SavedSearch[];
}) {
  const sentCount = deliveries.filter((delivery) => delivery.status === "sent").length;
  const pendingCount = deliveries.filter((delivery) => delivery.status === "pending").length;
  const failedCount = deliveries.filter((delivery) => delivery.status === "failed").length;
  const activeSearches = savedSearches.filter((search) => search.alertsEnabled).length;
  const channels = Array.from(new Set(deliveries.map((delivery) => delivery.channel))).join(", ") || "in-app";

  return (
    <section className="operations-panel alert-ops-panel" data-testid="alert-ops-panel">
      <div className="drawer-section-header">
        <strong>Alert operations</strong>
        <span>{activeSearches} active</span>
      </div>
      <div className="alert-ops-grid">
        <article>
          <span>Sent</span>
          <strong>{sentCount}</strong>
          <small>livrari confirmate</small>
        </article>
        <article>
          <span>Retry queue</span>
          <strong>{pendingCount + failedCount}</strong>
          <small>pending + failed</small>
        </article>
        <article>
          <span>Canale</span>
          <strong>{channels}</strong>
          <small>configurate in livrari</small>
        </article>
      </div>
      <div className="alert-route-list">
        <article className={pendingCount > 0 ? "is-warning" : "is-ok"}>
          <strong>Pending delivery</strong>
          <span>{pendingCount > 0 ? "Verifica job queue si backoff inainte de retrimitere." : "Nu exista livrari pending in demo."}</span>
        </article>
        <article className={failedCount > 0 ? "is-danger" : "is-ok"}>
          <strong>Failed delivery</strong>
          <span>{failedCount > 0 ? "Necesita inspectie pe canal si payload." : "Nu exista livrari esuate."}</span>
        </article>
        <article className={activeSearches > 0 ? "is-ok" : "is-warning"}>
          <strong>Saved search coverage</strong>
          <span>{activeSearches > 0 ? "Cautarile active pot produce alerte." : "Nu exista cautari active pentru alerte."}</span>
        </article>
      </div>
    </section>
  );
}

function AccountAccessPanel(props: AccountAccessPanelProps) {
  return (
    <section id="account-access-panel" className={`operations-panel account-access-panel${props.compact ? " is-compact" : ""}`} data-testid="supabase-auth">
      <div className="drawer-section-header">
        <strong>Cont agentie</strong>
        <span>{props.authSessionEmail ? "Autentificat" : "Neautentificat"}</span>
      </div>
      {props.compact ? null : (
        <p className="drawer-status-note">Autentificarea sta la nivel de workspace, nu in detaliul unui anunt.</p>
      )}
      <form className="compact-form" onSubmit={props.onAuthSubmit}>
        <label>
          <span>Email cont</span>
          <input
            type="email"
            aria-label="Email Supabase"
            value={props.authEmail}
            onChange={(event) => props.onAuthEmailChange(event.target.value)}
            autoComplete="email"
            placeholder="agent@agentie.ro"
            required
          />
        </label>
        <label>
          <span>Parola</span>
          <input
            type="password"
            aria-label="Parola Supabase"
            value={props.authPassword}
            onChange={(event) => props.onAuthPasswordChange(event.target.value)}
            autoComplete="current-password"
            placeholder="Parola contului"
            required
          />
        </label>
        <div className="compact-form-actions">
          <button type="submit" aria-label="Login Supabase" disabled={props.isAuthLoading}>
            {props.isAuthLoading ? "Se autentifica" : "Autentificare"}
          </button>
          <button type="button" onClick={props.onAuthLogout} disabled={!props.authSessionEmail}>
            Logout
          </button>
        </div>
      </form>
      <p className="drawer-status-note">{props.authMessage}</p>
    </section>
  );
}

interface SavedSearchesPanelProps {
  savedSearches: SavedSearch[];
  savedSearchName: string;
  savedSearchCriteria: string;
  savedSearchFrequency: SavedSearch["frequency"];
  savedSearchAlertChannel: SavedSearch["alertChannel"];
  savedSearchAlertsEnabled: boolean;
  savedSearchMessage: string;
  editingSavedSearchId: string | null;
  onSavedSearchNameChange: (name: string) => void;
  onSavedSearchCriteriaChange: (criteria: string) => void;
  onSavedSearchFrequencyChange: (frequency: SavedSearch["frequency"]) => void;
  onSavedSearchAlertChannelChange: (channel: SavedSearch["alertChannel"]) => void;
  onSavedSearchAlertsEnabledChange: (enabled: boolean) => void;
  onSavedSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSavedSearchEdit: (search: SavedSearch) => void;
  onSavedSearchDelete: (search: SavedSearch) => void;
}

function SavedSearchesPanel(props: SavedSearchesPanelProps) {
  return (
    <section id="saved-searches" className="operations-panel saved-searches-panel" data-testid="saved-searches">
      <div className="drawer-section-header">
        <strong>Cautari salvate</strong>
        <span>{props.savedSearches.length}</span>
      </div>
      <form className="compact-form" onSubmit={props.onSavedSearchSubmit}>
        <label>
          <span>Nume cautare</span>
          <input
            value={props.savedSearchName}
            onChange={(event) => props.onSavedSearchNameChange(event.target.value)}
            placeholder="Apartamente Bucuresti sub 120k"
            required
          />
        </label>
        <label>
          <span>Criterii cautare</span>
          <input
            value={props.savedSearchCriteria}
            onChange={(event) => props.onSavedSearchCriteriaChange(event.target.value)}
            placeholder="sale apartment Bucuresti max 120000 EUR"
            required
          />
        </label>
        <div className="drawer-inline-grid">
          <RadarSelect
            className="compact-select"
            label="Frecventa alerta"
            value={props.savedSearchFrequency}
            options={savedSearchFrequencyOptions}
            onChange={props.onSavedSearchFrequencyChange}
          />
          <RadarSelect
            className="compact-select"
            label="Canal alerta"
            value={props.savedSearchAlertChannel}
            options={savedSearchAlertChannelOptions}
            onChange={props.onSavedSearchAlertChannelChange}
          />
        </div>
        <label className="compact-check">
          <input
            type="checkbox"
            checked={props.savedSearchAlertsEnabled}
            onChange={(event) => props.onSavedSearchAlertsEnabledChange(event.target.checked)}
          />
          <span>Alerte active</span>
        </label>
        <button type="submit">{props.editingSavedSearchId ? "Actualizeaza cautare" : "Salveaza cautare"}</button>
      </form>
      <p className="drawer-status-note">{props.savedSearchMessage}</p>
      <div className="saved-search-list">
        {props.savedSearches.map((search) => (
          <article key={search.id}>
            <strong>{search.name}</strong>
            <span>{search.criteria}</span>
            <em>
              {search.matches} match · {search.frequency} · {search.alertChannel} · {search.alertsEnabled ? "on" : "off"}
            </em>
            <div className="compact-form-actions">
              <button type="button" aria-label={`Editeaza ${search.name}`} onClick={() => props.onSavedSearchEdit(search)}>
                Editeaza
              </button>
              <button type="button" aria-label={`Sterge ${search.name}`} onClick={() => props.onSavedSearchDelete(search)}>
                Sterge
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
