import type { RadarOpportunity } from "./radarModel";
import { RadarListingCard } from "./RadarListingCard";

interface HotOpportunitiesPanelProps {
  opportunities: RadarOpportunity[];
  selectedListingId: string | undefined;
  onSelectListing: (listingId: string) => void;
}

export function HotOpportunitiesPanel({ opportunities, selectedListingId, onSelectListing }: HotOpportunitiesPanelProps) {
  return (
    <section className="hot-opportunities-panel" data-testid="hot-opportunities" aria-label="Anunturi relevante">
      <div className="panel-heading">
        <strong>Anunturi relevante</strong>
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
