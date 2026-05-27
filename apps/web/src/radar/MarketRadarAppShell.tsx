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
import { buildRadarViewModel, type RadarFilters, type RadarSelectionTarget } from "./radarModel";
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

export function MarketRadarAppShell(props: MarketRadarAppShellProps) {
  const [filters, setFilters] = useState<RadarFilters>(defaultFilters);
  const deferredQuery = useDeferredValue(filters.query);
  const [activePage, setActivePage] = useState<RadarPageId>("monitor");
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

  const handlePageNavigate = (pageId: string) => {
    setActivePage(pageId as RadarPageId);
    if (!window.navigator.userAgent.toLowerCase().includes("jsdom")) {
      window.scrollTo?.({ top: 0, behavior: "smooth" });
    }
  };

  const currentPage = pageCopy[activePage];
  const showCommandBar = activePage === "monitor" || activePage === "listings";

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
                onSelectListing={handleListingSelect}
              />
            </div>
          </div>
        </div>
        ) : null}

        {activePage === "listings" || activePage === "dedup" ? (
        <div className={`radar-detail-grid${activePage === "dedup" ? " is-dedup-page" : ""}`} aria-label="Listing workflow and operations">
          {activePage === "listings" ? (
            <div className="radar-operations-column">
              <HotOpportunitiesPanel
                opportunities={viewModel.opportunities}
                selectedListingId={viewModel.selectedListing?.id}
                onSelectListing={handleListingSelect}
              />
            </div>
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
            onSelectListing={handleListingSelect}
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

function SourceHealthPanel({ sources }: { sources: SourceHealth[] }) {
  const activeSources = sources.filter((source) => source.mode === "on").length;
  const degradedSources = sources.filter((source) => source.mode === "degraded").length;
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
    </section>
  );
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
