import type { CSSProperties } from "react";

interface MapTileLayerProps {
  panOffset: {
    x: number;
    y: number;
  };
  zoom: number;
}

const bucharestCenter = {
  lat: 44.4268,
  lon: 26.1025
};

const tileOffsets = [
  [-2, -2],
  [-1, -2],
  [0, -2],
  [1, -2],
  [2, -2],
  [-2, -1],
  [-1, -1],
  [0, -1],
  [1, -1],
  [2, -1],
  [-2, 0],
  [-1, 0],
  [0, 0],
  [1, 0],
  [2, 0],
  [-2, 1],
  [-1, 1],
  [0, 1],
  [1, 1],
  [2, 1]
] as const;

const defaultTileTemplate = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const defaultAttribution = "© OpenStreetMap contributors";

export function MapTileLayer({ panOffset, zoom }: MapTileLayerProps) {
  const tileTemplate = import.meta.env.VITE_MAP_TILE_URL_TEMPLATE || defaultTileTemplate;
  const attribution = import.meta.env.VITE_MAP_ATTRIBUTION || defaultAttribution;
  const centerTile = {
    x: lonToTileX(bucharestCenter.lon, zoom),
    y: latToTileY(bucharestCenter.lat, zoom)
  };

  return (
    <div className="map-tile-layer" data-map-zoom={zoom} aria-hidden="true">
      <div
        className="map-tile-grid"
        style={{
          "--map-pan-x": `${panOffset.x}px`,
          "--map-pan-y": `${panOffset.y}px`
        } as CSSProperties}
      >
        {tileOffsets.map(([offsetX, offsetY]) => {
          const x = centerTile.x + offsetX;
          const y = centerTile.y + offsetY;
          const src = buildTileUrl(tileTemplate, { z: zoom, x, y });

          return (
            <img
              key={`${zoom}-${x}-${y}`}
              src={src}
              alt=""
              loading="eager"
              referrerPolicy="no-referrer-when-downgrade"
            />
          );
        })}
      </div>
      <span className="map-tile-attribution">{attribution}</span>
    </div>
  );
}

function buildTileUrl(template: string, tile: { z: number; x: number; y: number }) {
  return template
    .replaceAll("{z}", String(tile.z))
    .replaceAll("{x}", String(tile.x))
    .replaceAll("{y}", String(tile.y))
    .replaceAll("{s}", "a");
}

function lonToTileX(lon: number, zoom: number) {
  return Math.floor(((lon + 180) / 360) * 2 ** zoom);
}

function latToTileY(lat: number, zoom: number) {
  const radians = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2) * 2 ** zoom);
}
