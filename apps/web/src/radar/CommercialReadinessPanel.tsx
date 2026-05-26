import type { FormEvent } from "react";
import type { BillingPlan, CommercialReadinessGate } from "../data/demoData";

export interface CommercialReadinessPanelProps {
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

export function CommercialReadinessPanel(props: CommercialReadinessPanelProps) {
  return (
    <section className="commercial-panel" data-testid="commercial-readiness">
      <div className="drawer-section-header">
        <strong>Vanzare si operare</strong>
        <span>pilot ready</span>
      </div>

      <div className="readiness-gates">
        {props.readinessGates.map((gate) => (
          <article key={gate.id} className={`readiness-gate is-${gate.status}`}>
            <span>{gate.label}</span>
            <strong>{gate.status.replace(/_/gu, " ")}</strong>
          </article>
        ))}
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
        <button type="submit" disabled={props.isCommercialActionLoading}>
          Creeaza workspace pilot
        </button>
        <p>{props.onboardingMessage}</p>
      </form>

      <div className="billing-plan-grid">
        {props.billingPlans.map((plan) => (
          <article key={plan.id}>
            <div>
              <strong>{plan.name}</strong>
              <span>{plan.trialDays} zile trial</span>
            </div>
            <p>{plan.priceEurMonthly} EUR/luna</p>
            <button type="button" onClick={() => props.onPlanSelect(plan)} disabled={props.isCommercialActionLoading}>
              {plan.checkoutRequired ? "Porneste checkout" : "Foloseste pilot"}
            </button>
          </article>
        ))}
      </div>
      <p className="commercial-message">{props.billingMessage}</p>

      <form className="commercial-form" onSubmit={props.onComplianceSubmit}>
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
        <button type="submit" disabled={props.isCommercialActionLoading}>
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
    </section>
  );
}
