import { useMemo, useState } from "react";
import {
  alertDeliveries,
  demoListings,
  githubRepoUrl,
  savedSearches,
  sourceHealth,
  supabaseProjectUrl,
  workerHealthUrl,
  type DemoListing,
  type PropertyType,
  type TransactionType
} from "./data/demoData";
import { filterListings, summarizeListings, type ListingFilters } from "./lib/filterListings";

const formatEuro = new Intl.NumberFormat("ro-RO", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0
});

const propertyLabels: Record<PropertyType, string> = {
  apartment: "Apartament",
  house: "Casa",
  land: "Teren",
  commercial: "Comercial"
};

const transactionLabels: Record<TransactionType, string> = {
  sale: "Vanzare",
  rent: "Inchiriere"
};

function App() {
  const [filters, setFilters] = useState<ListingFilters>({});
  const filteredListings = useMemo(() => filterListings(demoListings, filters), [filters]);
  const summary = useMemo(() => summarizeListings(demoListings), []);
  const selectedListing = filteredListings[0] ?? demoListings[0];

  if (!selectedListing) {
    throw new Error("Demo listings are required to render the dashboard");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Navigatie produs">
        <div className="brand-mark">T</div>
        <nav>
          <a href="#search">Search</a>
          <a href="#detail">Detail</a>
          <a href="#saved">Saved</a>
          <a href="#alerts">Alerts</a>
          <a href="#health">Health</a>
        </nav>
      </aside>

      <section className="content">
        <header className="hero">
          <div>
            <p className="system-label">CRM imobiliar RO · index + link</p>
            <h1>Thor CRM Index + Link</h1>
            <p className="hero-copy">
              Dashboard public demo pentru agregare, deduplicare si workflow per agentie. Continutul ramane indexat
              sumar, cu link catre sursa originala.
            </p>
            <div className="hero-actions">
              <a className="primary-action" href="#search">
                Deschide search
              </a>
              <a className="secondary-action" href={githubRepoUrl} target="_blank" rel="noreferrer">
                GitHub
              </a>
            </div>
          </div>

          <div className="hero-panel" aria-label="Rezumat index">
            <Metric label="Anunturi demo" value={String(summary.total)} />
            <Metric label="Active in workflow" value={String(summary.active)} />
            <Metric label="Scor dedup mediu" value={`${Math.round(summary.averageMatchScore * 100)}%`} />
            <Metric label="Schimbate azi" value={String(summary.changedToday)} />
          </div>
        </header>

        <section className="status-strip" aria-label="Linkuri publicate">
          <StatusLink label="Cloudflare Worker" href={workerHealthUrl} value="health live" />
          <StatusLink label="Supabase" href={supabaseProjectUrl} value="RLS activ" />
          <StatusLink label="GitHub" href={githubRepoUrl} value="repo privat" />
        </section>

        <section className="dashboard-grid">
          <section id="search" className="panel wide">
            <div className="section-heading">
              <div>
                <h2>Search</h2>
                <p>Filtre precise pe campuri normalizate.</p>
              </div>
              <span className="count-pill">{filteredListings.length} rezultate</span>
            </div>

            <div className="filters" aria-label="Filtre listing">
              <select
                aria-label="Oras"
                value={filters.city ?? ""}
                onChange={(event) => {
                  const city = event.currentTarget.value;
                  setFilters((current) => (city ? { ...current, city } : omitFilter(current, "city")));
                }}
              >
                <option value="">Toate orasele</option>
                <option value="bucuresti">Bucuresti</option>
                <option value="cluj napoca">Cluj-Napoca</option>
                <option value="iasi">Iasi</option>
              </select>
              <select
                aria-label="Tranzactie"
                value={filters.transactionType ?? ""}
                onChange={(event) => {
                  const transactionType = parseTransactionType(event.currentTarget.value);
                  setFilters((current) =>
                    transactionType ? { ...current, transactionType } : omitFilter(current, "transactionType")
                  );
                }}
              >
                <option value="">Toate tranzactiile</option>
                <option value="sale">Vanzare</option>
                <option value="rent">Inchiriere</option>
              </select>
              <select
                aria-label="Tip proprietate"
                value={filters.propertyType ?? ""}
                onChange={(event) => {
                  const propertyType = parsePropertyType(event.currentTarget.value);
                  setFilters((current) =>
                    propertyType ? { ...current, propertyType } : omitFilter(current, "propertyType")
                  );
                }}
              >
                <option value="">Toate tipurile</option>
                <option value="apartment">Apartamente</option>
                <option value="house">Case</option>
                <option value="land">Terenuri</option>
              </select>
              <button
                type="button"
                onClick={() =>
                  setFilters({
                    city: "bucuresti",
                    transactionType: "sale",
                    propertyType: "apartment",
                    minPrice: 80000,
                    maxPrice: 120000
                  })
                }
              >
                Preset Bucuresti
              </button>
            </div>

            <div className="listing-table" role="table" aria-label="Rezultate listing">
              <div className="table-row table-head" role="row">
                <span>Titlu</span>
                <span>Pret</span>
                <span>MP</span>
                <span>Status</span>
                <span>Dedup</span>
              </div>
              {filteredListings.map((listing) => (
                <ListingRow key={listing.id} listing={listing} />
              ))}
            </div>
          </section>

          <section id="detail" className="panel" data-testid="listing-detail">
            <div className="section-heading compact">
              <div>
                <h2>Listing Detail</h2>
                <p>Anunt canonic + linkuri sursa.</p>
              </div>
            </div>
            <h3>{selectedListing.title}</h3>
            <dl className="detail-list">
              <div>
                <dt>Localizare</dt>
                <dd>
                  {selectedListing.neighborhood}, {selectedListing.district}
                </dd>
              </div>
              <div>
                <dt>Pret</dt>
                <dd>{formatEuro.format(selectedListing.priceEur)}</dd>
              </div>
              <div>
                <dt>Suprafata</dt>
                <dd>{selectedListing.areaSqm} mp</dd>
              </div>
              <div>
                <dt>Agent</dt>
                <dd>{selectedListing.assignee}</dd>
              </div>
            </dl>
            <p className="safe-note">Nu re-hostam descrieri integrale sau imagini portal; pastram index + link.</p>
            <div className="source-links">
              {selectedListing.sources.map((source) => (
                <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                  {source.name} · {Math.round(source.matchScore * 100)}%
                </a>
              ))}
            </div>
          </section>

          <section id="saved" className="panel">
            <h2>Saved Searches</h2>
            <div className="stack-list">
              {savedSearches.map((search) => (
                <article key={search.id} className="mini-card">
                  <strong>{search.name}</strong>
                  <span>{search.criteria}</span>
                  <em>
                    {search.matches} match · {search.frequency}
                  </em>
                </article>
              ))}
            </div>
          </section>

          <section id="alerts" className="panel">
            <h2>Alerts</h2>
            <div className="stack-list">
              {alertDeliveries.map((alert) => (
                <article key={alert.id} className="mini-card">
                  <strong>{alert.title}</strong>
                  <span>
                    {alert.channel} · {alert.deliveredAt}
                  </span>
                  <em className={`status-${alert.status}`}>{alert.status}</em>
                </article>
              ))}
            </div>
          </section>

          <section id="health" className="panel wide">
            <div className="section-heading">
              <div>
                <h2>Source Health</h2>
                <p>Observabilitate per sursa si circuit breaker operational.</p>
              </div>
              <a className="secondary-action small" href={workerHealthUrl} target="_blank" rel="noreferrer">
                Worker health
              </a>
            </div>
            <div className="health-grid">
              {sourceHealth.map((source) => (
                <article key={source.id} className={`health-card mode-${source.mode}`}>
                  <div>
                    <strong>{source.name}</strong>
                    <span>{source.mode}</span>
                  </div>
                  <Metric label="crawl" value={`${Math.round(source.crawlSuccessRate * 100)}%`} />
                  <Metric label="parse" value={`${Math.round(source.parseSuccessRate * 100)}%`} />
                  <Metric label="match" value={`${Math.round(source.matchRate * 100)}%`} />
                  <Metric label="latenta" value={`${source.timeToIndexMinutes} min`} />
                </article>
              ))}
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

function ListingRow({ listing }: { listing: DemoListing }) {
  return (
    <div className="table-row" role="row">
      <span>
        <strong>{listing.title}</strong>
        <small>
          {propertyLabels[listing.propertyType]} · {transactionLabels[listing.transactionType]} · {listing.neighborhood}
        </small>
      </span>
      <span>{formatEuro.format(listing.priceEur)}</span>
      <span>{listing.areaSqm}</span>
      <span>{listing.status}</span>
      <span>{Math.round(listing.matchScore * 100)}%</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusLink({ label, href, value }: { label: string; href: string; value: string }) {
  return (
    <a className="status-link" href={href} target="_blank" rel="noreferrer">
      <span>{label}</span>
      <strong>{value}</strong>
    </a>
  );
}

function parseTransactionType(value: string): TransactionType | undefined {
  return value === "sale" || value === "rent" ? value : undefined;
}

function parsePropertyType(value: string): PropertyType | undefined {
  return value === "apartment" || value === "house" || value === "land" || value === "commercial" ? value : undefined;
}

function omitFilter<Key extends keyof ListingFilters>(filters: ListingFilters, key: Key): ListingFilters {
  const { [key]: _removed, ...rest } = filters;
  return rest;
}

export default App;
