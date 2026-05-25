import type { FormEvent } from "react";
import type { SavedSearch } from "../data/demoData";

interface SpatialUtilityPanelProps {
  authSessionEmail: string | undefined;
  authEmail: string;
  authPassword: string;
  authMessage: string;
  isAuthLoading: boolean;
  savedSearches: SavedSearch[];
  savedSearchName: string;
  savedSearchCriteria: string;
  savedSearchFrequency: SavedSearch["frequency"];
  savedSearchMessage: string;
  editingSavedSearchId: string | null;
  onAuthEmailChange: (email: string) => void;
  onAuthPasswordChange: (password: string) => void;
  onAuthSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onAuthLogout: () => void;
  onSavedSearchNameChange: (name: string) => void;
  onSavedSearchCriteriaChange: (criteria: string) => void;
  onSavedSearchFrequencyChange: (frequency: SavedSearch["frequency"]) => void;
  onSavedSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSavedSearchEdit: (search: SavedSearch) => void;
  onSavedSearchDelete: (search: SavedSearch) => void;
}

export function SpatialUtilityPanel({
  authSessionEmail,
  authEmail,
  authPassword,
  authMessage,
  isAuthLoading,
  savedSearches,
  savedSearchName,
  savedSearchCriteria,
  savedSearchFrequency,
  savedSearchMessage,
  editingSavedSearchId,
  onAuthEmailChange,
  onAuthPasswordChange,
  onAuthSubmit,
  onAuthLogout,
  onSavedSearchNameChange,
  onSavedSearchCriteriaChange,
  onSavedSearchFrequencyChange,
  onSavedSearchSubmit,
  onSavedSearchEdit,
  onSavedSearchDelete
}: SpatialUtilityPanelProps) {
  return (
    <aside className="spatial-utility-panel" aria-label="Workspace controls">
      <section data-testid="supabase-auth">
        <div className="utility-heading">
          <span>Tenant access</span>
          <strong>{authSessionEmail ? "Autentificat" : "Neautentificat"}</strong>
        </div>
        <form className="utility-form" onSubmit={onAuthSubmit}>
          <label>
            <span>Email Supabase</span>
            <input
              type="email"
              value={authEmail}
              onChange={(event) => onAuthEmailChange(event.target.value)}
              placeholder="agent@agentie.ro"
              autoComplete="email"
              required
            />
          </label>
          <label>
            <span>Parola Supabase</span>
            <input
              type="password"
              value={authPassword}
              onChange={(event) => onAuthPasswordChange(event.target.value)}
              placeholder="Parola contului"
              autoComplete="current-password"
              required
            />
          </label>
          <div className="utility-actions">
            <button type="submit" disabled={isAuthLoading}>
              {isAuthLoading ? "Se autentifica" : "Login Supabase"}
            </button>
            <button type="button" onClick={onAuthLogout} disabled={!authSessionEmail}>
              Logout
            </button>
          </div>
        </form>
        <p className="utility-note" role="status" aria-live="polite">
          {authMessage}
        </p>
      </section>

      <section data-testid="saved-searches">
        <div className="utility-heading">
          <span>Saved searches</span>
          <strong>{savedSearches.length}</strong>
        </div>
        <form className="utility-form" onSubmit={onSavedSearchSubmit}>
          <label>
            <span>Nume cautare</span>
            <input
              value={savedSearchName}
              onChange={(event) => onSavedSearchNameChange(event.target.value)}
              placeholder="Apartamente Bucuresti sub 120k"
              required
            />
          </label>
          <label>
            <span>Criterii cautare</span>
            <input
              value={savedSearchCriteria}
              onChange={(event) => onSavedSearchCriteriaChange(event.target.value)}
              placeholder="sale apartment Bucuresti max 120000 EUR"
              required
            />
          </label>
          <label>
            <span>Frecventa alerta</span>
            <select
              value={savedSearchFrequency}
              onChange={(event) => onSavedSearchFrequencyChange(parseSavedSearchFrequency(event.target.value))}
            >
              <option value="near real-time">near real-time</option>
              <option value="hourly">hourly</option>
              <option value="daily">daily</option>
            </select>
          </label>
          <button type="submit">{editingSavedSearchId ? "Actualizeaza cautare" : "Salveaza cautare"}</button>
        </form>
        <p className="utility-note" role="status" aria-live="polite">
          {savedSearchMessage}
        </p>
        <div className="utility-list">
          {savedSearches.map((search) => (
            <article key={search.id}>
              <strong>{search.name}</strong>
              <span>{search.criteria}</span>
              <em>
                {search.matches} match · {search.frequency}
              </em>
              <div className="utility-actions">
                <button type="button" aria-label={`Editeaza ${search.name}`} onClick={() => onSavedSearchEdit(search)}>
                  Editeaza
                </button>
                <button type="button" aria-label={`Sterge ${search.name}`} onClick={() => onSavedSearchDelete(search)}>
                  Sterge
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </aside>
  );
}

function parseSavedSearchFrequency(value: string): SavedSearch["frequency"] {
  return value === "hourly" || value === "daily" ? value : "near real-time";
}
