import type { PropertyType, TransactionType } from "../data/demoData";
import type { RuntimeMode } from "../lib/runtimeConfig";
import { RadarSelect, type RadarSelectOption } from "./RadarSelect";
import { useState } from "react";

interface RadarCommandBarProps {
  location: string;
  propertyType: PropertyType | "all";
  transactionType: TransactionType | "all";
  priceMin: string;
  priceMax: string;
  query: string;
  dataMode: "fallback" | "live";
  dataMessage: string;
  runtimeMode: RuntimeMode;
  activeWorkspaceName: string;
  isLoadingListings: boolean;
  onLocationChange: (value: string) => void;
  onPropertyTypeChange: (value: PropertyType | "all") => void;
  onTransactionTypeChange: (value: TransactionType | "all") => void;
  onPriceMinChange: (value: string) => void;
  onPriceMaxChange: (value: string) => void;
  onQueryChange: (value: string) => void;
  onRefreshListings: () => void;
}

const locationOptions: Array<RadarSelectOption<string>> = [
  { label: "Bucuresti", value: "Bucuresti" },
  { label: "Toate zonele", value: "Toate zonele" },
  { label: "Cluj Napoca", value: "Cluj Napoca" },
  { label: "Iasi", value: "Iasi" }
];

const propertyTypeOptions: Array<RadarSelectOption<PropertyType | "all">> = [
  { label: "Toate tipurile", value: "all" },
  { label: "Apartament", value: "apartment" },
  { label: "Casa", value: "house" },
  { label: "Teren", value: "land" },
  { label: "Comercial", value: "commercial" }
];

const transactionTypeOptions: Array<RadarSelectOption<TransactionType | "all">> = [
  { label: "Vanzare + Inchiriere", value: "all" },
  { label: "Vanzare", value: "sale" },
  { label: "Inchiriere", value: "rent" }
];

export function RadarCommandBar(props: RadarCommandBarProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const fallbackStatusLabel = props.runtimeMode === "production" ? "Prod blocked" : "Demo fallback";
  const refreshLabel = props.runtimeMode === "production" && props.dataMode === "fallback" ? "Reincearca date" : "Actualizeaza";

  return (
    <header className="radar-command-bar" aria-label="Market filters">
      <div className="radar-command-filters">
        <RadarSelect
          className="radar-field"
          label="⌖ Locatie"
          value={props.location}
          options={locationOptions}
          onChange={props.onLocationChange}
        />

        <RadarSelect
          className="radar-field"
          label="Tip proprietate"
          value={props.propertyType}
          options={propertyTypeOptions}
          onChange={props.onPropertyTypeChange}
        />

        <RadarSelect
          className="radar-field"
          label="Tranzactie"
          value={props.transactionType}
          options={transactionTypeOptions}
          onChange={props.onTransactionTypeChange}
        />

        <div className="radar-field radar-field-range">
          <span>Pret (EUR)</span>
          <div>
            <input value={props.priceMin} onChange={(event) => props.onPriceMinChange(event.target.value)} placeholder="Min" />
            <input value={props.priceMax} onChange={(event) => props.onPriceMaxChange(event.target.value)} placeholder="Max" />
          </div>
        </div>

        <label className="radar-search">
          <span>Cauta listinguri</span>
          <i aria-hidden="true">⌕</i>
          <input
            aria-label="Cauta anunturi, zone, surse"
            value={props.query}
            onChange={(event) => props.onQueryChange(event.target.value)}
            placeholder="Cauta anunturi, zone, surse..."
          />
          <kbd>⌘ K</kbd>
        </label>

        <button
          type="button"
          className="radar-ghost-button"
          aria-expanded={showAdvancedFilters}
          aria-controls="advanced-filter-panel"
          onClick={() => setShowAdvancedFilters((currentValue) => !currentValue)}
        >
          <span aria-hidden="true">≡</span> Filtre avansate <b>3</b>
        </button>
      </div>

      {showAdvancedFilters ? (
        <div id="advanced-filter-panel" className="advanced-filter-panel" data-testid="advanced-filter-panel">
          <strong>Filtre rapide</strong>
          <button type="button" onClick={() => props.onPropertyTypeChange("apartment")}>
            Doar apartamente
          </button>
          <button type="button" onClick={() => props.onPriceMaxChange("120000")}>
            Sub 120k EUR
          </button>
          <button
            type="button"
            onClick={() => {
              props.onPropertyTypeChange("all");
              props.onTransactionTypeChange("all");
              props.onPriceMinChange("");
              props.onPriceMaxChange("");
              props.onQueryChange("");
            }}
          >
            Reseteaza filtre
          </button>
        </div>
      ) : null}

      <div className="radar-command-actions">
        <div
          className={`radar-status-badge is-${props.dataMode}${
            props.dataMode === "fallback" && props.runtimeMode === "production" ? " is-production-blocked" : ""
          }`}
        >
          <span aria-hidden="true" />
          <strong>{props.dataMode === "live" ? "Date live" : fallbackStatusLabel}</strong>
          <small>{props.dataMessage}</small>
        </div>
        <div className="radar-top-user" aria-label={`Agentia curenta: ${props.activeWorkspaceName}`}>
          <span className="radar-notification">4</span>
          <span className="radar-avatar" aria-hidden="true">
            {props.activeWorkspaceName.slice(0, 1).toUpperCase()}
          </span>
          <strong data-testid="active-workspace-name">{props.activeWorkspaceName}</strong>
        </div>
        <button type="button" className="radar-refresh-button" onClick={props.onRefreshListings} disabled={props.isLoadingListings}>
          {props.isLoadingListings ? "Se actualizeaza..." : refreshLabel}
        </button>
      </div>
    </header>
  );
}
