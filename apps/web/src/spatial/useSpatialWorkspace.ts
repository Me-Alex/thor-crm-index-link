import { useEffect, useMemo, useState } from "react";
import type { AlertDelivery, DemoListing, SavedSearch, SourceHealth } from "../data/demoData";
import type { TenantWorkflowItem } from "../lib/tenantWorkflowApi";
import { buildSpatialGraphModel } from "./spatialGraph";

interface UseSpatialWorkspaceOptions {
  listings: DemoListing[];
  sourceHealth: SourceHealth[];
  workflowItems: TenantWorkflowItem[];
  savedSearches: SavedSearch[];
  alertDeliveries: AlertDelivery[];
}

export function useSpatialWorkspace(options: UseSpatialWorkspaceOptions) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();
  const [commandQuery, setCommandQuery] = useState("");
  const normalizedQuery = commandQuery.trim().toLowerCase();

  const visibleListings = useMemo(() => {
    if (!normalizedQuery) {
      return options.listings;
    }

    return options.listings.filter((listing) => {
      const haystack = [
        listing.title,
        listing.city,
        listing.district,
        listing.neighborhood,
        listing.propertyType,
        listing.transactionType,
        listing.assignee,
        ...listing.tags,
        ...listing.sources.map((source) => source.name)
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery, options.listings]);

  const graph = useMemo(() => {
    const graphOptions = {
        listings: visibleListings,
        sourceHealth: options.sourceHealth,
        workflowItems: options.workflowItems,
        savedSearches: options.savedSearches,
        alertDeliveries: options.alertDeliveries,
        ...(selectedNodeId ? { selectedNodeId } : {})
      };

    return buildSpatialGraphModel(graphOptions);
  }, [visibleListings, options.sourceHealth, options.workflowItems, options.savedSearches, options.alertDeliveries, selectedNodeId]);

  useEffect(() => {
    if (!selectedNodeId || !graph.nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(graph.selectedNodeId);
    }
  }, [graph.nodes, graph.selectedNodeId, selectedNodeId]);

  const selectedNode = graph.nodes.find((node) => node.id === graph.selectedNodeId) ?? graph.nodes[0];
  const selectedListing = selectedNode?.listingId
    ? options.listings.find((listing) => listing.id === selectedNode.listingId)
    : undefined;
  const selectedWorkflowItem = selectedListing
    ? options.workflowItems.find((item) => item.listingId === selectedListing.id)
    : undefined;

  return {
    commandQuery,
    setCommandQuery,
    graph,
    selectedNode,
    selectedListing,
    selectedWorkflowItem,
    selectNode: setSelectedNodeId
  };
}
