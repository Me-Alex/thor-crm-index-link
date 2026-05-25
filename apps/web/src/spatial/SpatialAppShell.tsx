import type { AlertDelivery, DemoListing, SavedSearch, SourceHealth } from "../data/demoData";
import type { TenantWorkflowItem, TenantWorkflowStatus } from "../lib/tenantWorkflowApi";
import { CanvasMinimap } from "./CanvasMinimap";
import { CanvasToolbox } from "./CanvasToolbox";
import { CommandBar } from "./CommandBar";
import { NodeInspector } from "./NodeInspector";
import { NodeStackMobile } from "./NodeStackMobile";
import { SpatialUtilityPanel } from "./SpatialUtilityPanel";
import { SpatialCanvas } from "./SpatialCanvas";
import "./spatialStyles.css";
import { useSpatialWorkspace } from "./useSpatialWorkspace";
import type { FormEvent } from "react";

interface SpatialAppShellProps {
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
}

export function SpatialAppShell(props: SpatialAppShellProps) {
  const workspace = useSpatialWorkspace({
    listings: props.listings,
    sourceHealth: props.sourceHealth,
    workflowItems: props.workflowItems,
    savedSearches: props.savedSearches,
    alertDeliveries: props.alertDeliveries
  });

  return (
    <main className="spatial-app-shell">
      <CommandBar
        commandQuery={workspace.commandQuery}
        dataMode={props.dataMode}
        dataMessage={props.dataMessage}
        listingCount={workspace.graph.summary.listingCount}
        isLoadingListings={props.isLoadingListings}
        onCommandQueryChange={workspace.setCommandQuery}
        onRefreshListings={props.onRefreshListings}
      />
      <CanvasToolbox />
      <SpatialUtilityPanel
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
      <div className="spatial-workspace">
        <SpatialCanvas
          graph={workspace.graph}
          selectedNodeId={workspace.graph.selectedNodeId}
          onSelectNode={workspace.selectNode}
        />
        <NodeStackMobile
          graph={workspace.graph}
          selectedNodeId={workspace.graph.selectedNodeId}
          onSelectNode={workspace.selectNode}
        />
        <CanvasMinimap graph={workspace.graph} selectedNodeId={workspace.graph.selectedNodeId} />
      </div>
      <NodeInspector
        node={workspace.selectedNode}
        listing={workspace.selectedListing}
        workflowItem={workspace.selectedWorkflowItem}
        workflowMode={props.workflowMode}
        workflowMessage={props.workflowMessage}
        workflowActionMessage={props.workflowActionMessage}
        isLoadingWorkflow={props.isLoadingWorkflow}
        onWorkflowStatusChange={props.onWorkflowStatusChange}
        onWorkflowNoteCreate={props.onWorkflowNoteCreate}
        onFocusNode={workspace.selectNode}
      />
    </main>
  );
}
