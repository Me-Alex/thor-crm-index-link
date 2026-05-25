import type { SpatialGraphModel } from "./types";

interface NodeStackMobileProps {
  graph: SpatialGraphModel;
  selectedNodeId: string;
  onSelectNode: (nodeId: string) => void;
}

export function NodeStackMobile({ graph, selectedNodeId, onSelectNode }: NodeStackMobileProps) {
  return (
    <section className="node-stack-mobile" aria-label="Spatial nodes mobile">
      {graph.nodes.map((node) => (
        <button
          key={node.id}
          type="button"
          className={`mobile-node tone-${node.tone}${node.id === selectedNodeId ? " is-selected" : ""}`}
          aria-pressed={node.id === selectedNodeId}
          onClick={() => onSelectNode(node.id)}
        >
          <span>{node.eyebrow}</span>
          <strong>{node.title}</strong>
          <small>{node.subtitle}</small>
        </button>
      ))}
    </section>
  );
}
