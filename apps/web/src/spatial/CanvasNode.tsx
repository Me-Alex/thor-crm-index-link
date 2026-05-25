import type { SpatialNode } from "./types";

interface CanvasNodeProps {
  node: SpatialNode;
  selected: boolean;
  onSelect: (nodeId: string) => void;
}

export function CanvasNode({ node, selected, onSelect }: CanvasNodeProps) {
  return (
    <button
      type="button"
      className={`canvas-node tone-${node.tone}${selected ? " is-selected" : ""}`}
      style={{
        left: `${node.x}px`,
        top: `${node.y}px`,
        width: `${node.width}px`
      }}
      aria-pressed={selected}
      aria-label={node.title}
      onClick={() => onSelect(node.id)}
    >
      <span className="node-eyebrow">{node.eyebrow}</span>
      <strong>{node.title}</strong>
      <span className="node-subtitle">{node.subtitle}</span>
      <span className="node-body">{node.body}</span>
      <span className="node-metrics">
        {node.metrics.slice(0, 4).map((metric) => (
          <span key={`${node.id}-${metric.label}`} className={`node-metric metric-${metric.tone ?? "neutral"}`}>
            <span>{metric.label}</span>
            <b>{metric.value}</b>
          </span>
        ))}
      </span>
    </button>
  );
}
