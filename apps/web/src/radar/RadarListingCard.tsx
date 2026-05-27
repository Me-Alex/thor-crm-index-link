import type { RadarOpportunity } from "./radarModel";

interface RadarListingCardProps {
  opportunity: RadarOpportunity;
  selected: boolean;
  onSelect: (listingId: string) => void;
}

const formatCurrency = new Intl.NumberFormat("ro-RO", {
  maximumFractionDigits: 0,
  style: "currency",
  currency: "EUR"
});

export function RadarListingCard({ opportunity, selected, onSelect }: RadarListingCardProps) {
  const { listing, priceDeltaEur, priceDeltaPct } = opportunity;
  const deltaTone = priceDeltaEur < 0 ? "is-hot" : priceDeltaEur > 0 ? "is-good" : "";
  const primarySource = listing.sources[0];
  const propertyIcon = listing.propertyType === "land" ? "◇" : listing.propertyType === "house" ? "⌂" : "▥";

  return (
    <article className={`radar-listing-card${selected ? " is-selected" : ""}`}>
      <button
        type="button"
        className="radar-listing-card-main"
        aria-pressed={selected}
        aria-label={listing.title}
        onClick={() => onSelect(listing.id)}
      >
        <div className={`radar-listing-visual tone-${listing.propertyType}`}>
          <i aria-hidden="true">{propertyIcon}</i>
          <span>{listing.neighborhood}</span>
        </div>
        <div className="radar-listing-copy">
          <div className="radar-listing-title-row">
            <strong>{listing.title}</strong>
            <span className="radar-listing-score">{Math.round(listing.matchScore * 100)}% potrivire</span>
          </div>
          <div className="radar-listing-meta">
            <span>{formatCurrency.format(listing.priceEur)}</span>
            <span>{listing.areaSqm} mp</span>
            <span>{listing.rooms} camere</span>
          </div>
          <div className={`radar-listing-delta ${deltaTone}`}>
            {priceDeltaEur === 0
              ? "Pret stabil"
              : `${priceDeltaEur > 0 ? "+" : ""}${formatCurrency.format(priceDeltaEur)} (${priceDeltaPct.toFixed(2)}%)`}
          </div>
          <div className="radar-listing-sources">
            {listing.sources.map((source) => (
              <span key={`${listing.id}-${source.name}`}>{source.name}</span>
            ))}
          </div>
        </div>
      </button>
      <a href={primarySource?.url ?? "#"} target="_blank" rel="noreferrer" aria-label={`Link sursa ${listing.title}`}>
        Link sursa
      </a>
    </article>
  );
}
