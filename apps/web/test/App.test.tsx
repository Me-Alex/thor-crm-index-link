import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";
import { activeWorkspaceStorageKey } from "../src/lib/activeWorkspace";
import { demoOrgId, tenantWorkflowAccessTokenStorageKey } from "../src/lib/tenantWorkflowApi";

async function openRadarPage(name: string) {
  fireEvent.click(await screen.findByRole("button", { name }));
}

describe("App", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it("renders Thor market monitor as the primary web surface", async () => {
    render(<App />);

    expect(await screen.findByText(/THOR CRM/i)).toBeInTheDocument();
    expect(screen.getByTestId("market-radar-shell")).toBeInTheDocument();
    expect(screen.getByTestId("market-radar-map")).toBeInTheDocument();
    expect(screen.getByLabelText(/Cauta anunturi, zone, surse/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cont agentie/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anunturi" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Setari" })).toBeInTheDocument();
  });

  it("shows demo-safe index plus link source URLs in the selected drawer", async () => {
    render(<App />);
    await openRadarPage("Anunturi");

    const drawer = await screen.findByTestId("selected-listing-drawer");
    expect(within(drawer).getAllByText("Apartament 2 camere Titan").length).toBeGreaterThan(0);
    expect(within(drawer).getByRole("link", { name: /Open source · imobiliare.ro/i })).toHaveAttribute(
      "href",
      "https://example.test/imobiliare/titan-2-camere"
    );
    expect(within(drawer).getByText(/Index \+ link/i)).toBeInTheDocument();
    expect(within(drawer).queryByText(/Text scurt pentru index/i)).not.toBeInTheDocument();
  });

  it("uses the styled listing dropdown instead of the native select menu", async () => {
    render(<App />);
    await openRadarPage("Anunturi");

    const drawer = await screen.findByTestId("selected-listing-drawer");
    const switcher = drawer.querySelector(".drawer-listing-switcher");

    expect(switcher?.querySelector("select")).toBeNull();

    fireEvent.click(within(drawer).getByRole("button", { name: /Selecteaza anunt.*Apartament 2 camere Titan/i }));

    expect(within(drawer).getByRole("listbox", { name: /Selecteaza anunt/i })).toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole("option", { name: /Studio premium Herastrau/i }));

    expect(within(drawer).getByRole("button", { name: /Selecteaza anunt.*Studio premium Herastrau/i })).toBeInTheDocument();
  });

  it("uses styled dropdowns for saved search alert controls", async () => {
    render(<App />);
    await openRadarPage("Cautari salvate");

    const savedPanel = await screen.findByTestId("saved-searches");

    expect(savedPanel.querySelector("select")).toBeNull();

    fireEvent.click(within(savedPanel).getByRole("button", { name: /Frecventa alerta.*near real-time/i }));
    expect(within(savedPanel).getByRole("listbox", { name: /Frecventa alerta/i })).toBeInTheDocument();
    fireEvent.click(within(savedPanel).getByRole("option", { name: "hourly" }));
    expect(within(savedPanel).getByRole("button", { name: /Frecventa alerta.*hourly/i })).toBeInTheDocument();

    fireEvent.click(within(savedPanel).getByRole("button", { name: /Canal alerta.*in-app/i }));
    expect(within(savedPanel).getByRole("listbox", { name: /Canal alerta/i })).toBeInTheDocument();
    fireEvent.click(within(savedPanel).getByRole("option", { name: "webhook" }));
    expect(within(savedPanel).getByRole("button", { name: /Canal alerta.*webhook/i })).toBeInTheDocument();
  });

  it("makes the command bar advanced filter button apply and reset filters", async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /Filtre avansate/i }));
    const advancedPanel = await screen.findByTestId("advanced-filter-panel");

    fireEvent.click(within(advancedPanel).getByRole("button", { name: /Sub 120k EUR/i }));
    expect(screen.getByPlaceholderText("Max")).toHaveValue("120000");

    fireEvent.click(within(advancedPanel).getByRole("button", { name: /Doar apartamente/i }));
    expect(screen.getByRole("button", { name: /Tip proprietate.*Apartament/i })).toBeInTheDocument();

    fireEvent.click(within(advancedPanel).getByRole("button", { name: /Reseteaza filtre/i }));
    expect(screen.getByPlaceholderText("Max")).toHaveValue("");
    expect(screen.getByRole("button", { name: /Tip proprietate.*Toate tipurile/i })).toBeInTheDocument();
  });

  it("makes sidebar navigation buttons update the active section", async () => {
    render(<App />);

    const monitorButton = await screen.findByRole("button", { name: "Monitor" });
    expect(monitorButton).toHaveAttribute("aria-current", "page");

    fireEvent.click(screen.getByRole("button", { name: "Cautari salvate" }));
    expect(screen.getByRole("button", { name: "Cautari salvate" })).toHaveAttribute("aria-current", "page");
    expect(monitorButton).not.toHaveAttribute("aria-current", "page");
  });

  it("makes map mode and drawer action buttons change visible state", async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /Variatie pret/i }));
    expect(screen.getByRole("button", { name: /Surse active/i })).toBeInTheDocument();
    expect(screen.getByText(/Acoperire surse/i)).toBeInTheDocument();

    await openRadarPage("Anunturi");
    const drawer = screen.getByTestId("selected-listing-drawer");
    fireEvent.click(within(drawer).getByRole("button", { name: /Istoric/i }));
    expect(within(drawer).getByText(/Istoric pret/i)).toBeInTheDocument();

    fireEvent.click(within(drawer).getByRole("button", { name: /View all/i }));
    expect(within(drawer).getByTestId("drawer-listing-list")).toBeInTheDocument();
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
    fireEvent.click(within(opportunities).getByRole("button", { name: "Listing live din Worker" }));

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

    fireEvent.click(await screen.findByRole("button", { name: /Cont agentie/i }));

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

  it("switches the active workspace and tenant API scope after onboarding", async () => {
    vi.stubEnv("VITE_WORKER_API_URL", "https://worker.example.dev");
    window.sessionStorage.setItem(tenantWorkflowAccessTokenStorageKey, "user-token");
    const onboardedOrgId = "22222222-2222-4222-8222-222222222222";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url === "https://worker.example.dev/api/listings") {
        return jsonResponse({ data: [buildApiListing()], count: 1 });
      }

      if (url === "https://worker.example.dev/api/source-health") {
        return jsonResponse({ data: [], count: 0 });
      }

      if (url === "https://worker.example.dev/api/billing/plans") {
        return jsonResponse({ data: [] });
      }

      if (url === "https://worker.example.dev/api/commercial-readiness") {
        return jsonResponse({ data: { gates: [] } });
      }

      if (url === "https://worker.example.dev/api/onboarding/workspace") {
        expect(init?.method).toBe("POST");
        expect(new Headers(init?.headers).get("authorization")).toBe("Bearer user-token");
        expect(JSON.parse(String(init?.body))).toMatchObject({
          billingEmail: "billing@agentie.ro",
          name: "Agentia Nord",
          slug: "agentia-nord"
        });
        return jsonResponse({ data: { org: { id: onboardedOrgId, slug: "agentia-nord" } } });
      }

      if (url.endsWith("/saved-searches")) {
        return jsonResponse({ data: [], count: 0 });
      }

      if (url.endsWith("/workflow")) {
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
    await openRadarPage("Setari");

    const commercialPanel = await screen.findByTestId("commercial-readiness");
    fireEvent.change(within(commercialPanel).getByLabelText(/Agentie/i), {
      target: { value: "Agentia Nord" }
    });
    fireEvent.change(within(commercialPanel).getByLabelText(/Slug/i), {
      target: { value: "agentia-nord" }
    });
    fireEvent.change(within(commercialPanel).getByLabelText(/Email facturare/i), {
      target: { value: "billing@agentie.ro" }
    });
    fireEvent.click(within(commercialPanel).getByRole("button", { name: /Creeaza workspace pilot/i }));

    expect(await within(commercialPanel).findByText(/Workspace pilot creat: agentia-nord/i)).toBeInTheDocument();
    await openRadarPage("Monitor");
    expect(await screen.findByLabelText(/Agentia curenta: Agentia Nord/i)).toBeInTheDocument();
    expect(screen.getByTestId("active-workspace-name")).toHaveTextContent("Agentia Nord");
    expect(JSON.parse(window.localStorage.getItem(activeWorkspaceStorageKey) ?? "{}")).toMatchObject({
      name: "Agentia Nord",
      orgId: onboardedOrgId,
      slug: "agentia-nord"
    });

    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        `https://worker.example.dev/api/orgs/${onboardedOrgId}/listings/33333333-3333-4333-8333-333333333333/workflow`,
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: "Bearer user-token"
          })
        })
      )
    );
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        `https://worker.example.dev/api/orgs/${onboardedOrgId}/saved-searches`,
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

    await openRadarPage("Anunturi");
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

  it("fails closed in production instead of showing demo fallback data", async () => {
    vi.stubEnv("VITE_THOR_RUNTIME", "production");
    vi.stubEnv("VITE_ALLOW_DEMO_FALLBACK", "false");
    vi.stubEnv("VITE_WORKER_API_URL", "https://worker.example.dev");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("unavailable", { status: 503 }));

    render(<App />);

    expect(await screen.findByText(/Prod blocked/i)).toBeInTheDocument();
    expect(await screen.findByText(/Production blocked: Worker API returned 503/i)).toBeInTheDocument();
    expect(screen.getByTestId("active-workspace-name")).toHaveTextContent("Workspace neconfigurat");
    expect(screen.queryByText("Agentia Demo")).not.toBeInTheDocument();

    const opportunities = screen.getByTestId("hot-opportunities");
    expect(within(opportunities).queryByRole("button", { name: "Apartament 2 camere Titan" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Pret modificat: Apartament 2 camere Titan/i)).not.toBeInTheDocument();

    await openRadarPage("Cautari salvate");
    const savedPanel = screen.getByTestId("saved-searches");
    expect(within(savedPanel).getByText(/Production mode: saved searches cer Worker API si login Supabase/i)).toBeInTheDocument();
    fireEvent.change(within(savedPanel).getByLabelText(/Nume cautare/i), {
      target: { value: "Garsoniere Brasov" }
    });
    fireEvent.change(within(savedPanel).getByLabelText(/Criterii cautare/i), {
      target: { value: "rent apartment Brasov max 450 EUR" }
    });
    fireEvent.click(within(savedPanel).getByRole("button", { name: /Salveaza cautare/i }));

    expect(await within(savedPanel).findByText(/Production blocked: saved searches cer Worker API si login Supabase/i)).toBeInTheDocument();
    expect(within(savedPanel).queryByText("Garsoniere Brasov")).not.toBeInTheDocument();
  });

  it("creates, edits, and deletes saved searches from the selected drawer", async () => {
    render(<App />);
    await openRadarPage("Cautari salvate");
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

  it("surfaces actionable source operations from health metrics", async () => {
    render(<App />);
    await openRadarPage("Surse");

    const sourceHealthPage = await screen.findByTestId("source-health-page");

    expect(within(sourceHealthPage).getByText("Actiuni recomandate")).toBeInTheDocument();
    expect(within(sourceHealthPage).getByText("Revizuieste olx.ro")).toBeInTheDocument();
    expect(within(sourceHealthPage).getByText("Optimizeaza freshness pentru olx.ro")).toBeInTheDocument();
  });

  it("pans and resets the market map with drag controls", async () => {
    render(<App />);

    const map = await screen.findByTestId("market-radar-map");
    const mapSurface = map.querySelector(".market-map-surface");

    expect(mapSurface).toBeInstanceOf(HTMLElement);
    expect(within(map).getByText(/Pan 0 \/ 0/i)).toBeInTheDocument();

    fireEvent.mouseDown(mapSurface as HTMLElement, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.mouseMove(mapSurface as HTMLElement, { buttons: 1, clientX: 150, clientY: 130 });
    fireEvent.mouseUp(mapSurface as HTMLElement, { clientX: 150, clientY: 130 });

    expect(within(map).getByText(/Pan 50 \/ 30/i)).toBeInTheDocument();

    fireEvent.click(within(map).getByRole("button", { name: /Reset map position/i }));

    expect(within(map).getByText(/Pan 0 \/ 0/i)).toBeInTheDocument();
  });

  it("generates heatmap spots automatically from market clusters", async () => {
    render(<App />);

    const map = await screen.findByTestId("market-radar-map");
    const heatmap = within(map).getByTestId("dynamic-heatmap");
    const spots = heatmap.querySelectorAll(".map-heatmap-spot");
    const titanSpot = heatmap.querySelector('[data-heat-cluster="titan"]');

    expect(spots.length).toBeGreaterThan(0);
    expect(titanSpot).toHaveAttribute("data-heat-count", "81");
    expect(titanSpot).toHaveAttribute("data-heat-delta", "12");
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
