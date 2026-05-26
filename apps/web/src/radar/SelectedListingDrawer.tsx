import { useState, type FormEvent } from "react";
import type { DemoListing, SavedSearch } from "../data/demoData";
import type { TenantWorkflowItem, TenantWorkflowStatus } from "../lib/tenantWorkflowApi";
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
  authSessionEmail: string | undefined;
  authEmail: string;
  authPassword: string;
  authMessage: string;
  isAuthLoading: boolean;
  savedSearches: SavedSearch[];
  savedSearchName: string;
  savedSearchCriteria: string;
  savedSearchFrequency: SavedSearch["frequency"];
  savedSearchAlertChannel: SavedSearch["alertChannel"];
  savedSearchAlertsEnabled: boolean;
  savedSearchMessage: string;
  editingSavedSearchId: string | null;
  onSelectListing: (listingId: string) => void;
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
  const selectedListing = props.listing;

  const handleNoteSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedListing) {
      return;
    }

    props.onWorkflowNoteCreate(selectedListing.id, noteDraft);
    setNoteDraft("");
  };

  return (
    <aside className="selected-listing-drawer" data-testid="selected-listing-drawer" aria-label="Detalii selectie">
      <div className="drawer-topbar">
        <div>
          <span>Detalii selectie</span>
          <strong>{props.cluster?.label ?? props.listing?.neighborhood ?? "Cluster"}</strong>
        </div>
        <label className="drawer-listing-switcher">
          <span>Selecteaza anunt</span>
          <select
            value={props.listing?.id ?? ""}
            onChange={(event) => props.onSelectListing(event.target.value)}
            disabled={props.availableListings.length === 0}
          >
            {props.availableListings.map((listing) => (
              <option key={listing.id} value={listing.id}>
                {listing.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedListing ? (
        <>
          <section className="drawer-section">
            <div className="drawer-section-header">
              <strong>{selectedListing.title}</strong>
              <span>{Math.round(selectedListing.matchScore * 100)}% dedup score</span>
            </div>
            <p className="drawer-compliance-note">Index + link: trimitem catre sursa originala.</p>
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
                <a key={`${selectedListing.id}-${source.name}`} href={source.url} target="_blank" rel="noreferrer">
                  Open source · {source.name}
                </a>
              ))}
            </div>
          </section>

          <section className="drawer-section drawer-history-grid">
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

      <section className="drawer-section" data-testid="supabase-auth">
        <div className="drawer-section-header">
          <strong>Tenant access</strong>
          <span>{props.authSessionEmail ? "Autentificat" : "Neautentificat"}</span>
        </div>
        <form className="compact-form" onSubmit={props.onAuthSubmit}>
          <label>
            <span>Email Supabase</span>
            <input
              type="email"
              value={props.authEmail}
              onChange={(event) => props.onAuthEmailChange(event.target.value)}
              autoComplete="email"
              placeholder="agent@agentie.ro"
              required
            />
          </label>
          <label>
            <span>Parola Supabase</span>
            <input
              type="password"
              value={props.authPassword}
              onChange={(event) => props.onAuthPasswordChange(event.target.value)}
              autoComplete="current-password"
              placeholder="Parola contului"
              required
            />
          </label>
          <div className="compact-form-actions">
            <button type="submit" disabled={props.isAuthLoading}>
              {props.isAuthLoading ? "Se autentifica" : "Login Supabase"}
            </button>
            <button type="button" onClick={props.onAuthLogout} disabled={!props.authSessionEmail}>
              Logout
            </button>
          </div>
        </form>
        <p className="drawer-status-note">{props.authMessage}</p>
      </section>

      <section className="drawer-section" data-testid="saved-searches">
        <div className="drawer-section-header">
          <strong>Saved searches</strong>
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
            <label>
              <span>Frecventa alerta</span>
              <select
                value={props.savedSearchFrequency}
                onChange={(event) => props.onSavedSearchFrequencyChange(parseFrequency(event.target.value))}
              >
                <option value="near real-time">near real-time</option>
                <option value="hourly">hourly</option>
                <option value="daily">daily</option>
              </select>
            </label>
            <label>
              <span>Canal alerta</span>
              <select
                value={props.savedSearchAlertChannel}
                onChange={(event) => props.onSavedSearchAlertChannelChange(parseChannel(event.target.value))}
              >
                <option value="in_app">in-app</option>
                <option value="email">email</option>
                <option value="webhook">webhook</option>
              </select>
            </label>
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

function parseFrequency(value: string): SavedSearch["frequency"] {
  return value === "hourly" || value === "daily" ? value : "near real-time";
}

function parseChannel(value: string): SavedSearch["alertChannel"] {
  return value === "email" || value === "webhook" ? value : "in_app";
}
