import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
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
import { fetchWorkerListings, resolveWorkerApiBaseUrl } from "./lib/listingsApi";
import {
  clearSupabaseAuthSession,
  getStoredSupabaseAuthSession,
  signInWithSupabasePassword
} from "./lib/supabaseAuth";
import {
  buildDemoTenantWorkflow,
  demoOrgId,
  demoTenantId,
  fetchTenantWorkflow,
  resolveTenantWorkflowAccessToken,
  updateTenantWorkflowStatus,
  type TenantWorkflowItem,
  type TenantWorkflowStatus
} from "./lib/tenantWorkflowApi";

const formatEuro = new Intl.NumberFormat("ro-RO", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0
});

const propertyLabels: Record<PropertyType, string> = {
  apartment: "Apartament",
  house: "Casa",
  land: "Teren",
  commercial: "Comercial",
  other: "Alt tip"
};

const transactionLabels: Record<TransactionType, string> = {
  sale: "Vanzare",
  rent: "Inchiriere"
};

const workflowStatusLabels: Record<TenantWorkflowStatus, string> = {
  new: "Nou",
  in_progress: "In lucru",
  contacted: "Contactat",
  ignored: "Ignorat",
  archived: "Arhivat"
};

function App() {
  const [filters, setFilters] = useState<ListingFilters>({});
  const [listings, setListings] = useState<DemoListing[]>(demoListings);
  const [dataMode, setDataMode] = useState<"fallback" | "live">("fallback");
  const [dataMessage, setDataMessage] = useState("Se incearca incarcarea din Worker API.");
  const [isLoadingListings, setIsLoadingListings] = useState(false);
  const [authSession, setAuthSession] = useState(getStoredSupabaseAuthSession);
  const [authEmail, setAuthEmail] = useState(() => getStoredSupabaseAuthSession()?.email ?? "");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState(() => {
    const session = getStoredSupabaseAuthSession();
    return session?.email
      ? `Autentificat ca ${session.email}.`
      : "Login Supabase: foloseste access token de utilizator pentru workflow tenant.";
  });
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [workflowItems, setWorkflowItems] = useState<TenantWorkflowItem[]>(() =>
    buildDemoTenantWorkflow(demoListings, demoTenantId)
  );
  const [workflowMode, setWorkflowMode] = useState<"demo" | "live">("demo");
  const [workflowMessage, setWorkflowMessage] = useState("Workflow demo: se folosesc listingurile indexate local.");
  const [workflowActionMessage, setWorkflowActionMessage] = useState("");
  const [isLoadingWorkflow, setIsLoadingWorkflow] = useState(false);
  const workflowStatusOverrides = useRef(new Map<string, TenantWorkflowStatus>());
  const filteredListings = useMemo(() => filterListings(listings, filters), [filters, listings]);
  const summary = useMemo(() => summarizeListings(listings), [listings]);
  const workflowSummary = useMemo(() => summarizeWorkflow(workflowItems), [workflowItems]);
  const selectedListing = filteredListings[0] ?? listings[0];
  const applyWorkflowOverrides = (items: TenantWorkflowItem[]) =>
    items.map((item) => {
      const status = workflowStatusOverrides.current.get(item.listingId);
      return status ? { ...item, status } : item;
    });

  useEffect(() => {
    let ignoreResult = false;
    const workerApiBaseUrl = resolveWorkerApiBaseUrl();

    if (!workerApiBaseUrl) {
      return undefined;
    }

    setIsLoadingListings(true);
    fetchWorkerListings({ baseUrl: workerApiBaseUrl })
      .then((apiListings) => {
        if (ignoreResult) {
          return;
        }

        setListings(apiListings);
        setDataMode("live");
        setDataMessage("Live API: listinguri incarcate din Worker.");
      })
      .catch((error: unknown) => {
        if (ignoreResult) {
          return;
        }

        setListings(demoListings);
        setDataMode("fallback");
        setDataMessage(`Fallback demo: ${error instanceof Error ? error.message : "Worker API indisponibil"}.`);
      })
      .finally(() => {
        if (!ignoreResult) {
          setIsLoadingListings(false);
        }
      });

    return () => {
      ignoreResult = true;
    };
  }, []);

  useEffect(() => {
    let ignoreResult = false;
    const workerApiBaseUrl = resolveWorkerApiBaseUrl();
    const accessToken = authSession?.accessToken ?? resolveTenantWorkflowAccessToken();
    const fallbackWorkflow = buildDemoTenantWorkflow(listings, demoTenantId);

    setWorkflowItems(applyWorkflowOverrides(fallbackWorkflow));

    if (!workerApiBaseUrl) {
      setWorkflowMode("demo");
      setWorkflowMessage("Workflow demo: endpointul backend nu este configurat.");
      return undefined;
    }

    if (!accessToken) {
      setWorkflowMode("demo");
      setWorkflowMessage("Workflow demo: lipseste tokenul Supabase de utilizator pentru endpointurile tenant.");
      return undefined;
    }

    setIsLoadingWorkflow(true);
    fetchTenantWorkflow({ baseUrl: workerApiBaseUrl, orgId: demoOrgId, listings, accessToken })
      .then((apiWorkflowItems) => {
        if (ignoreResult) {
          return;
        }

        if (apiWorkflowItems.length === 0) {
          setWorkflowItems(applyWorkflowOverrides(fallbackWorkflow));
          setWorkflowMode("demo");
          setWorkflowMessage("Workflow demo: endpointul backend a raspuns fara date.");
          return;
        }

        setWorkflowItems(applyWorkflowOverrides(apiWorkflowItems));
        setWorkflowMode("live");
        setWorkflowMessage("Workflow live: statusuri per tenant incarcate din backend.");
      })
      .catch((error: unknown) => {
        if (ignoreResult) {
          return;
        }

        setWorkflowItems(applyWorkflowOverrides(fallbackWorkflow));
        setWorkflowMode("demo");
        setWorkflowMessage(
          `Workflow demo: ${error instanceof Error ? error.message : "endpoint workflow indisponibil"}.`
        );
      })
      .finally(() => {
        if (!ignoreResult) {
          setIsLoadingWorkflow(false);
        }
      });

    return () => {
      ignoreResult = true;
    };
  }, [authSession?.accessToken, listings]);

  const handleWorkflowStatusChange = async (item: TenantWorkflowItem, status: TenantWorkflowStatus) => {
    const workerApiBaseUrl = resolveWorkerApiBaseUrl();
    const accessToken = authSession?.accessToken ?? resolveTenantWorkflowAccessToken();
    workflowStatusOverrides.current.set(item.listingId, status);
    setWorkflowItems((currentItems) =>
      currentItems.map((currentItem) =>
        currentItem.listingId === item.listingId
          ? { ...currentItem, status, updatedAt: new Date().toISOString() }
          : currentItem
      )
    );
    setWorkflowActionMessage("Se actualizeaza workflow-ul tenantului.");

    if (!workerApiBaseUrl) {
      setWorkflowActionMessage("Salvat local: endpointul backend pentru workflow nu este configurat.");
      return;
    }

    if (!accessToken) {
      setWorkflowActionMessage("Salvat local: lipseste tokenul Supabase de utilizator pentru workflow tenant.");
      return;
    }

    try {
      await updateTenantWorkflowStatus({
        baseUrl: workerApiBaseUrl,
        orgId: item.orgId,
        listingId: item.listingId,
        status,
        accessToken
      });
      setWorkflowActionMessage("Workflow salvat in backend.");
    } catch {
      setWorkflowActionMessage("Salvat local: endpointul backend pentru workflow nu este disponibil.");
    }
  };

  const handleSupabaseLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsAuthLoading(true);
    setAuthMessage("Se autentifica prin Supabase Auth.");

    try {
      const session = await signInWithSupabasePassword({
        email: authEmail.trim(),
        password: authPassword
      });
      setAuthSession(session);
      setAuthEmail(session.email ?? authEmail.trim());
      setAuthPassword("");
      setAuthMessage(`Autentificat ca ${session.email ?? authEmail.trim()}.`);
    } catch (error) {
      setAuthMessage(`Login esuat: ${error instanceof Error ? error.message : "Supabase Auth indisponibil"}.`);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSupabaseLogout = () => {
    clearSupabaseAuthSession();
    setAuthSession(null);
    setAuthPassword("");
    setAuthMessage("Delogat: workflow-ul ramane in demo pana la un nou login Supabase.");
  };

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Navigatie produs">
        <div className="brand-mark">T</div>
        <nav>
          <a href="#search">Search</a>
          <a href="#detail">Detail</a>
          <a href="#auth">Auth</a>
          <a href="#workflow">Workflow</a>
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
            <Metric label={dataMode === "live" ? "Anunturi live" : "Anunturi demo"} value={String(summary.total)} />
            <Metric label="Active in workflow" value={String(summary.active)} />
            <Metric label="Scor dedup mediu" value={`${Math.round(summary.averageMatchScore * 100)}%`} />
            <Metric label="Schimbate azi" value={String(summary.changedToday)} />
          </div>
        </header>

        <section className="status-strip" aria-label="Linkuri publicate">
          <span className="status-link" role="status" aria-live="polite">
            <span>{isLoadingListings ? "Se incarca date" : dataMode === "live" ? "Live API" : "Fallback demo"}</span>
            <strong>{dataMessage}</strong>
          </span>
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
              {filteredListings.length > 0 ? (
                filteredListings.map((listing) => <ListingRow key={listing.id} listing={listing} />)
              ) : (
                <div className="table-row" role="row">
                  <span>Nu exista listinguri pentru filtrele curente.</span>
                  <span>-</span>
                  <span>-</span>
                  <span>-</span>
                  <span>-</span>
                </div>
              )}
            </div>
          </section>

          <section id="detail" className="panel" data-testid="listing-detail">
            <div className="section-heading compact">
              <div>
                <h2>Listing Detail</h2>
                <p>Anunt canonic + linkuri sursa.</p>
              </div>
            </div>
            {selectedListing ? (
              <>
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
              </>
            ) : (
              <p className="safe-note">Nu exista listinguri incarcate din API pentru detaliu.</p>
            )}
          </section>

          <section id="auth" className="panel" data-testid="supabase-auth">
            <div className="section-heading compact">
              <div>
                <h2>Supabase Auth</h2>
                <p>Login real pentru endpointurile tenant protejate de RLS.</p>
              </div>
              <span className="count-pill">{authSession ? "Autentificat" : "Neautentificat"}</span>
            </div>
            <form className="auth-form" onSubmit={handleSupabaseLogin}>
              <label>
                <span>Email Supabase</span>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  placeholder="agent@agentie.ro"
                  autoComplete="email"
                  required
                />
              </label>
              <label>
                <span>Parola Supabase</span>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  placeholder="Parola contului"
                  autoComplete="current-password"
                  required
                />
              </label>
              <div className="auth-actions">
                <button type="submit" disabled={isAuthLoading}>
                  {isAuthLoading ? "Se autentifica" : "Login Supabase"}
                </button>
                <button type="button" onClick={handleSupabaseLogout} disabled={!authSession}>
                  Logout
                </button>
              </div>
            </form>
            <p className="safe-note" role="status" aria-live="polite">
              {authMessage}
            </p>
            <p className="tenant-note">
              Frontend-ul foloseste doar cheia anon/publishable Supabase; service role ramane exclusiv in Worker.
            </p>
          </section>

          <section id="workflow" className="panel" data-testid="tenant-workflow">
            <div className="section-heading compact">
              <div>
                <h2>Tenant Workflow</h2>
                <p>Pastreaza statusuri per tenant peste index + link.</p>
              </div>
              <span className="count-pill">{isLoadingWorkflow ? "Se incarca" : workflowMode === "live" ? "Workflow live" : "Workflow demo"}</span>
            </div>
            <p className="tenant-note">
              Org <strong>{demoTenantId}</strong> are {workflowSummary.active} active si {workflowSummary.contacted} contactate.
            </p>
            <div className="workflow-list">
              {workflowItems.slice(0, 3).map((item) => (
                <TenantWorkflowCard
                  key={item.id}
                  item={item}
                  onStatusChange={handleWorkflowStatusChange}
                />
              ))}
            </div>
            <p className="safe-note" role="status" aria-live="polite">
              {workflowActionMessage || workflowMessage}
            </p>
            <p className="safe-note">
              UI-ul nu re-hosteaza continut portal: afiseaza titlu, status tenant si link catre sursa originala.
            </p>
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

function TenantWorkflowCard({
  item,
  onStatusChange
}: {
  item: TenantWorkflowItem;
  onStatusChange: (item: TenantWorkflowItem, status: TenantWorkflowStatus) => void;
}) {
  return (
    <article className="workflow-card" aria-label={`Workflow ${item.title}`}>
      <div className="workflow-card-heading">
        <strong>{item.title}</strong>
        <span>Status: {workflowStatusLabels[item.status]}</span>
      </div>
      <div className="workflow-meta">
        <span>Agent: {item.assignee}</span>
        <a href={item.sourceUrl} target="_blank" rel="noreferrer">
          {item.sourceName}
        </a>
      </div>
      <div className="workflow-actions">
        <button type="button" onClick={() => onStatusChange(item, "in_progress")}>
          Preia
        </button>
        <button
          type="button"
          aria-label={`Marcheaza contactat pentru ${item.title}`}
          onClick={() => onStatusChange(item, "contacted")}
        >
          Contactat
        </button>
        <button type="button" onClick={() => onStatusChange(item, "ignored")}>
          Ignora
        </button>
      </div>
    </article>
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
  return value === "apartment" || value === "house" || value === "land" || value === "commercial" || value === "other" ? value : undefined;
}

function omitFilter<Key extends keyof ListingFilters>(filters: ListingFilters, key: Key): ListingFilters {
  const { [key]: _removed, ...rest } = filters;
  return rest;
}

function summarizeWorkflow(items: TenantWorkflowItem[]) {
  return items.reduce(
    (summary, item) => ({
      active: item.status === "ignored" || item.status === "archived" ? summary.active : summary.active + 1,
      contacted: item.status === "contacted" ? summary.contacted + 1 : summary.contacted
    }),
    { active: 0, contacted: 0 }
  );
}

export default App;
