import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { alertDeliveries, demoListings, savedSearches, sourceHealth } from "../src/data/demoData";
import { buildDemoTenantWorkflow } from "../src/lib/tenantWorkflowApi";
import { buildSpatialGraphModel } from "../src/spatial/spatialGraph";
import { SpatialAppShell } from "../src/spatial/SpatialAppShell";
import { SpatialCanvas } from "../src/spatial/SpatialCanvas";
import type { ComponentProps } from "react";

describe("SpatialCanvas", () => {
  it("renders accessible spatial nodes and calls selection handler", () => {
    const graph = buildSpatialGraphModel({
      listings: demoListings,
      sourceHealth,
      workflowItems: buildDemoTenantWorkflow(demoListings),
      savedSearches,
      alertDeliveries,
      selectedNodeId: "listing-cl-apt-titan"
    });
    const onSelectNode = vi.fn();

    render(<SpatialCanvas graph={graph} selectedNodeId={graph.selectedNodeId} onSelectNode={onSelectNode} />);

    const canvas = screen.getByTestId("spatial-canvas");
    expect(within(canvas).getByRole("button", { name: "Apartament 2 camere Titan" })).toBeInTheDocument();

    fireEvent.click(within(canvas).getByRole("button", { name: /Tenant workflow/i }));

    expect(onSelectNode).toHaveBeenCalledWith("workflow-cl-apt-titan");
  });
});

describe("SpatialAppShell", () => {
  it("filters through command search and updates inspector selection", () => {
    const onWorkflowStatusChange = vi.fn();

    render(
      <SpatialAppShell
        {...buildSpatialShellProps({
          onWorkflowStatusChange
        })}
      />
    );

    fireEvent.change(screen.getByLabelText(/Command search/i), {
      target: { value: "herastrau" }
    });

    const canvas = screen.getByTestId("spatial-canvas");
    expect(within(canvas).getByRole("button", { name: "Studio premium Herastrau" })).toBeInTheDocument();
    expect(within(canvas).queryByRole("button", { name: "Apartament 2 camere Titan" })).not.toBeInTheDocument();

    fireEvent.click(within(canvas).getByRole("button", { name: "Studio premium Herastrau" }));

    const inspector = screen.getByTestId("node-inspector");
    expect(within(inspector).getByText(/Studio premium Herastrau/i)).toBeInTheDocument();
    expect(within(inspector).getByRole("link", { name: /Open source/i })).toHaveAttribute(
      "href",
      "https://example.test/publi24/studio-herastrau"
    );
  });

  it("keeps workflow status actions available from the inspector", () => {
    const onWorkflowStatusChange = vi.fn();
    const onWorkflowNoteCreate = vi.fn();
    const workflowItems = [
      {
        ...buildDemoTenantWorkflow(demoListings)[0]!,
        tags: [{ id: "tag-1", name: "urgent", color: "#ef4444" }],
        notes: [
          {
            id: "note-1",
            body: "Sunat proprietar, revine maine.",
            authorUserId: "agent-1",
            createdAt: "2026-05-25T10:00:00.000Z"
          }
        ]
      }
    ];

    render(
      <SpatialAppShell
        {...buildSpatialShellProps({
          workflowItems,
          onWorkflowStatusChange,
          onWorkflowNoteCreate
        })}
      />
    );

    fireEvent.click(within(screen.getByTestId("spatial-canvas")).getByRole("button", { name: /Tenant workflow/i }));
    fireEvent.click(screen.getByRole("button", { name: "Contacted" }));
    fireEvent.change(screen.getByLabelText(/Nota workflow/i), {
      target: { value: "Verificat link sursa." }
    });
    fireEvent.click(screen.getByRole("button", { name: "Adauga nota" }));

    expect(screen.getByRole("button", { name: "Adauga nota" })).toBeInTheDocument();
    expect(screen.getByText(/urgent/i)).toBeInTheDocument();
    expect(screen.getByText(/Sunat proprietar/i)).toBeInTheDocument();
    expect(screen.getByText(/Note count: 1/i)).toBeInTheDocument();
    expect(onWorkflowStatusChange).toHaveBeenCalledWith("cl-apt-titan", "contacted");
    expect(onWorkflowNoteCreate).toHaveBeenCalledWith("cl-apt-titan", "Verificat link sursa.");
  });

  it("renders a mobile node stack in addition to the desktop canvas", () => {
    render(
      <SpatialAppShell {...buildSpatialShellProps()} />
    );

    expect(screen.getByLabelText(/Spatial nodes mobile/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Canvas minimap/i)).toBeInTheDocument();
  });
});

function buildSpatialShellProps(
  overrides: Partial<ComponentProps<typeof SpatialAppShell>> = {}
): ComponentProps<typeof SpatialAppShell> {
  return {
    listings: demoListings,
    sourceHealth,
    workflowItems: buildDemoTenantWorkflow(demoListings),
    savedSearches,
    alertDeliveries,
    dataMode: "fallback",
    dataMessage: "Demo fallback",
    workflowMode: "demo",
    workflowMessage: "Workflow demo",
    workflowActionMessage: "",
    isLoadingListings: false,
    isLoadingWorkflow: false,
    authSessionEmail: undefined,
    authEmail: "",
    authPassword: "",
    authMessage: "Login Supabase",
    isAuthLoading: false,
    savedSearchName: "",
    savedSearchCriteria: "",
    savedSearchFrequency: "near real-time",
    savedSearchAlertChannel: "in_app",
    savedSearchAlertsEnabled: true,
    savedSearchMessage: "Saved searches demo",
    editingSavedSearchId: null,
    onRefreshListings: vi.fn(),
    onWorkflowStatusChange: vi.fn(),
    onWorkflowNoteCreate: vi.fn(),
    onAuthEmailChange: vi.fn(),
    onAuthPasswordChange: vi.fn(),
    onAuthSubmit: vi.fn(),
    onAuthLogout: vi.fn(),
    onSavedSearchNameChange: vi.fn(),
    onSavedSearchCriteriaChange: vi.fn(),
    onSavedSearchFrequencyChange: vi.fn(),
    onSavedSearchAlertChannelChange: vi.fn(),
    onSavedSearchAlertsEnabledChange: vi.fn(),
    onSavedSearchSubmit: vi.fn(),
    onSavedSearchEdit: vi.fn(),
    onSavedSearchDelete: vi.fn(),
    ...overrides
  };
}
