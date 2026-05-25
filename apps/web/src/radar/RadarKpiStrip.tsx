import type { RadarKpi } from "./radarModel";

interface RadarKpiStripProps {
  kpis: RadarKpi[];
}

export function RadarKpiStrip({ kpis }: RadarKpiStripProps) {
  return (
    <section className="radar-kpi-strip" aria-label="Dashboard metrics">
      {kpis.map((kpi) => (
        <article key={kpi.id} className={`radar-kpi-card is-${kpi.tone}`}>
          <span>{kpi.label}</span>
          <strong>{kpi.value}</strong>
          <small>{kpi.detail}</small>
        </article>
      ))}
    </section>
  );
}
