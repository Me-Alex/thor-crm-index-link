import type { SourceHealth } from "../data/demoData";
import type { RadarCluster, RadarSelectionTarget } from "./radarModel";
import { SourceHealthOverlay } from "./SourceHealthOverlay";

interface MarketMapProps {
  clusters: RadarCluster[];
  selectedTarget: RadarSelectionTarget | null;
  sourceHealth: SourceHealth[];
  onSelectCluster: (cluster: RadarCluster) => void;
}

const districtLabels = [
  { label: "Baneasa", left: "42%", top: "12%" },
  { label: "Floreasca", left: "46%", top: "27%" },
  { label: "Pipera", left: "67%", top: "28%" },
  { label: "Titan", left: "72%", top: "47%" },
  { label: "Dristor", left: "73%", top: "70%" },
  { label: "Rahova", left: "46%", top: "87%" },
  { label: "Drumul Taberei", left: "23%", top: "59%" }
];

export function MarketMap({ clusters, selectedTarget, sourceHealth, onSelectCluster }: MarketMapProps) {
  return (
    <section className="market-map-panel" data-testid="market-radar-map" aria-label="Thor Market Radar">
      <div className="market-map-header">
        <div>
          <strong>Market Radar · Bucuresti</strong>
          <small>Tactic view</small>
        </div>
        <button type="button" className="map-mode-button">
          Heatmap: Pret schimbat
        </button>
      </div>

      <div className="market-map-surface">
        <div className="market-map-controls" aria-hidden="true">
          <button type="button">+</button>
          <button type="button">-</button>
          <button type="button">*</button>
        </div>

        {districtLabels.map((item) => (
          <span key={item.label} className="market-map-label" style={{ left: item.left, top: item.top }}>
            {item.label}
          </span>
        ))}

        <span className="market-map-city">BUCURESTI</span>

        {clusters.map((cluster) => {
          const isSelected =
            selectedTarget?.type === "cluster"
              ? selectedTarget.id === cluster.id
              : selectedTarget?.type === "listing"
                ? cluster.representativeListingId === selectedTarget.id
                : false;

          return (
            <button
              key={cluster.id}
              type="button"
              className={`market-cluster is-${cluster.tone}${isSelected ? " is-selected" : ""}`}
              style={{ left: `${cluster.x}%`, top: `${cluster.y}%` }}
              aria-pressed={isSelected}
              aria-label={`${cluster.label} ${cluster.count}`}
              onClick={() => onSelectCluster(cluster)}
            >
              <strong>{cluster.count}</strong>
              <span>{cluster.delta >= 0 ? `+${cluster.delta}%` : `${cluster.delta}%`}</span>
            </button>
          );
        })}

        <SourceHealthOverlay sources={sourceHealth} />
      </div>
    </section>
  );
}
