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

  it("renders Thor Market Radar as the primary web surface", async () => {
    render(<App />);

    expect(await screen.findByText(/THOR CRM/i)).toBeInTheDocument();
    expect(screen.getByTestId("market-radar-shell")).toBeInTheDocument();
    expect(screen.getByTestId("market-radar-map")).toBeInTheDocument();
    expect(screen.getByTestId("selected-listing-drawer")).toBeInTheDocument();
    expect(screen.getByTestId("commercial-readiness")).toBeInTheDocument();
    expect(screen.getByLabelText(/Cauta anunturi, zone, surse/i)).toBeInTheDocument();
    expect(screen.getByTestId("supabase-auth")).toBeInTheDocument();
    expect(screen.getByTestId("saved-searches")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Creeaza workspace pilot/i })).toBeInTheDocument();
  });

  it("shows demo-safe index plus link source URLs in the selected drawer", async () => {
    render(<App />);

    const drawer = await screen.findByTestId("selected-listing-drawer");
    expect(within(drawer).getAllByText("Apartament 2 camere Titan").length).toBeGreaterThan(0);
    expect(within(drawer).getByRole("link", { name: /Open source · imobiliare.ro/i })).toHaveAttribute(
      "href",
      "https://example.test/imobiliare/titan-2-camere"
    );
    expect(within(drawer).getByText(/Index \+ link/i)).toBeInTheDocument();
    expect(within(drawer).queryByText(/Text scurt pentru index/i)).not.toBeInTheDocument();
  });

  it("filters hot opportunities through command search", async () => {
    render(<App />);

    fireEvent.change(await screen.findByLabelText(/Cauta anunturi, zone, surse/i), {
      target: { value: "herastrau" }
    });

    const opportunities = screen.getByTestId("hot-opportunities");
    expect(await within(opportunities).findByRole("button", { name: "Studio premium Herastrau" })).toBeInTheDocument();
    expect(within(opportunities).queryByRole("button", { name: "Apartament 2 camere Titan" })).not.toBeInTheDocument();
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

    const opportunities = screen.getByTestId("hot-opportunities");
    expect(await within(opportunities).findByRole("button", { name: "Listing live din Worker" })).toBeInTheDocument();

    const drawer = screen.getByTestId("selected-listing-drawer");
    expect(await within(drawer).findByText(/Workflow live/i)).toBeInTheDocument();
    expect(within(drawer).getByText(/Assignee: Mara/i)).toBeInTheDocument();
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

    fireEvent.click(await screen.findByRole("button", { name: "Contacted" }));

    const drawer = screen.getByTestId("selected-listing-drawer");
    expect(await within(drawer).findByText(/Salvat local/i)).toBeInTheDocument();
    expect(within(drawer).getByText(/Status/i)).toBeInTheDocument();
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

    const opportunities = screen.getByTestId("hot-opportunities");
    expect(await within(opportunities).findByRole("button", { name: "Listing live din Worker" })).toBeInTheDocument();
    expect(screen.getByText(/Live API: listinguri incarcate din Worker/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(within(opportunities).queryByRole("button", { name: "Apartament 2 camere Titan" })).not.toBeInTheDocument()
    );
  });

  it("creates, edits, and deletes saved searches from the selected drawer", async () => {
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

    const map = screen.getByTestId("market-radar-map");
    expect(await within(map).findByText("Portal Live Health")).toBeInTheDocument();
    expect(within(map).getByText("80%")).toBeInTheDocument();
    expect(within(map).getByText(/75% coverage/i)).toBeInTheDocument();
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
