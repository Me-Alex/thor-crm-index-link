import type { DemoListing } from "../data/demoData";
import type { TenantWorkflowItem, TenantWorkflowStatus } from "../lib/tenantWorkflowApi";
import type { SpatialAction, SpatialNode } from "./types";
import { useState } from "react";

interface NodeInspectorProps {
  node: SpatialNode | undefined;
  listing: DemoListing | undefined;
  workflowItem: TenantWorkflowItem | undefined;
  workflowMode: "demo" | "live";
  workflowMessage: string;
  workflowActionMessage: string;
  isLoadingWorkflow: boolean;
  onWorkflowStatusChange: (listingId: string, status: TenantWorkflowStatus) => void;
  onWorkflowNoteCreate: (listingId: string, body: string) => void;
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
  onWorkflowNoteCreate,
  onFocusNode
}: NodeInspectorProps) {
  const [noteDraftByListingId, setNoteDraftByListingId] = useState<Record<string, string>>({});

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
  const noteDraft = listing ? noteDraftByListingId[listing.id] ?? "" : "";
  const noteCount = workflowItem?.notes.length ?? node.noteCount ?? 0;

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
                <span>Coverage: {Math.round(source.fieldCoverageRate * 100)}%</span>
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
          <p>Note count: {noteCount}</p>
          {workflowItem?.tags.length ? (
            <div className="workflow-tags" aria-label="Workflow tags">
              {workflowItem.tags.map((tag) => (
                <span key={tag.id} style={{ borderColor: tag.color }}>
                  {tag.name}
                </span>
              ))}
            </div>
          ) : null}
          {workflowItem?.notes.length ? (
            <div className="workflow-notes" aria-label="Workflow notes">
              {workflowItem.notes.slice(0, 3).map((note) => (
                <article key={note.id}>
                  <p>{note.body}</p>
                  <time dateTime={note.createdAt}>{note.createdAt}</time>
                </article>
              ))}
            </div>
          ) : null}
          {listing ? (
            <form
              className="workflow-note-form"
              onSubmit={(event) => {
                event.preventDefault();
                const trimmedDraft = noteDraft.trim();
                if (!trimmedDraft) {
                  return;
                }
                onWorkflowNoteCreate(listing.id, trimmedDraft);
                setNoteDraftByListingId((currentDrafts) => ({ ...currentDrafts, [listing.id]: "" }));
              }}
            >
              <label>
                <span>Nota workflow</span>
                <textarea
                  value={noteDraft}
                  onChange={(event) =>
                    setNoteDraftByListingId((currentDrafts) => ({ ...currentDrafts, [listing.id]: event.target.value }))
                  }
                  placeholder="Adauga context tenant fara a rehosta continutul portalului"
                  rows={3}
                />
              </label>
              <button type="submit" disabled={isLoadingWorkflow || !noteDraft.trim()}>
                Adauga nota
              </button>
            </form>
          ) : null}
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
              return null;
            }

            return null;
          })}
        </div>
      ) : null}
    </aside>
  );
}
