import type { PropertyType, TransactionType } from "../data/demoData";

interface RadarCommandBarProps {
  location: string;
  propertyType: PropertyType | "all";
  transactionType: TransactionType | "all";
  priceMin: string;
  priceMax: string;
  query: string;
  dataMode: "fallback" | "live";
  dataMessage: string;
  isLoadingListings: boolean;
  onLocationChange: (value: string) => void;
  onPropertyTypeChange: (value: PropertyType | "all") => void;
  onTransactionTypeChange: (value: TransactionType | "all") => void;
  onPriceMinChange: (value: string) => void;
  onPriceMaxChange: (value: string) => void;
  onQueryChange: (value: string) => void;
  onRefreshListings: () => void;
}

export function RadarCommandBar(props: RadarCommandBarProps) {
  return (
    <header className="radar-command-bar" aria-label="Market filters">
      <div className="radar-command-filters">
        <label className="radar-field">
          <span>Locatie</span>
          <select value={props.location} onChange={(event) => props.onLocationChange(event.target.value)}>
            <option>Bucuresti</option>
            <option>Toate zonele</option>
            <option>Cluj Napoca</option>
            <option>Iasi</option>
          </select>
        </label>

        <label className="radar-field">
          <span>Tip proprietate</span>
          <select
            value={props.propertyType}
            onChange={(event) => props.onPropertyTypeChange(event.target.value as PropertyType | "all")}
          >
            <option value="all">Toate tipurile</option>
            <option value="apartment">Apartament</option>
            <option value="house">Casa</option>
            <option value="land">Teren</option>
            <option value="commercial">Comercial</option>
          </select>
        </label>

        <label className="radar-field">
          <span>Tranzactie</span>
          <select
            value={props.transactionType}
            onChange={(event) => props.onTransactionTypeChange(event.target.value as TransactionType | "all")}
          >
            <option value="all">Vanzare + Inchiriere</option>
            <option value="sale">Vanzare</option>
            <option value="rent">Inchiriere</option>
          </select>
        </label>

        <div className="radar-field radar-field-range">
          <span>Pret (EUR)</span>
          <div>
            <input value={props.priceMin} onChange={(event) => props.onPriceMinChange(event.target.value)} placeholder="Min" />
            <input value={props.priceMax} onChange={(event) => props.onPriceMaxChange(event.target.value)} placeholder="Max" />
          </div>
        </div>

        <label className="radar-search">
          <span>Cauta listinguri</span>
          <input
            aria-label="Cauta anunturi, zone, surse"
            value={props.query}
            onChange={(event) => props.onQueryChange(event.target.value)}
            placeholder="Cauta anunturi, zone, surse..."
          />
        </label>

        <button type="button" className="radar-ghost-button">
          Filtre avansate <b>3</b>
        </button>
      </div>

      <div className="radar-command-actions">
        <div className={`radar-status-badge is-${props.dataMode}`}>
          <span aria-hidden="true" />
          <strong>{props.dataMode === "live" ? "Scan live" : "Demo fallback"}</strong>
          <small>{props.dataMessage}</small>
        </div>
        <button type="button" className="radar-refresh-button" onClick={props.onRefreshListings} disabled={props.isLoadingListings}>
          {props.isLoadingListings ? "Scanning..." : "Start scan"}
        </button>
      </div>
    </header>
  );
}
