interface RadarSidebarProps {
  authSessionEmail: string | undefined;
}

const navigationItems = ["Radar", "Anunturi", "Cautari salvate", "Alerte", "Surse", "Dedup", "Setari"];

export function RadarSidebar({ authSessionEmail }: RadarSidebarProps) {
  return (
    <aside className="radar-sidebar" aria-label="Thor navigation">
      <div className="radar-brand">
        <div className="radar-brand-mark" aria-hidden="true">
          <span />
          <span />
        </div>
        <div>
          <strong>THOR CRM</strong>
          <small>INDEX + LINK</small>
        </div>
      </div>

      <nav className="radar-nav" aria-label="Primary navigation">
        {navigationItems.map((item, index) => (
          <button
            key={item}
            type="button"
            className={`radar-nav-item${index === 0 ? " is-active" : ""}`}
            aria-current={index === 0 ? "page" : undefined}
          >
            <span className="radar-nav-glyph" aria-hidden="true" />
            <span>{item}</span>
          </button>
        ))}
      </nav>

      <section className="radar-sidebar-meta">
        <span className="radar-sidebar-label">Workspace</span>
        <strong>Agentia Demo</strong>
        <small>{authSessionEmail ?? "Admin"}</small>
      </section>

      <section className="radar-compliance-card" aria-label="Index and link policy">
        <strong>Nu republicam continut.</strong>
        <p>
          Thor normalizeaza anunturile si trimite agentii inapoi catre portalurile sursa. Fara re-hosting integral.
        </p>
      </section>
    </aside>
  );
}
