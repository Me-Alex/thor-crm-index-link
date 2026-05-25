import type { RadarOpportunity } from "./radarModel";
import { RadarListingCard } from "./RadarListingCard";

interface HotOpportunitiesPanelProps {
  opportunities: RadarOpportunity[];
  selectedListingId: string | undefined;
  onSelectListing: (listingId: string) => void;
}

export function HotOpportunitiesPanel({ opportunities, selectedListingId, onSelectListing }: HotOpportunitiesPanelProps) {
  return (
    <section className="hot-opportunities-panel" data-testid="hot-opportunities" aria-label="Oportunitati fierbinti">
      <div className="panel-heading">
        <strong>Oportunitati fierbinti</strong>
        <span>Top {opportunities.length}</span>
      </div>
      <div className="hot-opportunities-list">
        {opportunities.map((opportunity) => (
          <RadarListingCard
            key={opportunity.listing.id}
            opportunity={opportunity}
            selected={selectedListingId === opportunity.listing.id}
            onSelect={onSelectListing}
          />
        ))}
      </div>
    </section>
  );
}
