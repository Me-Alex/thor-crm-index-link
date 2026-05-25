import { describe, expect, it, vi } from "vitest";
import { demoListings } from "../src/data/demoData";
import {
  buildDemoTenantWorkflow,
  createTenantWorkflowNote,
  demoOrgId,
  fetchTenantWorkflow,
  updateTenantWorkflowStatus
} from "../src/lib/tenantWorkflowApi";

describe("buildDemoTenantWorkflow", () => {
  it("creates link-only tenant workflow items from listings", () => {
    expect(buildDemoTenantWorkflow(demoListings, "tenant-demo")[0]).toMatchObject({
      id: "workflow-cl-apt-titan",
      orgId: "tenant-demo",
      tenantId: "tenant-demo",
      listingId: "cl-apt-titan",
      title: "Apartament 2 camere Titan",
      status: "new",
      assignee: "Alex",
      sourceName: "imobiliare.ro",
      sourceUrl: "https://example.test/imobiliare/titan-2-camere"
    });
  });
});

describe("fetchTenantWorkflow", () => {
  it("loads workflow state from authenticated Worker tenant endpoints", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            state: {
              status: "in_progress",
              assigneeUserId: "user-1",
              lastSeenByOrgAt: "2026-05-25T09:00:00.000Z",
              updatedAt: "2026-05-25T10:00:00.000Z"
            },
            tags: [{ id: "tag-1", name: "urgent", color: "#ef4444" }],
            notes: [
              {
                id: "note-1",
                body: "Sunat proprietar.",
                authorUserId: "user-1",
                createdAt: "2026-05-25T10:15:00.000Z"
              }
            ]
          }
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      )
    );

    await expect(
      fetchTenantWorkflow({
        baseUrl: "https://worker.example.dev/",
        orgId: demoOrgId,
        listings: [demoListings[0]!],
        accessToken: "user-token",
        fetchImpl
      })
    ).resolves.toEqual([
      {
        id: "workflow-cl-apt-titan",
        orgId: demoOrgId,
        tenantId: demoOrgId,
        listingId: "cl-apt-titan",
        title: "Apartament 2 camere Titan",
        status: "in_progress",
        assignee: "user-1",
        sourceName: "imobiliare.ro",
        sourceUrl: "https://example.test/imobiliare/titan-2-camere",
        updatedAt: "2026-05-25T10:00:00.000Z",
        tags: [{ id: "tag-1", name: "urgent", color: "#ef4444" }],
        notes: [
          {
            id: "note-1",
            body: "Sunat proprietar.",
            authorUserId: "user-1",
            createdAt: "2026-05-25T10:15:00.000Z"
          }
        ]
      }
    ]);
    expect(fetchImpl).toHaveBeenCalledWith(
      `https://worker.example.dev/api/orgs/${demoOrgId}/listings/cl-apt-titan/workflow`,
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer user-token"
        })
      })
    );
  });
});

describe("createTenantWorkflowNote", () => {
  it("posts tenant notes through the authenticated Worker endpoint", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: "note-1",
            body: "Verificat link sursa.",
            authorUserId: "user-1",
            createdAt: "2026-05-25T11:00:00.000Z"
          }
        }),
        { status: 201 }
      )
    );

    await expect(
      createTenantWorkflowNote({
        baseUrl: "https://worker.example.dev",
        orgId: demoOrgId,
        listingId: "listing-1",
        body: "Verificat link sursa.",
        accessToken: "user-token",
        fetchImpl
      })
    ).resolves.toEqual({
      id: "note-1",
      body: "Verificat link sursa.",
      authorUserId: "user-1",
      createdAt: "2026-05-25T11:00:00.000Z"
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      `https://worker.example.dev/api/orgs/${demoOrgId}/listings/listing-1/notes`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer user-token",
          "content-type": "application/json"
        }),
        body: JSON.stringify({ body: "Verificat link sursa." })
      })
    );
  });
});

describe("updateTenantWorkflowStatus", () => {
  it("patches status for one listing with an explicit tenant id", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await expect(
      updateTenantWorkflowStatus({
        baseUrl: "https://worker.example.dev",
        orgId: demoOrgId,
        listingId: "listing-1",
        status: "contacted",
        accessToken: "user-token",
        fetchImpl
      })
    ).resolves.toEqual({ ok: true });

    expect(fetchImpl).toHaveBeenCalledWith(
      `https://worker.example.dev/api/orgs/${demoOrgId}/listings/listing-1/state`,
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({
          authorization: "Bearer user-token",
          "content-type": "application/json"
        }),
        body: JSON.stringify({ status: "contacted" })
      })
    );
  });
});
