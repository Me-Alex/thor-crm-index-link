import type { SpatialGraphModel } from "./types";

interface CanvasMinimapProps {
  graph: SpatialGraphModel;
  selectedNodeId: string;
}

export function CanvasMinimap({ graph, selectedNodeId }: CanvasMinimapProps) {
  return (
    <aside className="canvas-minimap" aria-label="Canvas minimap">
      <span>Map</span>
      <svg viewBox="0 0 128 88" aria-hidden="true" focusable="false">
        {graph.nodes.map((node) => (
          <rect
            key={node.id}
            x={node.x / 10}
            y={node.y / 10}
            width={Math.max(10, node.width / 28)}
            height="8"
            rx="3"
            className={node.id === selectedNodeId ? "is-selected" : ""}
          />
        ))}
      </svg>
    </aside>
  );
}
