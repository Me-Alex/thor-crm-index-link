import type { FormEvent } from "react";
import type { SavedSearch } from "../data/demoData";
import { RadarSelect, type RadarSelectOption } from "../radar/RadarSelect";

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
  savedSearchAlertChannel: SavedSearch["alertChannel"];
  savedSearchAlertsEnabled: boolean;
  savedSearchMessage: string;
  editingSavedSearchId: string | null;
  onAuthEmailChange: (email: string) => void;
  onAuthPasswordChange: (password: string) => void;
  onAuthSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onAuthLogout: () => void;
  onSavedSearchNameChange: (name: string) => void;
  onSavedSearchCriteriaChange: (criteria: string) => void;
  onSavedSearchFrequencyChange: (frequency: SavedSearch["frequency"]) => void;
  onSavedSearchAlertChannelChange: (channel: SavedSearch["alertChannel"]) => void;
  onSavedSearchAlertsEnabledChange: (enabled: boolean) => void;
  onSavedSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSavedSearchEdit: (search: SavedSearch) => void;
  onSavedSearchDelete: (search: SavedSearch) => void;
}

const savedSearchFrequencyOptions: Array<RadarSelectOption<SavedSearch["frequency"]>> = [
  { label: "near real-time", value: "near real-time" },
  { label: "hourly", value: "hourly" },
  { label: "daily", value: "daily" }
];

const savedSearchAlertChannelOptions: Array<RadarSelectOption<SavedSearch["alertChannel"]>> = [
  { label: "in-app", value: "in_app" },
  { label: "email", value: "email" },
  { label: "webhook", value: "webhook" }
];

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
  savedSearchAlertChannel,
  savedSearchAlertsEnabled,
  savedSearchMessage,
  editingSavedSearchId,
  onAuthEmailChange,
  onAuthPasswordChange,
  onAuthSubmit,
  onAuthLogout,
  onSavedSearchNameChange,
  onSavedSearchCriteriaChange,
  onSavedSearchFrequencyChange,
  onSavedSearchAlertChannelChange,
  onSavedSearchAlertsEnabledChange,
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
          <RadarSelect
            className="utility-select"
            label="Frecventa alerta"
            value={savedSearchFrequency}
            options={savedSearchFrequencyOptions}
            onChange={onSavedSearchFrequencyChange}
          />
          <RadarSelect
            className="utility-select"
            label="Canal alerta"
            value={savedSearchAlertChannel}
            options={savedSearchAlertChannelOptions}
            onChange={onSavedSearchAlertChannelChange}
          />
          <label className="utility-check">
            <input
              type="checkbox"
              checked={savedSearchAlertsEnabled}
              onChange={(event) => onSavedSearchAlertsEnabledChange(event.target.checked)}
            />
            <span>Alerte active</span>
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
                {search.matches} match · {search.frequency} · {search.alertChannel} · {search.alertsEnabled ? "on" : "off"}
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
