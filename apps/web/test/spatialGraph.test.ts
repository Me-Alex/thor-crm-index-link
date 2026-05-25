import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { alertDeliveries, demoListings, savedSearches, sourceHealth } from "../src/data/demoData";
import { buildDemoTenantWorkflow } from "../src/lib/tenantWorkflowApi";
import { buildSpatialGraphModel } from "../src/spatial/spatialGraph";
import { useSpatialWorkspace } from "../src/spatial/useSpatialWorkspace";

describe("buildSpatialGraphModel", () => {
  it("builds deterministic P1B nodes from existing Thor data", () => {
    const graph = buildSpatialGraphModel({
      listings: demoListings,
      sourceHealth,
      workflowItems: buildDemoTenantWorkflow(demoListings),
      savedSearches,
      alertDeliveries,
      selectedNodeId: "listing-cl-apt-titan"
    });

    expect(graph.selectedNodeId).toBe("listing-cl-apt-titan");
    expect(graph.primaryListingId).toBe("cl-apt-titan");
    expect(graph.nodes.map((node) => node.kind)).toEqual(
      expect.arrayContaining([
        "listing",
        "source_cluster",
        "tenant_workflow",
        "saved_search",
        "source_health",
        "price_history",
        "alert_delivery"
      ])
    );
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: "listing-cl-apt-titan", to: "source-cluster" }),
        expect.objectContaining({ from: "listing-cl-apt-titan", to: "workflow-cl-apt-titan" })
      ])
    );
  });

  it("keeps source actions as index plus link URLs", () => {
    const graph = buildSpatialGraphModel({
      listings: demoListings,
      sourceHealth,
      workflowItems: buildDemoTenantWorkflow(demoListings),
      savedSearches,
      alertDeliveries,
      selectedNodeId: "listing-cl-apt-titan"
    });

    const listingNode = graph.nodes.find((node) => node.id === "listing-cl-apt-titan");

    expect(listingNode?.body).toMatch(/index \+ link/i);
    expect(listingNode?.actions).toContainEqual({
      id: "open-source-cl-apt-titan",
      label: "Open source",
      type: "open_url",
      url: "https://example.test/imobiliare/titan-2-camere"
    });
  });

  it("returns an explicit empty-state graph when there are no listings", () => {
    const graph = buildSpatialGraphModel({
      listings: [],
      sourceHealth,
      workflowItems: [],
      savedSearches,
      alertDeliveries,
      selectedNodeId: undefined
    });

    expect(graph.selectedNodeId).toBe("empty-state");
    expect(graph.primaryListingId).toBeUndefined();
    expect(graph.nodes).toContainEqual(
      expect.objectContaining({
        id: "empty-state",
        kind: "empty_state",
        title: "Nu exista listinguri indexate"
      })
    );
  });
});

describe("useSpatialWorkspace", () => {
  it("filters listings through the command query and keeps a selected node", () => {
    const { result } = renderHook(() =>
      useSpatialWorkspace({
        listings: demoListings,
        sourceHealth,
        workflowItems: buildDemoTenantWorkflow(demoListings),
        savedSearches,
        alertDeliveries
      })
    );

    act(() => result.current.setCommandQuery("herastrau"));

    expect(result.current.graph.summary.listingCount).toBe(1);
    expect(result.current.graph.primaryListingId).toBe("cl-rent-herastrau");
    expect(result.current.selectedNode?.title).toBe("Studio premium Herastrau");
  });
});
