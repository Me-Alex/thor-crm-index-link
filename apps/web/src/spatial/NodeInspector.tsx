import type { DemoListing } from "../data/demoData";
import type { TenantWorkflowItem, TenantWorkflowStatus } from "../lib/tenantWorkflowApi";
import type { SpatialAction, SpatialNode } from "./types";

interface NodeInspectorProps {
  node: SpatialNode | undefined;
  listing: DemoListing | undefined;
  workflowItem: TenantWorkflowItem | undefined;
  workflowMode: "demo" | "live";
  workflowMessage: string;
  workflowActionMessage: string;
  isLoadingWorkflow: boolean;
  onWorkflowStatusChange: (listingId: string, status: TenantWorkflowStatus) => void;
  onFocusNode: (nodeId: string) => void;
}

export function NodeInspector({
  node,
  listing,
  workflowItem,
  workflowMode,
  workflowMessage,
  workflowActionMessage,
  isLoadingWorkflow,
  onWorkflowStatusChange,
  onFocusNode
}: NodeInspectorProps) {
  if (!node) {
    return (
      <aside className="node-inspector" data-testid="node-inspector">
        <h2>Inspector</h2>
        <p>Selecteaza un nod din canvas.</p>
      </aside>
    );
  }

  const workflowActions = node.actions.filter(
    (action): action is Extract<SpatialAction, { type: "update_status" }> => action.type === "update_status"
  );
  const secondaryActions = node.actions.filter((action) => action.type !== "update_status" && (!listing || action.type !== "open_url"));

  return (
    <aside className="node-inspector" data-testid="node-inspector">
      <span className="inspector-eyebrow">{node.eyebrow}</span>
      <h2>{node.title}</h2>
      <p>{node.body}</p>
      <dl className="inspector-metrics">
        {node.metrics.map((metric) => (
          <div key={`${node.id}-${metric.label}`}>
            <dt>{metric.label}</dt>
            <dd>{metric.value}</dd>
          </div>
        ))}
      </dl>
      {listing ? (
        <section className="inspector-section" aria-labelledby={`${node.id}-index-link`}>
          <h3 id={`${node.id}-index-link`}>Index + link</h3>
          <p>
            {listing.city} · {listing.neighborhood} · {listing.areaSqm} mp · {listing.rooms} camere
          </p>
          <div className="source-links">
            {listing.sources.map((source) => (
              <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                Open source · {source.name}
              </a>
            ))}
          </div>
        </section>
      ) : null}
      {node.kind === "source_health" && node.sourceHealthDetails ? (
        <section className="inspector-section" aria-labelledby={`${node.id}-source-details`}>
          <h3 id={`${node.id}-source-details`}>Per-source health</h3>
          <div className="source-health-details">
            {node.sourceHealthDetails.map((source) => (
              <article key={source.id}>
                <strong>{source.name}</strong>
                <span>Mode: {source.mode}</span>
                <span>Listings: {source.listingCount ?? "n/a"}</span>
                <span>Latest seen: {source.latestSeenAt ?? "n/a"}</span>
                <span>Parse: {Math.round(source.parseSuccessRate * 100)}%</span>
                <span>Time-to-index: {source.timeToIndexMinutes} min</span>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      {node.kind === "tenant_workflow" || listing ? (
        <section className="inspector-section" aria-labelledby={`${node.id}-workflow`}>
          <h3 id={`${node.id}-workflow`}>Tenant workflow</h3>
          <p>
            {workflowMode === "live" ? "Workflow live" : "Workflow demo"} · {workflowMessage}
          </p>
          {workflowItem ? <p>Assignee: {workflowItem.assignee}</p> : null}
          {typeof node.noteCount === "number" ? <p>Note count: {node.noteCount}</p> : null}
          {workflowActionMessage ? <p className="inspector-note">{workflowActionMessage}</p> : null}
          {workflowActions.length > 0 ? (
            <div className="inspector-actions">
              {workflowActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  disabled={isLoadingWorkflow}
                  onClick={() => onWorkflowStatusChange(action.listingId, action.status)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
      {secondaryActions.length > 0 ? (
        <div className="inspector-actions">
          {secondaryActions.map((action) => {
            if (action.type === "open_url") {
              return (
                <a key={action.id} href={action.url} target="_blank" rel="noreferrer">
                  {action.label}
                </a>
              );
            }

            if (action.type === "focus_node") {
              return (
                <button key={action.id} type="button" onClick={() => onFocusNode(action.nodeId)}>
                  {action.label}
                </button>
              );
            }

            if (action.type === "add_note") {
              return (
                <button key={action.id} type="button">
                  {action.label}
                </button>
              );
            }

            return null;
          })}
        </div>
      ) : null}
    </aside>
  );
}
