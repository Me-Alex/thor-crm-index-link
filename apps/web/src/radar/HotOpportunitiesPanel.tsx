import type { RadarOpportunity } from "./radarModel";
import { RadarListingCard } from "./RadarListingCard";

interface HotOpportunitiesPanelProps {
  opportunities: RadarOpportunity[];
  selectedListingId: string | undefined;
  title?: string;
  summary?: string;
  onSelectListing: (listingId: string) => void;
}

export function HotOpportunitiesPanel({
  opportunities,
  selectedListingId,
  title = "Anunturi relevante",
  summary,
  onSelectListing
}: HotOpportunitiesPanelProps) {
  return (
    <section className="hot-opportunities-panel" data-testid="hot-opportunities" aria-label={title}>
      <div className="panel-heading">
        <div>
          <strong>{title}</strong>
          {summary ? <span>{summary}</span> : null}
        </div>
        <a href="#selected-listing-detail">Vezi toate</a>
      </div>
      <div className="hot-opportunities-list">
        {opportunities.length > 0 ? (
          opportunities.map((opportunity) => (
            <RadarListingCard
              key={opportunity.listing.id}
              opportunity={opportunity}
              selected={selectedListingId === opportunity.listing.id}
              onSelect={onSelectListing}
            />
          ))
        ) : (
          <div className="hot-opportunities-empty">
            <strong>Nu exista anunturi in filtrul curent</strong>
            <span>Schimba filtrele sau asteapta finalizarea ingestiei pentru sursele active.</span>
          </div>
        )}
      </div>
    </section>
  );
}
