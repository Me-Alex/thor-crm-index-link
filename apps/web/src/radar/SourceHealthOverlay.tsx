import type { SourceHealth } from "../data/demoData";

interface SourceHealthOverlayProps {
  sources: SourceHealth[];
}

export function SourceHealthOverlay({ sources }: SourceHealthOverlayProps) {
  return (
    <section className="source-health-overlay" aria-label="Health surse">
      <header>
        <strong>Health surse</strong>
        <span>parse success</span>
      </header>
      <div className="source-health-list">
        {sources.map((source) => (
          <article key={source.id}>
            <div className="source-health-row">
              <strong>{source.name}</strong>
              <span className={`source-health-mode is-${source.mode}`}>{source.mode}</span>
            </div>
            <div className="source-health-bar">
              <span style={{ width: `${Math.round(source.parseSuccessRate * 100)}%` }} />
            </div>
            <div className="source-health-meta">
              <span>{Math.round(source.parseSuccessRate * 100)}%</span>
              <span>{Math.round(source.fieldCoverageRate * 100)}% coverage</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
