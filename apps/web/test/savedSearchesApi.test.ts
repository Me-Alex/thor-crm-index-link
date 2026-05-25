import { describe, expect, it, vi } from "vitest";
import {
  createTenantSavedSearch,
  deleteTenantSavedSearch,
  fetchTenantSavedSearches,
  updateTenantSavedSearch
} from "../src/lib/savedSearchesApi";
import { demoOrgId } from "../src/lib/tenantWorkflowApi";

describe("tenant saved searches API client", () => {
  it("loads saved searches with alert frequency from the Worker", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      Response.json({
        data: [
          {
            id: "search-1",
            name: "Bucuresti apartamente",
            criteria: { query: "sale apartment Bucuresti max 120000" },
            alerts: [{ channel: "webhook", frequency: "near_real_time", isEnabled: false }]
          }
        ],
        count: 1
      })
    );

    await expect(
      fetchTenantSavedSearches({
        baseUrl: "https://worker.example.dev",
        orgId: demoOrgId,
        accessToken: "user-token",
        fetchImpl
      })
    ).resolves.toEqual([
      {
        id: "search-1",
        name: "Bucuresti apartamente",
        criteria: "sale apartment Bucuresti max 120000",
        matches: 0,
        frequency: "near real-time",
        alertChannel: "webhook",
        alertsEnabled: false
      }
    ]);
    expect(fetchImpl).toHaveBeenCalledWith(
      `https://worker.example.dev/api/orgs/${demoOrgId}/saved-searches`,
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer user-token"
        })
      })
    );
  });

  it("creates, updates, and deletes saved searches through tenant endpoints", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          {
            data: {
              id: "search-1",
              name: "Noua cautare",
              criteria: { query: "Bucuresti 2 camere" },
              alerts: [{ channel: "email", frequency: "hourly", isEnabled: true }]
            }
          },
          { status: 201 }
        )
      )
      .mockResolvedValueOnce(
        Response.json({
          data: {
            id: "search-1",
            name: "Cautare editata",
            criteria: { query: "Bucuresti 3 camere" },
            alerts: [{ channel: "webhook", frequency: "daily", isEnabled: false }]
          }
        })
      )
      .mockResolvedValueOnce(Response.json({ data: { id: "search-1", deleted: true } }));

    await expect(
      createTenantSavedSearch({
        baseUrl: "https://worker.example.dev",
        orgId: demoOrgId,
        accessToken: "user-token",
        name: "Noua cautare",
        criteria: "Bucuresti 2 camere",
        frequency: "hourly",
        alertChannel: "email",
        alertsEnabled: true,
        fetchImpl
      })
    ).resolves.toMatchObject({ id: "search-1", name: "Noua cautare", frequency: "hourly", alertChannel: "email", alertsEnabled: true });

    await expect(
      updateTenantSavedSearch({
        baseUrl: "https://worker.example.dev",
        orgId: demoOrgId,
        accessToken: "user-token",
        searchId: "search-1",
        name: "Cautare editata",
        criteria: "Bucuresti 3 camere",
        frequency: "daily",
        alertChannel: "webhook",
        alertsEnabled: false,
        fetchImpl
      })
    ).resolves.toMatchObject({ id: "search-1", name: "Cautare editata", frequency: "daily", alertChannel: "webhook", alertsEnabled: false });

    await expect(
      deleteTenantSavedSearch({
        baseUrl: "https://worker.example.dev",
        orgId: demoOrgId,
        accessToken: "user-token",
        searchId: "search-1",
        fetchImpl
      })
    ).resolves.toBeUndefined();

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      `https://worker.example.dev/api/orgs/${demoOrgId}/saved-searches`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Noua cautare",
          criteria: { query: "Bucuresti 2 camere" },
          alert: {
            channel: "email",
            frequency: "hourly",
            thresholdMinutes: 5,
            isEnabled: true
          }
        })
      })
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      `https://worker.example.dev/api/orgs/${demoOrgId}/saved-searches/search-1`,
      expect.objectContaining({ method: "PATCH" })
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      3,
      `https://worker.example.dev/api/orgs/${demoOrgId}/saved-searches/search-1`,
      expect.objectContaining({ method: "DELETE" })
    );
  });
});
