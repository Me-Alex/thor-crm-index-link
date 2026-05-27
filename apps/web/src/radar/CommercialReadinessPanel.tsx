import type { FormEvent } from "react";
import type { BillingPlan, CommercialReadinessGate } from "../data/demoData";
import type { RuntimeMode } from "../lib/runtimeConfig";

export interface CommercialReadinessPanelProps {
  runtimeMode: RuntimeMode;
  billingPlans: BillingPlan[];
  readinessGates: CommercialReadinessGate[];
  workspaceName: string;
  workspaceSlug: string;
  billingEmail: string;
  onboardingMessage: string;
  billingMessage: string;
  complianceEmail: string;
  complianceSubject: string;
  complianceTargetUrl: string;
  complianceDetails: string;
  complianceMessage: string;
  isCommercialActionLoading: boolean;
  onWorkspaceNameChange: (value: string) => void;
  onWorkspaceSlugChange: (value: string) => void;
  onBillingEmailChange: (value: string) => void;
  onWorkspaceSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPlanSelect: (plan: BillingPlan) => void;
  onComplianceEmailChange: (value: string) => void;
  onComplianceSubjectChange: (value: string) => void;
  onComplianceTargetUrlChange: (value: string) => void;
  onComplianceDetailsChange: (value: string) => void;
  onComplianceSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

const legalLinks = [
  { label: "Terms", href: "/legal/terms.html" },
  { label: "Privacy", href: "/legal/privacy.html" },
  { label: "DPA", href: "/legal/dpa.html" },
  { label: "SLA", href: "/legal/sla.html" },
  { label: "Takedown", href: "/legal/takedown.html" }
];

const gateStatusLabels: Record<CommercialReadinessGate["status"], string> = {
  ready: "ready",
  needs_secrets: "missing config",
  review_required: "legal review",
  blocked: "blocked"
};

export function CommercialReadinessPanel(props: CommercialReadinessPanelProps) {
  const isProduction = props.runtimeMode === "production";
  const blockers = props.readinessGates.filter((gate) => gate.status !== "ready");
  const panelStatusLabel = blockers.length === 0 ? (isProduction ? "production ready" : "pilot ready") : `${blockers.length} blockers`;
  const billingReady = isGateReady(props.readinessGates, "billing_checkout");
  const onboardingReady = isGateReady(props.readinessGates, "tenant_onboarding");
  const legalReady = isGateReady(props.readinessGates, "legal_pack");

  return (
    <section className="commercial-panel settings-panel" data-testid="commercial-readiness">
      <div className="settings-panel-hero">
        <div>
          <span>Administrare workspace</span>
          <strong>Setari operationale</strong>
          <p>Configureaza agentia, planurile si cererile de conformitate fara sa incarci restul dashboardului.</p>
        </div>
        <span className={blockers.length === 0 ? "is-ready" : "is-blocked"}>{panelStatusLabel}</span>
      </div>

      <div className="settings-card-grid">
        <article className="settings-card settings-card-primary">
          <div className="drawer-section-header">
            <strong>Workspace agentie</strong>
            <span>{onboardingReady ? "activabil" : "login necesar"}</span>
          </div>
          <form className="commercial-form" onSubmit={props.onWorkspaceSubmit}>
            <label>
              Agentie
              <input value={props.workspaceName} onChange={(event) => props.onWorkspaceNameChange(event.target.value)} placeholder="Agentia Nord" />
            </label>
            <label>
              Slug
              <input value={props.workspaceSlug} onChange={(event) => props.onWorkspaceSlugChange(event.target.value)} placeholder="agentia-nord" />
            </label>
            <label>
              Email facturare
              <input value={props.billingEmail} onChange={(event) => props.onBillingEmailChange(event.target.value)} placeholder="billing@agentie.ro" />
            </label>
            <button type="submit" disabled={props.isCommercialActionLoading || (isProduction && !onboardingReady)}>
              Creeaza workspace pilot
            </button>
            <p>{props.onboardingMessage}</p>
          </form>
        </article>

        <article className="settings-card">
          <div className="drawer-section-header">
            <strong>{isProduction ? "Gate-uri productie" : "Gate-uri pilot"}</strong>
            <span className={blockers.length === 0 ? "is-ready" : "is-blocked"}>{panelStatusLabel}</span>
          </div>
          <p className="commercial-message">
            {blockers.length === 0
              ? "Toate gate-urile sunt verzi."
              : blockers.map((gate) => `${gate.label}: ${gateStatusLabels[gate.status]}`).join(" · ")}
          </p>
          <div className="readiness-gates">
            {props.readinessGates.map((gate) => (
              <article key={gate.id} className={`readiness-gate is-${gate.status}`}>
                <span>{gate.label}</span>
                <strong>{gateStatusLabels[gate.status]}</strong>
                <em>{gate.owner}</em>
              </article>
            ))}
          </div>
        </article>

        <article className="settings-card settings-card-wide">
          <div className="drawer-section-header">
            <strong>Planuri si billing</strong>
            <span>{billingReady ? "checkout ok" : "pilot only"}</span>
          </div>
          <div className="billing-plan-grid">
            {props.billingPlans.map((plan) => (
              <article key={plan.id}>
                <div>
                  <strong>{plan.name}</strong>
                  <span>{plan.trialDays} zile trial</span>
                </div>
                <p>{plan.priceEurMonthly} EUR/luna</p>
                <button
                  type="button"
                  onClick={() => props.onPlanSelect(plan)}
                  disabled={props.isCommercialActionLoading || (isProduction && plan.checkoutRequired && !billingReady)}
                >
                  {plan.checkoutRequired ? "Porneste checkout" : "Foloseste pilot"}
                </button>
              </article>
            ))}
          </div>
          <p className="commercial-message">{props.billingMessage}</p>
        </article>

        <article className="settings-card settings-card-wide">
          <form className="commercial-form is-compliance" onSubmit={props.onComplianceSubmit}>
            <div className="drawer-section-header">
              <strong>Takedown / GDPR</strong>
              <span>auditabil</span>
            </div>
            <label>
              Email
              <input value={props.complianceEmail} onChange={(event) => props.onComplianceEmailChange(event.target.value)} placeholder="contact@example.ro" />
            </label>
            <label>
              Subiect
              <input value={props.complianceSubject} onChange={(event) => props.onComplianceSubjectChange(event.target.value)} placeholder="Cerere stergere listing" />
            </label>
            <label>
              URL
              <input value={props.complianceTargetUrl} onChange={(event) => props.onComplianceTargetUrlChange(event.target.value)} placeholder="https://portal.ro/anunt" />
            </label>
            <label>
              Detalii
              <textarea value={props.complianceDetails} onChange={(event) => props.onComplianceDetailsChange(event.target.value)} />
            </label>
            <button type="submit" disabled={props.isCommercialActionLoading || (isProduction && !legalReady)}>
              Inregistreaza cererea
            </button>
            <p>{props.complianceMessage}</p>
          </form>
          <nav className="legal-link-row" aria-label="Legal pages">
            {legalLinks.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
                {link.label}
              </a>
            ))}
          </nav>
        </article>
      </div>
    </section>
  );
}

function isGateReady(gates: CommercialReadinessGate[], id: string) {
  return gates.find((gate) => gate.id === id)?.status === "ready";
}
