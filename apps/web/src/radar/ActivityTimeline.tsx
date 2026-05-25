import type { RadarActivityEvent } from "./radarModel";

interface ActivityTimelineProps {
  events: RadarActivityEvent[];
}

export function ActivityTimeline({ events }: ActivityTimelineProps) {
  return (
    <section className="activity-timeline-panel" aria-label="Activitate live">
      <div className="panel-heading">
        <strong>Activitate live</strong>
        <span>Auto refresh</span>
      </div>
      <div className="activity-timeline-list">
        {events.map((event) => (
          <article key={event.id} className={`activity-event is-${event.tone}`}>
            <span className="activity-event-time">{event.time}</span>
            <strong>{event.title}</strong>
            <p>{event.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
