import { describe, expect, it, vi } from "vitest";
import { handleRequest } from "../src/http/router";
import type { Env } from "../src/runtime/env";

const orgId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const canonicalListingId = "33333333-3333-4333-8333-333333333333";

describe("tenant workflow API", () => {
  it("allows authenticated API CORS preflight without exposing admin routes", async () => {
    const response = await handleRequest(
      new Request(`https://worker.test/api/orgs/${orgId}/listings/${canonicalListingId}/workflow`, {
        method: "OPTIONS"
      }),
      env()
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-methods")).toBe("GET, POST, PATCH, DELETE, OPTIONS");
    expect(response.headers.get("access-control-allow-headers")).toContain("authorization");
  });

  it("rejects tenant workflow requests without a bearer token", async () => {
    const response = await handleRequest(
      new Request(`https://worker.test/api/orgs/${orgId}/listings/${canonicalListingId}/workflow`),
      env(),
      { fetch: vi.fn() }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "unauthorized",
      message: "Authentication required"
    });
  });

  it("rejects users that are not members of the requested org", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ id: userId }))
      .mockResolvedValueOnce(Response.json([]));

    const response = await handleRequest(
      authorizedRequest(`https://worker.test/api/orgs/${orgId}/listings/${canonicalListingId}/workflow`),
      env(),
      { fetch: fetchMock }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "forbidden",
      message: "User is not a member of this organization"
    });
    expect(new URL(String(fetchMock.mock.calls[0]?.[0])).pathname).toBe("/auth/v1/user");
    expect(new URL(String(fetchMock.mock.calls[1]?.[0])).pathname).toBe("/rest/v1/organization_members");
  });

  it("returns tenant state, tags, and notes for an org member without exposing secrets", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ id: userId }))
      .mockResolvedValueOnce(Response.json([{ role: "agent" }]))
      .mockResolvedValueOnce(
        Response.json([
          {
            status: "in_progress",
            assignee_user_id: userId,
            last_seen_by_org_at: "2026-05-25T08:00:00.000Z",
            updated_at: "2026-05-25T08:01:00.000Z"
          }
        ])
      )
      .mockResolvedValueOnce(Response.json([{ tag_id: "44444444-4444-4444-8444-444444444444" }]))
      .mockResolvedValueOnce(
        Response.json([
          {
            id: "44444444-4444-4444-8444-444444444444",
            name: "urgent",
            color: "#ef4444"
          }
        ])
      )
      .mockResolvedValueOnce(
        Response.json([
          {
            id: "55555555-5555-4555-8555-555555555555",
            body: "Sunat proprietar, revine maine.",
            author_user_id: userId,
            created_at: "2026-05-25T08:05:00.000Z"
          }
        ])
      );

    const response = await handleRequest(
      authorizedRequest(`https://worker.test/api/orgs/${orgId}/listings/${canonicalListingId}/workflow`),
      env(),
      { fetch: fetchMock }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    const body = await response.json();
    expect(body).toEqual({
      data: {
        state: {
          status: "in_progress",
          assigneeUserId: userId,
          lastSeenByOrgAt: "2026-05-25T08:00:00.000Z",
          updatedAt: "2026-05-25T08:01:00.000Z"
        },
        tags: [
          {
            id: "44444444-4444-4444-8444-444444444444",
            name: "urgent",
            color: "#ef4444"
          }
        ],
        notes: [
          {
            id: "55555555-5555-4555-8555-555555555555",
            body: "Sunat proprietar, revine maine.",
            authorUserId: userId,
            createdAt: "2026-05-25T08:05:00.000Z"
          }
        ]
      }
    });
    expect(JSON.stringify(body)).not.toContain("service-role-secret");
  });

  it("validates tenant state updates before writing", async () => {
    const response = await handleRequest(
      authorizedRequest(`https://worker.test/api/orgs/${orgId}/listings/${canonicalListingId}/state`, {
        method: "PATCH",
        body: JSON.stringify({ status: "sold" })
      }),
      env(),
      { fetch: vi.fn() }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "bad_request",
      message: "Invalid tenant listing status"
    });
  });

  it("upserts tenant listing state for an org member", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ id: userId }))
      .mockResolvedValueOnce(Response.json([{ role: "admin" }]))
      .mockResolvedValueOnce(
        Response.json([
          {
            status: "contacted",
            assignee_user_id: userId,
            last_seen_by_org_at: "2026-05-25T09:00:00.000Z",
            updated_at: "2026-05-25T09:01:00.000Z"
          }
        ])
      );

    const response = await handleRequest(
      authorizedRequest(`https://worker.test/api/orgs/${orgId}/listings/${canonicalListingId}/state`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "contacted",
          assigneeUserId: userId,
          lastSeenByOrgAt: "2026-05-25T09:00:00.000Z"
        })
      }),
      env(),
      { fetch: fetchMock }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        status: "contacted",
        assigneeUserId: userId,
        lastSeenByOrgAt: "2026-05-25T09:00:00.000Z",
        updatedAt: "2026-05-25T09:01:00.000Z"
      }
    });
    const writeUrl = new URL(String(fetchMock.mock.calls[2]?.[0]));
    expect(writeUrl.pathname).toBe("/rest/v1/tenant_listing_states");
    expect(writeUrl.searchParams.get("on_conflict")).toBe("org_id,canonical_listing_id");
    expect(fetchMock.mock.calls[2]?.[1]?.method).toBe("POST");
    expect(fetchMock.mock.calls[2]?.[1]?.headers).toMatchObject({
      prefer: "resolution=merge-duplicates,return=representation"
    });
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))).toEqual({
      org_id: orgId,
      canonical_listing_id: canonicalListingId,
      status: "contacted",
      assignee_user_id: userId,
      last_seen_by_org_at: "2026-05-25T09:00:00.000Z"
    });
  });

  it("creates notes with the authenticated user after ensuring tenant state exists", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ id: userId }))
      .mockResolvedValueOnce(Response.json([{ role: "agent" }]))
      .mockResolvedValueOnce(Response.json([{ status: "new" }]))
      .mockResolvedValueOnce(
        Response.json(
          [
            {
              id: "66666666-6666-4666-8666-666666666666",
              body: "Verificat link sursa.",
              author_user_id: userId,
              created_at: "2026-05-25T10:00:00.000Z"
            }
          ],
          { status: 201 }
        )
      );

    const response = await handleRequest(
      authorizedRequest(`https://worker.test/api/orgs/${orgId}/listings/${canonicalListingId}/notes`, {
        method: "POST",
        body: JSON.stringify({ body: "  Verificat link sursa.  " })
      }),
      env(),
      { fetch: fetchMock }
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      data: {
        id: "66666666-6666-4666-8666-666666666666",
        body: "Verificat link sursa.",
        authorUserId: userId,
        createdAt: "2026-05-25T10:00:00.000Z"
      }
    });
    expect(new URL(String(fetchMock.mock.calls[2]?.[0])).pathname).toBe("/rest/v1/tenant_listing_states");
    const noteWrite = fetchMock.mock.calls[3];
    expect(new URL(String(noteWrite?.[0])).pathname).toBe("/rest/v1/notes");
    expect(JSON.parse(String(noteWrite?.[1]?.body))).toEqual({
      org_id: orgId,
      canonical_listing_id: canonicalListingId,
      author_user_id: userId,
      body: "Verificat link sursa."
    });
  });

  it("rejects empty tenant notes", async () => {
    const response = await handleRequest(
      authorizedRequest(`https://worker.test/api/orgs/${orgId}/listings/${canonicalListingId}/notes`, {
        method: "POST",
        body: JSON.stringify({ body: "   " })
      }),
      env(),
      { fetch: vi.fn() }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "bad_request",
      message: "Note body is required"
    });
  });

  it("lists tenant alert deliveries for an org member", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ id: userId }))
      .mockResolvedValueOnce(Response.json([{ role: "agent" }]))
      .mockResolvedValueOnce(
        Response.json([
          {
            id: "77777777-7777-4777-8777-777777777777",
            alert_id: "88888888-8888-4888-8888-888888888888",
            canonical_listing_id: canonicalListingId,
            status: "pending",
            delivered_at: null,
            error_message: null,
            payload: { title: "Apartament 2 camere Titan" },
            created_at: "2026-05-25T11:00:00.000Z"
          }
        ])
      );

    const response = await handleRequest(authorizedRequest(`https://worker.test/api/orgs/${orgId}/alerts`), env(), {
      fetch: fetchMock
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [
        {
          id: "77777777-7777-4777-8777-777777777777",
          alertId: "88888888-8888-4888-8888-888888888888",
          canonicalListingId,
          status: "pending",
          deliveredAt: null,
          errorMessage: null,
          payload: { title: "Apartament 2 camere Titan" },
          createdAt: "2026-05-25T11:00:00.000Z"
        }
      ],
      count: 1
    });
  });

  it("lists saved searches with alert configuration for an org member", async () => {
    const savedSearchId = "99999999-9999-4999-8999-999999999999";
    const alertId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ id: userId }))
      .mockResolvedValueOnce(Response.json([{ role: "agent" }]))
      .mockResolvedValueOnce(
        Response.json([
          {
            id: savedSearchId,
            org_id: orgId,
            name: "Bucuresti apartamente",
            criteria: { city: "bucuresti", propertyType: "apartment" },
            created_at: "2026-05-25T10:00:00.000Z",
            updated_at: "2026-05-25T11:00:00.000Z"
          }
        ])
      )
      .mockResolvedValueOnce(
        Response.json([
          {
            id: alertId,
            saved_search_id: savedSearchId,
            channel: "in_app",
            frequency: "near_real_time",
            threshold_minutes: 5,
            is_enabled: true
          }
        ])
      );

    const response = await handleRequest(authorizedRequest(`https://worker.test/api/orgs/${orgId}/saved-searches`), env(), {
      fetch: fetchMock
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [
        {
          id: savedSearchId,
          orgId,
          name: "Bucuresti apartamente",
          criteria: { city: "bucuresti", propertyType: "apartment" },
          createdAt: "2026-05-25T10:00:00.000Z",
          updatedAt: "2026-05-25T11:00:00.000Z",
          alerts: [
            {
              id: alertId,
              channel: "in_app",
              frequency: "near_real_time",
              thresholdMinutes: 5,
              isEnabled: true
            }
          ]
        }
      ],
      count: 1
    });
  });

  it("creates saved searches with in-app alert configuration", async () => {
    const savedSearchId = "99999999-9999-4999-8999-999999999999";
    const alertId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ id: userId }))
      .mockResolvedValueOnce(Response.json([{ role: "admin" }]))
      .mockResolvedValueOnce(
        Response.json(
          [
            {
              id: savedSearchId,
              org_id: orgId,
              name: "Buc sub 120k",
              criteria: { city: "bucuresti", maxPriceEur: 120000 },
              created_at: "2026-05-25T10:00:00.000Z",
              updated_at: "2026-05-25T10:00:00.000Z"
            }
          ],
          { status: 201 }
        )
      )
      .mockResolvedValueOnce(
        Response.json(
          [
            {
              id: alertId,
              saved_search_id: savedSearchId,
              channel: "in_app",
              frequency: "near_real_time",
              threshold_minutes: 5,
              is_enabled: true
            }
          ],
          { status: 201 }
        )
      );

    const response = await handleRequest(
      authorizedRequest(`https://worker.test/api/orgs/${orgId}/saved-searches`, {
        method: "POST",
        body: JSON.stringify({
          name: " Buc  sub 120k ",
          criteria: { city: "bucuresti", maxPriceEur: 120000 },
          alert: { channel: "in_app", frequency: "near_real_time", thresholdMinutes: 5, isEnabled: true }
        })
      }),
      env(),
      { fetch: fetchMock }
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      data: {
        id: savedSearchId,
        orgId,
        name: "Buc sub 120k",
        criteria: { city: "bucuresti", maxPriceEur: 120000 },
        createdAt: "2026-05-25T10:00:00.000Z",
        updatedAt: "2026-05-25T10:00:00.000Z",
        alerts: [
          {
            id: alertId,
            channel: "in_app",
            frequency: "near_real_time",
            thresholdMinutes: 5,
            isEnabled: true
          }
        ]
      }
    });
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))).toEqual({
      org_id: orgId,
      owner_user_id: userId,
      name: "Buc sub 120k",
      criteria: { city: "bucuresti", maxPriceEur: 120000 }
    });
    expect(JSON.parse(String(fetchMock.mock.calls[3]?.[1]?.body))).toEqual({
      org_id: orgId,
      saved_search_id: savedSearchId,
      channel: "in_app",
      frequency: "near_real_time",
      threshold_minutes: 5,
      is_enabled: true,
      config: {}
    });
  });

  it("updates and deletes saved searches for an org member", async () => {
    const savedSearchId = "99999999-9999-4999-8999-999999999999";
    const updateFetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ id: userId }))
      .mockResolvedValueOnce(Response.json([{ role: "admin" }]))
      .mockResolvedValueOnce(
        Response.json([
          {
            id: savedSearchId,
            org_id: orgId,
            name: "Bucuresti actualizat",
            criteria: { city: "bucuresti", maxPriceEur: 130000 },
            created_at: "2026-05-25T10:00:00.000Z",
            updated_at: "2026-05-25T12:00:00.000Z"
          }
        ])
      )
      .mockResolvedValueOnce(Response.json([]));

    const updateResponse = await handleRequest(
      authorizedRequest(`https://worker.test/api/orgs/${orgId}/saved-searches/${savedSearchId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: "Bucuresti actualizat",
          criteria: { city: "bucuresti", maxPriceEur: 130000 }
        })
      }),
      env(),
      { fetch: updateFetchMock }
    );

    expect(updateResponse.status).toBe(200);
    await expect(updateResponse.json()).resolves.toMatchObject({
      data: {
        id: savedSearchId,
        name: "Bucuresti actualizat",
        criteria: { city: "bucuresti", maxPriceEur: 130000 }
      }
    });
    expect(updateFetchMock.mock.calls[2]?.[1]?.method).toBe("PATCH");

    const deleteFetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ id: userId }))
      .mockResolvedValueOnce(Response.json([{ role: "admin" }]))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const deleteResponse = await handleRequest(
      authorizedRequest(`https://worker.test/api/orgs/${orgId}/saved-searches/${savedSearchId}`, { method: "DELETE" }),
      env(),
      { fetch: deleteFetchMock }
    );

    expect(deleteResponse.status).toBe(200);
    await expect(deleteResponse.json()).resolves.toEqual({
      data: {
        id: savedSearchId,
        deleted: true
      }
    });
    expect(deleteFetchMock.mock.calls[2]?.[1]?.method).toBe("DELETE");
  });
});

function env(): Env {
  return {
    ENVIRONMENT: "test",
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-secret",
    ADMIN_API_KEY: "admin"
  };
}

function authorizedRequest(url: string, init: RequestInit = {}): Request {
  const headers = new Headers(init.headers);
  headers.set("authorization", "Bearer user-jwt");
  headers.set("content-type", "application/json");

  return new Request(url, {
    ...init,
    headers
  });
}
