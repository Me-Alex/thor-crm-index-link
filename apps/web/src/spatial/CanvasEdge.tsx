import type { SpatialEdge, SpatialNode } from "./types";

interface CanvasEdgeProps {
  edge: SpatialEdge;
  nodes: SpatialNode[];
}

export function CanvasEdge({ edge, nodes }: CanvasEdgeProps) {
  const fromNode = nodes.find((node) => node.id === edge.from);
  const toNode = nodes.find((node) => node.id === edge.to);

  if (!fromNode || !toNode) {
    return null;
  }

  const x1 = fromNode.x + fromNode.width / 2;
  const y1 = fromNode.y + 70;
  const x2 = toNode.x + toNode.width / 2;
  const y2 = toNode.y + 70;
  const labelX = (x1 + x2) / 2;
  const labelY = (y1 + y2) / 2;

  return (
    <g className={`canvas-edge edge-${edge.tone}`}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      {edge.label ? (
        <text x={labelX} y={labelY}>
          {edge.label}
        </text>
      ) : null}
    </g>
  );
}
