import { useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from "react";
import type { SourceHealth } from "../data/demoData";
import { MapTileLayer } from "./MapTileLayer";
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

const minMapZoom = 11;
const maxMapZoom = 14;
const maxPanDistance = 180;

export function MarketMap({ clusters, selectedTarget, sourceHealth, onSelectCluster }: MarketMapProps) {
  const [mapZoom, setMapZoom] = useState(12);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [mapMetric, setMapMetric] = useState<"price" | "sources">("price");
  const dragStart = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(
    null
  );
  const canZoomIn = mapZoom < maxMapZoom;
  const canZoomOut = mapZoom > minMapZoom;

  const beginMapDrag = (pointerId: number, clientX: number, clientY: number) => {
    dragStart.current = {
      pointerId,
      startX: clientX,
      startY: clientY,
      originX: panOffset.x,
      originY: panOffset.y
    };
    setIsDraggingMap(true);
  };

  const moveMapDrag = (pointerId: number, clientX: number, clientY: number) => {
    if (!dragStart.current || dragStart.current.pointerId !== pointerId) {
      return;
    }

    const nextPanOffset = {
      x: clampPan(dragStart.current.originX + clientX - dragStart.current.startX),
      y: clampPan(dragStart.current.originY + clientY - dragStart.current.startY)
    };
    setPanOffset(nextPanOffset);
  };

  const releaseMapDrag = (pointerId: number) => {
    if (dragStart.current?.pointerId === pointerId) {
      dragStart.current = null;
      setIsDraggingMap(false);
    }
  };

  const handleMapPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || shouldIgnoreMapDrag(event.target)) {
      return;
    }

    beginMapDrag(event.pointerId, event.clientX, event.clientY);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleMapPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    moveMapDrag(event.pointerId, event.clientX, event.clientY);
  };

  const handleMapPointerRelease = (event: PointerEvent<HTMLDivElement>) => {
    releaseMapDrag(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleMapMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (dragStart.current || event.button !== 0 || shouldIgnoreMapDrag(event.target)) {
      return;
    }

    beginMapDrag(-1, event.clientX, event.clientY);
  };

  const handleMapMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    moveMapDrag(-1, event.clientX, event.clientY);
  };

  const handleMapMouseRelease = () => {
    releaseMapDrag(-1);
  };

  return (
    <section className="market-map-panel" data-testid="market-radar-map" aria-label="Thor market monitor">
      <div className="market-map-header">
        <div>
          <strong>Piata Bucuresti</strong>
          <small>Vedere operationala</small>
        </div>
        <button
          type="button"
          className="map-mode-button"
          aria-pressed={mapMetric === "sources"}
          onClick={() => setMapMetric((currentMetric) => (currentMetric === "price" ? "sources" : "price"))}
        >
          {mapMetric === "price" ? "Variatie pret" : "Surse active"}
        </button>
      </div>

      <div
        className={`market-map-surface${isDraggingMap ? " is-dragging" : ""}`}
        onPointerDown={handleMapPointerDown}
        onPointerMove={handleMapPointerMove}
        onPointerUp={handleMapPointerRelease}
        onPointerCancel={handleMapPointerRelease}
        onMouseDown={handleMapMouseDown}
        onMouseMove={handleMapMouseMove}
        onMouseUp={handleMapMouseRelease}
        onMouseLeave={handleMapMouseRelease}
      >
        <MapTileLayer panOffset={panOffset} zoom={mapZoom} />
        <span className="market-map-layer-label">Harta Bucuresti · z{mapZoom}</span>
        <span className="market-map-pan-label" aria-live="polite">
          Pan {Math.round(panOffset.x)} / {Math.round(panOffset.y)}
        </span>
        <div
          className="map-pan-layer"
          style={{
            "--map-pan-x": `${panOffset.x}px`,
            "--map-pan-y": `${panOffset.y}px`
          } as CSSProperties}
        >
          <div className="map-heatmap-layer" data-testid="dynamic-heatmap" aria-hidden="true">
            {clusters.map((cluster) => (
              <span
                key={`heat-${cluster.id}`}
                className={`map-heatmap-spot is-${cluster.tone}`}
                data-heat-cluster={cluster.id}
                data-heat-count={cluster.count}
                data-heat-delta={cluster.delta}
                style={getHeatmapSpotStyle(cluster)}
              />
            ))}
          </div>
          <div className="map-road is-road-a" aria-hidden="true" />
          <div className="map-road is-road-b" aria-hidden="true" />
          <div className="map-road is-road-c" aria-hidden="true" />
          <div className="map-orbit is-orbit-a" aria-hidden="true" />
          <div className="map-orbit is-orbit-b" aria-hidden="true" />
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
        </div>
        <div className="market-map-crosshair" aria-hidden="true" />
        <div className="market-map-controls" aria-label="Map controls">
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => setMapZoom((currentZoom) => Math.min(currentZoom + 1, maxMapZoom))}
            disabled={!canZoomIn}
          >
            +
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => setMapZoom((currentZoom) => Math.max(currentZoom - 1, minMapZoom))}
            disabled={!canZoomOut}
          >
            -
          </button>
          <button type="button" aria-label="Reset map zoom" onClick={() => setMapZoom(12)}>
            ◎
          </button>
          <button type="button" aria-label="Reset map position" onClick={() => setPanOffset({ x: 0, y: 0 })}>
            ⬡
          </button>
        </div>

        <div id="source-health-section">
          <SourceHealthOverlay sources={sourceHealth} />
        </div>
        <div className="market-map-legend" aria-hidden="true">
          <span>{mapMetric === "price" ? "Pret schimbat (7 zile)" : "Acoperire surse"}</span>
          <i>-10%</i>
          <b />
          <i>+10%</i>
        </div>
      </div>
    </section>
  );
}

function clampPan(value: number) {
  return Math.max(-maxPanDistance, Math.min(maxPanDistance, value));
}

function shouldIgnoreMapDrag(target: EventTarget) {
  return target instanceof HTMLElement && Boolean(target.closest("button, a, input, select, textarea, label"));
}

function getHeatmapSpotStyle(cluster: RadarCluster): CSSProperties {
  const heatSize = 120 + Math.min(cluster.count, 95) * 1.45 + Math.min(Math.abs(cluster.delta), 16) * 8;
  const heatOpacity = Math.min(0.9, 0.28 + Math.abs(cluster.delta) / 24 + Math.min(cluster.count, 90) / 240);

  return {
    "--heat-color": heatmapColorByTone[cluster.tone],
    "--heat-opacity": heatOpacity.toFixed(2),
    "--heat-size": `${Math.round(heatSize)}px`,
    left: `${cluster.x}%`,
    top: `${cluster.y}%`
  } as CSSProperties;
}

const heatmapColorByTone: Record<RadarCluster["tone"], string> = {
  cool: "48, 215, 255",
  hot: "255, 89, 77",
  stable: "55, 217, 147"
};
