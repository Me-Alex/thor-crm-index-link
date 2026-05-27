import { useState, type FormEvent } from "react";
import type { DemoListing } from "../data/demoData";
import type { TenantWorkflowItem, TenantWorkflowStatus } from "../lib/tenantWorkflowApi";
import { RadarSelect } from "./RadarSelect";
import type { RadarCluster } from "./radarModel";

interface SelectedListingDrawerProps {
  listing: DemoListing | undefined;
  workflowItem: TenantWorkflowItem | undefined;
  cluster: RadarCluster | undefined;
  availableListings: DemoListing[];
  workflowMode: "demo" | "live";
  workflowMessage: string;
  workflowActionMessage: string;
  isLoadingWorkflow: boolean;
  onSelectListing: (listingId: string) => void;
  onWorkflowStatusChange: (listingId: string, status: TenantWorkflowStatus) => void;
  onWorkflowNoteCreate: (listingId: string, body: string) => void;
}

const formatCurrency = new Intl.NumberFormat("ro-RO", {
  maximumFractionDigits: 0,
  style: "currency",
  currency: "EUR"
});

const workflowStatuses: Array<{ label: string; value: TenantWorkflowStatus }> = [
  { label: "New", value: "new" },
  { label: "In progress", value: "in_progress" },
  { label: "Contacted", value: "contacted" },
  { label: "Ignored", value: "ignored" },
  { label: "Archived", value: "archived" }
];

const workflowStatusLabels: Record<TenantWorkflowStatus, string> = {
  new: "New",
  in_progress: "In progress",
  contacted: "Contacted",
  ignored: "Ignored",
  archived: "Archived"
};

