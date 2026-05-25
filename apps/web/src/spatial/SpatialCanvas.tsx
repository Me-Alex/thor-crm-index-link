import { CanvasEdge } from "./CanvasEdge";
import { CanvasNode } from "./CanvasNode";
import type { SpatialGraphModel } from "./types";

interface SpatialCanvasProps {
  graph: SpatialGraphModel;
  selectedNodeId: string;
  onSelectNode: (nodeId: string) => void;
}

export function SpatialCanvas({ graph, selectedNodeId, onSelectNode }: SpatialCanvasProps) {
  return (
    <section className="spatial-canvas" data-testid="spatial-canvas" aria-label="Thor spatial deal canvas">
      <svg className="canvas-edges" viewBox="0 0 1280 880" aria-hidden="true" focusable="false">
        {graph.edges.map((edge) => (
          <CanvasEdge key={edge.id} edge={edge} nodes={graph.nodes} />
        ))}
      </svg>
      <div className="canvas-node-layer">
        {graph.nodes.map((node) => (
          <CanvasNode key={node.id} node={node} selected={node.id === selectedNodeId} onSelect={onSelectNode} />
        ))}
      </div>
    </section>
  );
}
