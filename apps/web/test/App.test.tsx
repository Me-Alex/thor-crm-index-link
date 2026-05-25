import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";
import { demoOrgId, tenantWorkflowAccessTokenStorageKey } from "../src/lib/tenantWorkflowApi";

describe("App", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    window.sessionStorage.clear();
  });

  it("renders the P1B spatial deal canvas as the primary web surface", async () => {
    render(<App />);

    expect(await screen.findByText(/Thor Spatial/i)).toBeInTheDocument();
    expect(screen.getByTestId("spatial-canvas")).toBeInTheDocument();
    expect(screen.getByTestId("node-inspector")).toBeInTheDocument();
    expect(screen.getByLabelText(/Command search/i)).toBeInTheDocument();
    expect(screen.getByTestId("supabase-auth")).toBeInTheDocument();
    expect(screen.getByTestId("saved-searches")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^Search$/i })).not.toBeInTheDocument();
  });

  it("shows demo-safe index plus link source URLs in the spatial inspector", async () => {
    render(<App />);

    const inspector = await screen.findByTestId("node-inspector");
    expect(within(inspector).getByText("Apartament 2 camere Titan")).toBeInTheDocument();
    expect(within(inspector).getByRole("link", { name: /Open source · imobiliare.ro/i })).toHaveAttribute(
      "href",
      "https://example.test/imobiliare/titan-2-camere"
    );
    expect(within(inspector).getAllByText(/Index \+ link/i).length).toBeGreaterThan(0);
    expect(within(inspector).queryByText(/Text scurt pentru index/i)).not.toBeInTheDocument();
  });

  it("filters listing nodes through command search", async () => {
    render(<App />);

    fireEvent.change(await screen.findByLabelText(/Command search/i), {
      target: { value: "herastrau" }
    });

    const canvas = screen.getByTestId("spatial-canvas");
    expect(within(canvas).getByRole("button", { name: "Studio premium Herastrau" })).toBeInTheDocument();
    expect(within(canvas).queryByRole("button", { name: "Apartament 2 camere Titan" })).not.toBeInTheDocument();
  });

  it("loads tenant workflow from a backend endpoint when available", async () => {
    vi.stubEnv("VITE_WORKER_API_URL", "https://worker.example.dev");
    window.sessionStorage.setItem(tenantWorkflowAccessTokenStorageKey, "user-token");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url === "https://worker.example.dev/api/listings") {
        return jsonResponse({ data: [buildApiListing()], count: 1 });
      }

      if (
        url ===
        `https://worker.example.dev/api/orgs/${demoOrgId}/listings/33333333-3333-4333-8333-333333333333/workflow`
      ) {
        return jsonResponse({
          data: {
            state: {
              status: "contacted",
              assigneeUserId: "Mara",
              lastSeenByOrgAt: "2026-05-25T09:00:00.000Z",
              updatedAt: "2026-05-25T10:00:00.000Z"
            },
            tags: [],
            notes: []
          }
        });
      }

      return new Response("not found", { status: 404 });
    });

    render(<App />);

    const canvas = screen.getByTestId("spatial-canvas");
    expect(await within(canvas).findByRole("button", { name: "Listing live din Worker" })).toBeInTheDocument();
    fireEvent.click(within(canvas).getByRole("button", { name: /Tenant workflow/i }));

    const inspector = screen.getByTestId("node-inspector");
    expect(await within(inspector).findByText(/Workflow live/i)).toBeInTheDocument();
    expect(within(inspector).getAllByText(/Assignee: Mara/i).length).toBeGreaterThan(0);
    expect(fetchSpy).toHaveBeenCalledWith(
      `https://worker.example.dev/api/orgs/${demoOrgId}/listings/33333333-3333-4333-8333-333333333333/workflow`,
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer user-token"
        })
      })
    );
  });

  it("logs in with Supabase Auth and uses the user token for tenant workflow", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
    vi.stubEnv("VITE_WORKER_API_URL", "https://worker.example.dev");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url === "https://project.supabase.co/auth/v1/token?grant_type=password") {
        const headers = new Headers(init?.headers);
        expect(headers.get("apikey")).toBe("anon-key");
        expect(headers.get("authorization")).toBeNull();
        return jsonResponse({
          access_token: "user-token",
          user: { email: "agent@thor.test" }
        });
      }

      if (url === "https://worker.example.dev/api/listings") {
        return jsonResponse({ data: [buildApiListing()], count: 1 });
      }

      if (
        url ===
        `https://worker.example.dev/api/orgs/${demoOrgId}/listings/33333333-3333-4333-8333-333333333333/workflow`
      ) {
        return jsonResponse({
          data: {
            state: {
              status: "contacted",
              assigneeUserId: "Mara",
              lastSeenByOrgAt: "2026-05-25T09:00:00.000Z",
              updatedAt: "2026-05-25T10:00:00.000Z"
            },
            tags: [],
            notes: []
          }
        });
      }

      return new Response("not found", { status: 404 });
    });

    render(<App />);

    fireEvent.change(screen.getByLabelText(/Email Supabase/i), {
      target: { value: "agent@thor.test" }
    });
    fireEvent.change(screen.getByLabelText(/Parola Supabase/i), {
      target: { value: "password" }
    });
    fireEvent.click(screen.getByRole("button", { name: /Login Supabase/i }));

    expect(await screen.findByText(/Autentificat ca agent@thor.test/i)).toBeInTheDocument();
    expect(window.sessionStorage.getItem(tenantWorkflowAccessTokenStorageKey)).toBe("user-token");
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        `https://worker.example.dev/api/orgs/${demoOrgId}/listings/33333333-3333-4333-8333-333333333333/workflow`,
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: "Bearer user-token"
          })
        })
      )
    );
  });

  it("keeps demo workflow usable when backend writes are unavailable", async () => {
    vi.stubEnv("VITE_WORKER_API_URL", "https://worker.example.dev");
    window.sessionStorage.setItem(tenantWorkflowAccessTokenStorageKey, "user-token");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url === "https://worker.example.dev/api/listings") {
        return new Response("unavailable", { status: 404 });
      }

      if (url === "https://worker.example.dev/api/orgs/11111111-1111-4111-8111-111111111111/listings/cl-apt-titan/state") {
        expect(init?.method).toBe("PATCH");
        return new Response("unavailable", { status: 404 });
      }

      return new Response("unavailable", { status: 404 });
    });

    render(<App />);

    const canvas = screen.getByTestId("spatial-canvas");
    fireEvent.click(await within(canvas).findByRole("button", { name: /Tenant workflow/i }));
    fireEvent.click(screen.getByRole("button", { name: "Contacted" }));

    const inspector = screen.getByTestId("node-inspector");
    expect(await within(inspector).findByText(/Salvat local/i)).toBeInTheDocument();
    expect(within(inspector).getByText(/Status/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        `https://worker.example.dev/api/orgs/${demoOrgId}/listings/cl-apt-titan/state`,
        expect.objectContaining({ method: "PATCH" })
      )
    );
  });

  it("renders live API listings when the Worker API returns data", async () => {
    vi.stubEnv("VITE_WORKER_API_URL", "https://worker.example.dev");
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url === "https://worker.example.dev/api/listings") {
        return jsonResponse({ data: [buildApiListing({ id: "api-listing-1" })], count: 1 });
      }

      return new Response("unavailable", { status: 404 });
    });

    render(<App />);

    const canvas = screen.getByTestId("spatial-canvas");
    expect(await within(canvas).findByRole("button", { name: "Listing live din Worker" })).toBeInTheDocument();
    expect(screen.getByText(/Live API: listinguri incarcate din Worker/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(within(canvas).queryByRole("button", { name: "Apartament 2 camere Titan" })).not.toBeInTheDocument()
    );
  });

  it("creates, edits, and deletes saved searches from the spatial utility panel", async () => {
    render(<App />);
    const savedPanel = screen.getByTestId("saved-searches");

    fireEvent.change(within(savedPanel).getByLabelText(/Nume cautare/i), {
      target: { value: "Garsoniere Brasov" }
    });
    fireEvent.change(within(savedPanel).getByLabelText(/Criterii cautare/i), {
      target: { value: "rent apartment Brasov max 450 EUR" }
    });
    fireEvent.click(within(savedPanel).getByRole("button", { name: /Salveaza cautare/i }));

    expect(within(savedPanel).getByText("Garsoniere Brasov")).toBeInTheDocument();

    fireEvent.click(within(savedPanel).getByRole("button", { name: /Editeaza Garsoniere Brasov/i }));
    fireEvent.change(within(savedPanel).getByLabelText(/Nume cautare/i), {
      target: { value: "Garsoniere Brasov actualizat" }
    });
    fireEvent.click(within(savedPanel).getByRole("button", { name: /Actualizeaza cautare/i }));

    expect(within(savedPanel).getByText("Garsoniere Brasov actualizat")).toBeInTheDocument();

    fireEvent.click(within(savedPanel).getByRole("button", { name: /Sterge Garsoniere Brasov actualizat/i }));

    expect(within(savedPanel).queryByText("Garsoniere Brasov actualizat")).not.toBeInTheDocument();
    expect(within(savedPanel).getByText(/Cautare stearsa/i)).toBeInTheDocument();
  });

  it("renders live source health metrics when the Worker API returns operational data", async () => {
    vi.stubEnv("VITE_WORKER_API_URL", "https://worker.example.dev");
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url === "https://worker.example.dev/api/source-health") {
        return jsonResponse({
          data: [
            {
              id: "portal-live",
              name: "Portal Live Health",
              mode: "on",
              listingCount: 42,
              latestSeenAt: "2026-05-25T11:25:50.000Z",
              crawlSuccessRate: 1,
              parseSuccessRate: 0.8,
              fieldCoverageRate: 0.75,
              matchRate: 0,
              timeToIndexMinutes: 3
            }
          ],
          count: 1
        });
      }

      return new Response("unavailable", { status: 404 });
    });

    render(<App />);

    expect(await screen.findByText("Portal Live Health")).toBeInTheDocument();
    fireEvent.click(within(screen.getByTestId("spatial-canvas")).getByRole("button", { name: "Source health" }));
    const inspector = screen.getByTestId("node-inspector");
    expect(within(inspector).getByText(/Per-source health/i)).toBeInTheDocument();
    expect(within(inspector).getByText(/Mode: on/i)).toBeInTheDocument();
    expect(within(inspector).getByText(/Listings: 42/i)).toBeInTheDocument();
    expect(within(inspector).getByText(/Latest seen: 2026-05-25T11:25:50.000Z/i)).toBeInTheDocument();
    expect(within(inspector).getByText(/Time-to-index: 3 min/i)).toBeInTheDocument();
    expect(within(inspector).getByText(/Coverage: 75%/i)).toBeInTheDocument();
    expect(within(inspector).getByText("80%")).toBeInTheDocument();
  });
});

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

function buildApiListing(overrides: Record<string, unknown> = {}) {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    recordType: "canonical_listing",
    sourceId: "demo",
    sourceListingKey: "api-listing-1",
    sourceListingId: "api-listing-1",
    canonicalListingId: "33333333-3333-4333-8333-333333333333",
    title: "Listing live din Worker",
    descriptionExcerpt: "Text scurt pentru index + link.",
    priceEur: 101000,
    areaSqm: 54,
    rooms: 2,
    floor: 4,
    propertyType: "apartment",
    transactionType: "sale",
    city: "bucuresti",
    district: "sector 3",
    neighborhood: "titan",
    url: "https://example.test/listings/api-listing-1",
    sourceLinks: [{ sourceId: "demo", url: "https://example.test/listings/api-listing-1" }],
    observedAt: "2026-05-25T00:00:00.000Z",
    lastSeenAt: "2026-05-25T00:00:00.000Z",
    ...overrides
  };
}
