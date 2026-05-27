interface CommandBarProps {
  commandQuery: string;
  dataMode: "fallback" | "live";
  dataMessage: string;
  listingCount: number;
  isLoadingListings: boolean;
  onCommandQueryChange: (query: string) => void;
  onRefreshListings: () => void;
}

export function CommandBar({
  commandQuery,
  dataMode,
  dataMessage,
  listingCount,
  isLoadingListings,
  onCommandQueryChange,
  onRefreshListings
}: CommandBarProps) {
  return (
    <header className="spatial-command-bar">
      <div className="spatial-brand">
        <span className="brand-orb" aria-hidden="true" />
        <div>
          <strong>Thor Spatial</strong>
          <span>
            {listingCount} listinguri · {dataMode === "live" ? "live Worker" : "demo fallback"}
          </span>
        </div>
      </div>
      <label className="command-input">
        <span>Command search</span>
        <input
          value={commandQuery}
          onChange={(event) => onCommandQueryChange(event.target.value)}
          placeholder="Cmd+K cauta, conecteaza, asigneaza"
        />
      </label>
      <div className="command-actions">
        <span>{dataMessage}</span>
        <button type="button" onClick={onRefreshListings} disabled={isLoadingListings}>
          {isLoadingListings ? "Se actualizeaza..." : "Actualizeaza"}
        </button>
      </div>
    </header>
  );
}
