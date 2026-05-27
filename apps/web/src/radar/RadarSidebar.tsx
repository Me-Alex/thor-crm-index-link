interface RadarSidebarProps {
  authSessionEmail: string | undefined;
  activeWorkspaceName: string;
  activeWorkspaceSubtitle: string;
  activePage: string;
  onNavigate: (pageId: string) => void;
}

const navigationItems = [
  { label: "Monitor", icon: "◈", pageId: "monitor" },
  { label: "Anunturi", icon: "▤", pageId: "listings" },
  { label: "Cautari salvate", icon: "⌕", pageId: "saved-searches" },
  { label: "Alerte", icon: "◌", badge: "14", pageId: "alerts" },
  { label: "Surse", icon: "⬡", pageId: "sources" },
  { label: "Dedup", icon: "⛓", pageId: "dedup" },
  { label: "Setari", icon: "⚙", pageId: "settings" }
];

export function RadarSidebar({
  authSessionEmail,
  activeWorkspaceName,
  activeWorkspaceSubtitle,
  activePage,
  onNavigate
}: RadarSidebarProps) {
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
        {navigationItems.map((item) => (
          <button
            key={item.label}
            type="button"
            className={`radar-nav-item${activePage === item.pageId ? " is-active" : ""}`}
            aria-label={item.label}
            aria-current={activePage === item.pageId ? "page" : undefined}
            onClick={() => onNavigate(item.pageId)}
          >
            <span className="radar-nav-glyph" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
            {item.badge ? <b>{item.badge}</b> : null}
          </button>
        ))}
      </nav>

      <section className="radar-sidebar-meta">
        <span className="radar-sidebar-label">Workspace</span>
        <div className="radar-workspace-switch">
          <strong>{activeWorkspaceName}</strong>
          <span>⌄</span>
        </div>
        <small>{authSessionEmail ?? activeWorkspaceSubtitle}</small>
      </section>

      <section className="radar-compliance-card" aria-label="Index and link policy">
        <strong>Nu republicam continut.</strong>
        <p>Thor normalizeaza anunturile si trimite agentii inapoi catre portalurile sursa. Fara re-hosting integral.</p>
        <span className="radar-shield" aria-hidden="true">
          ✓
        </span>
      </section>
    </aside>
  );
}