export function SelectedListingDrawer(props: SelectedListingDrawerProps) {
  const [noteDraft, setNoteDraft] = useState("");
  const [activeDetailsTab, setActiveDetailsTab] = useState<"cluster" | "all" | "history">("cluster");
  const selectedListing = props.listing;
  const selectedZone = selectedListing
    ? selectedListing.neighborhood || selectedListing.district || selectedListing.city || props.cluster?.label || "Zona necunoscuta"
    : (props.cluster?.label ?? "Cluster");

  const handleNoteSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedListing) {
      return;
    }

    props.onWorkflowNoteCreate(selectedListing.id, noteDraft);
    setNoteDraft("");
  };

  return (
    <aside
      id="selected-listing-detail"
      className="selected-listing-drawer"
      data-testid="selected-listing-drawer"
      aria-label="Detalii selectie"
    >
      <div className="drawer-topbar">
        <div>
          <span>Detalii selectie · {props.cluster?.label ?? props.listing?.neighborhood ?? "Cluster"}</span>
          <strong>{selectedListing ? `${selectedZone} cluster` : "Cluster"}</strong>
        </div>
        <RadarSelect
          className="drawer-listing-switcher"
          label="Selecteaza anunt"
          value={props.listing?.id ?? ""}
          options={props.availableListings.map((listing) => ({ label: listing.title, value: listing.id }))}
          onChange={props.onSelectListing}
          disabled={props.availableListings.length === 0}
        />
      </div>

      {selectedListing ? (
        <>
          <section className="drawer-section">
            <div className="drawer-tabs" aria-label="Detalii listing">
              <button
                type="button"
                className={activeDetailsTab === "cluster" ? "is-active" : ""}
                aria-pressed={activeDetailsTab === "cluster"}
                onClick={() => setActiveDetailsTab("cluster")}
              >
                Cluster
              </button>
              <button
                type="button"
                className={activeDetailsTab === "all" ? "is-active" : ""}
                aria-pressed={activeDetailsTab === "all"}
                onClick={() => setActiveDetailsTab("all")}
              >
                View all ({props.cluster?.count ?? props.availableListings.length})
              </button>
              <button
                type="button"
                className={activeDetailsTab === "history" ? "is-active" : ""}
                aria-pressed={activeDetailsTab === "history"}
                onClick={() => setActiveDetailsTab("history")}
              >
                Istoric
              </button>
            </div>

            {activeDetailsTab === "cluster" ? (
              <>
                <div className="drawer-section-header">
                  <strong>{selectedListing.title}</strong>
                  <span>{Math.round(selectedListing.matchScore * 100)}% potrivire surse</span>
                </div>
                <p className="drawer-compliance-note">Index + link: trimitem catre sursa originala.</p>
                <div className="drawer-zone-grid">
                  <article>
                    <span>Zona</span>
                    <strong>{selectedZone}</strong>
                  </article>
                  <article>
                    <span>Lat/Lng</span>
                    <strong>44.43 / 26.10</strong>
                  </article>
                  <article>
                    <span>Pret mediu</span>
                    <strong>{Math.round(selectedListing.priceEur / Math.max(selectedListing.areaSqm, 1))} €/mp</strong>
                  </article>
                  <article>
                    <span>Trend 7 zile</span>
                    <strong>{selectedListing.changedToday ? "Schimbat" : "Stabil"}</strong>
                  </article>
                </div>
                <div className="drawer-metric-grid">
                  <article>
                    <span>Pret</span>
                    <strong>{formatCurrency.format(selectedListing.priceEur)}</strong>
                  </article>
                  <article>
                    <span>Suprafata</span>
                    <strong>{selectedListing.areaSqm} mp</strong>
                  </article>
                  <article>
                    <span>Camere</span>
                    <strong>{selectedListing.rooms}</strong>
                  </article>
                  <article>
                    <span>Status</span>
                    <strong>{props.workflowItem ? workflowStatusLabels[props.workflowItem.status] : selectedListing.status}</strong>
                  </article>
                </div>
                <div className="drawer-source-links">
                  {selectedListing.sources.map((source) => (
                    <a
                      key={`${selectedListing.id}-${source.name}`}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open source · ${source.name}`}
                    >
                      Deschide sursa · {source.name}
                    </a>
                  ))}
                </div>
              </>
            ) : null}

            {activeDetailsTab === "all" ? (
              <div className="drawer-listing-list" data-testid="drawer-listing-list">
                {props.availableListings.map((listing) => (
                  <button
                    key={listing.id}
                    type="button"
                    className={listing.id === selectedListing.id ? "is-active" : ""}
                    onClick={() => props.onSelectListing(listing.id)}
                  >
                    <strong>{listing.title}</strong>
                    <span>
                      {formatCurrency.format(listing.priceEur)} · {listing.areaSqm} mp · {listing.rooms} camere
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            {activeDetailsTab === "history" ? (
              <div className="drawer-history-grid">
                <div>
                  <div className="drawer-section-header">
                    <strong>Istoric pret</strong>
                    <span>{selectedListing.history.length} observatii</span>
                  </div>
                  <PriceHistoryChart listing={selectedListing} />
                </div>
                <div className="drawer-source-cluster">
                  <div className="drawer-section-header">
                    <strong>Surse in cluster</strong>
                    <span>{selectedListing.sources.length}</span>
                  </div>
                  {selectedListing.sources.map((source) => (
                    <article key={`${selectedListing.id}-${source.name}`}>
                      <strong>{source.name}</strong>
                      <span>{Math.round(source.matchScore * 100)}%</span>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="drawer-section">
            <div className="drawer-section-header">
              <strong>Workflow agentie</strong>
              <span>{props.workflowMode}</span>
            </div>
            <p className="drawer-status-note">{props.workflowMessage}</p>
            <div className="workflow-status-buttons">
              {workflowStatuses.map((status) => (
                <button
                  key={status.value}
                  type="button"
                  className={props.workflowItem?.status === status.value ? "is-active" : ""}
                  onClick={() => props.onWorkflowStatusChange(selectedListing.id, status.value)}
                  disabled={props.isLoadingWorkflow}
                >
                  {status.label}
                </button>
              ))}
            </div>
            <div className="workflow-meta">
              <span>Assignee: {props.workflowItem?.assignee ?? selectedListing.assignee}</span>
              <span>Note count: {props.workflowItem?.notes.length ?? 0}</span>
            </div>
            <div className="workflow-tags" aria-label="Workflow tags">
              {(props.workflowItem?.tags ?? []).map((tag) => (
                <span key={tag.id}>{tag.name}</span>
              ))}
            </div>
            <div className="workflow-notes">
              {(props.workflowItem?.notes ?? []).map((note) => (
                <article key={note.id}>
                  <strong>{note.authorUserId}</strong>
                  <p>{note.body}</p>
                  <time>{note.createdAt}</time>
                </article>
              ))}
            </div>
            <form className="workflow-note-form" onSubmit={handleNoteSubmit}>
              <label>
                <span>Nota</span>
                <textarea
                  aria-label="Nota workflow"
                  rows={3}
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  placeholder="Contact proprietar azi."
                />
              </label>
              <button type="submit" disabled={!noteDraft.trim()}>
                Adauga nota
              </button>
            </form>
            <p className="drawer-status-note">{props.workflowActionMessage}</p>
          </section>
        </>
      ) : (
        <section className="drawer-section">
          <div className="drawer-section-header">
            <strong>{props.cluster?.label ?? "Cluster"}</strong>
            <span>{props.cluster?.count ?? 0} listinguri</span>
          </div>
          <p className="drawer-status-note">{props.cluster?.summary ?? "Nu exista listing selectat."}</p>
        </section>
      )}

    </aside>
  );
}
function PriceHistoryChart({ listing }: { listing: DemoListing }) {
  const points = listing.history.map((point) => point.priceEur);
  const maxValue = Math.max(...points, listing.priceEur);
  const minValue = Math.min(...points, listing.priceEur);
  const spread = Math.max(maxValue - minValue, 1);

  const path = listing.history
    .map((point, index) => {
      const x = (index / Math.max(listing.history.length - 1, 1)) * 100;
      const y = 100 - ((point.priceEur - minValue) / spread) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="price-history-chart">
      <svg viewBox="0 0 100 100" aria-label="Istoric pret">
        <polyline fill="none" points={path} stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="price-history-labels">
        {listing.history.map((point) => (
          <span key={`${listing.id}-${point.date}`}>{point.date}</span>
        ))}
      </div>
    </div>
  );
}
