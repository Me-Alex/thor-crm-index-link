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
import { ActivityTimeline } from "./ActivityTimeline";
import { CommercialReadinessPanel } from "./CommercialReadinessPanel";
import { HotOpportunitiesPanel } from "./HotOpportunitiesPanel";
import { MarketMap } from "./MarketMap";
import { RadarCommandBar } from "./RadarCommandBar";
import { RadarKpiStrip } from "./RadarKpiStrip";
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
  workflowMessage: string;
  workflowActionMessage: string;
  isLoadingListings: boolean;
  isLoadingWorkflow: boolean;
  authSessionEmail: string | undefined;
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

export function MarketRadarAppShell(props: MarketRadarAppShellProps) {
  const [filters, setFilters] = useState<RadarFilters>(defaultFilters);
  const deferredQuery = useDeferredValue(filters.query);
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
  };

  return (
    <main className="radar-shell" data-testid="market-radar-shell">
      <RadarSidebar authSessionEmail={props.authSessionEmail} />

      <section className="radar-workspace">
        <RadarCommandBar
          location={filters.location}
          propertyType={filters.propertyType}
          transactionType={filters.transactionType}
          priceMin={filters.priceMin}
          priceMax={filters.priceMax}
          query={filters.query}
          dataMode={props.dataMode}
          dataMessage={props.dataMessage}
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

        <div className="radar-grid">
          <div className="radar-primary-column">
            <MarketMap
              clusters={viewModel.clusters}
              selectedTarget={selectedTarget}
              sourceHealth={viewModel.sourceHealthSummary}
              onSelectCluster={(cluster) =>
                setSelectedTarget(cluster.representativeListingId ? { type: "listing", id: cluster.representativeListingId } : { type: "cluster", id: cluster.id })
              }
            />
            <ActivityTimeline events={viewModel.events} />
            <RadarKpiStrip kpis={viewModel.kpis} />
          </div>

          <div className="radar-secondary-column">
            <HotOpportunitiesPanel
              opportunities={viewModel.opportunities}
              selectedListingId={viewModel.selectedListing?.id}
              onSelectListing={handleListingSelect}
            />
            <SelectedListingDrawer
              listing={viewModel.selectedListing}
              workflowItem={viewModel.selectedWorkflowItem}
              cluster={viewModel.selectedCluster}
              availableListings={viewModel.opportunities.map((item) => item.listing)}
              workflowMode={props.workflowMode}
              workflowMessage={props.workflowMessage}
              workflowActionMessage={props.workflowActionMessage}
              isLoadingWorkflow={props.isLoadingWorkflow}
              authSessionEmail={props.authSessionEmail}
              authEmail={props.authEmail}
              authPassword={props.authPassword}
              authMessage={props.authMessage}
              isAuthLoading={props.isAuthLoading}
              savedSearches={props.savedSearches}
              savedSearchName={props.savedSearchName}
              savedSearchCriteria={props.savedSearchCriteria}
              savedSearchFrequency={props.savedSearchFrequency}
              savedSearchAlertChannel={props.savedSearchAlertChannel}
              savedSearchAlertsEnabled={props.savedSearchAlertsEnabled}
              savedSearchMessage={props.savedSearchMessage}
              editingSavedSearchId={props.editingSavedSearchId}
              onSelectListing={handleListingSelect}
              onWorkflowStatusChange={props.onWorkflowStatusChange}
              onWorkflowNoteCreate={props.onWorkflowNoteCreate}
              onAuthEmailChange={props.onAuthEmailChange}
              onAuthPasswordChange={props.onAuthPasswordChange}
              onAuthSubmit={props.onAuthSubmit}
              onAuthLogout={props.onAuthLogout}
              onSavedSearchNameChange={props.onSavedSearchNameChange}
              onSavedSearchCriteriaChange={props.onSavedSearchCriteriaChange}
              onSavedSearchFrequencyChange={props.onSavedSearchFrequencyChange}
              onSavedSearchAlertChannelChange={props.onSavedSearchAlertChannelChange}
              onSavedSearchAlertsEnabledChange={props.onSavedSearchAlertsEnabledChange}
              onSavedSearchSubmit={props.onSavedSearchSubmit}
              onSavedSearchEdit={props.onSavedSearchEdit}
              onSavedSearchDelete={props.onSavedSearchDelete}
            />
            <CommercialReadinessPanel
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
        </div>
      </section>
    </main>
  );
}
