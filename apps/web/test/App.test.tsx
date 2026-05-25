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

  it("renders the primary web dashboard sections", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /Thor CRM Index \+ Link/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Search$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Listing Detail/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Tenant Workflow/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Saved Searches/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Alerts/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Source Health/i })).toBeInTheDocument();
  });

  it("shows demo-safe index plus link source URLs", () => {
    render(<App />);

    const detail = screen.getByTestId("listing-detail");
    expect(within(detail).getByText("Apartament 2 camere Titan")).toBeInTheDocument();
    expect(within(detail).getByRole("link", { name: /imobiliare.ro/i })).toHaveAttribute(
      "href",
      "https://example.test/imobiliare/titan-2-camere"
    );
    expect(within(detail).getByText(/Nu re-hostam descrieri integrale/i)).toBeInTheDocument();
  });

  it("renders demo tenant workflow without re-hosting portal content", () => {
    render(<App />);

    const workflow = screen.getByTestId("tenant-workflow");
    expect(within(workflow).getAllByText(/Workflow demo/i).length).toBeGreaterThan(0);
    expect(within(workflow).getByText(demoOrgId)).toBeInTheDocument();
    expect(within(workflow).getByText(/Pastreaza statusuri per tenant/i)).toBeInTheDocument();
    expect(within(workflow).getByText("Apartament 2 camere Titan")).toBeInTheDocument();
    expect(within(workflow).getByRole("link", { name: /imobiliare.ro/i })).toHaveAttribute(
      "href",
      "https://example.test/imobiliare/titan-2-camere"
    );
    expect(within(workflow).queryByText(/Text scurt pentru index/i)).not.toBeInTheDocument();
  });

  it("loads tenant workflow from a backend endpoint when available", async () => {
    vi.stubEnv("VITE_WORKER_API_URL", "https://worker.example.dev");
    window.sessionStorage.setItem(tenantWorkflowAccessTokenStorageKey, "user-token");
    const apiListing = {
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
      url: null,
      sourceLinks: [{ sourceId: "demo", url: "https://example.test/listings/api-listing-1" }],
      searchText: "listing live worker",
      observedAt: "2026-05-25T00:00:00.000Z",
      lastSeenAt: "2026-05-25T00:00:00.000Z"
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url === "https://worker.example.dev/api/listings") {
        return new Response(JSON.stringify({ data: [apiListing], count: 1 }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }

      if (
        url ===
        `https://worker.example.dev/api/orgs/${demoOrgId}/listings/33333333-3333-4333-8333-333333333333/workflow`
      ) {
        return new Response(
          JSON.stringify({
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
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" }
          }
        );
      }

      return new Response("not found", { status: 404 });
    });

    render(<App />);

    const workflow = screen.getByTestId("tenant-workflow");
    expect(await within(workflow).findByText("Listing live din Worker")).toBeInTheDocument();
    expect(within(workflow).getByText(/Status: Contactat/i)).toBeInTheDocument();
    expect(within(workflow).getAllByText(/Workflow live/i).length).toBeGreaterThan(0);
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
    const apiListing = {
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
      url: null,
      sourceLinks: [{ sourceId: "demo", url: "https://example.test/listings/api-listing-1" }],
      searchText: "listing live worker",
      observedAt: "2026-05-25T00:00:00.000Z",
      lastSeenAt: "2026-05-25T00:00:00.000Z"
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url === "https://project.supabase.co/auth/v1/token?grant_type=password") {
        const headers = new Headers(init?.headers);
        expect(headers.get("apikey")).toBe("anon-key");
        expect(headers.get("authorization")).toBeNull();
        return new Response(
          JSON.stringify({
            access_token: "user-token",
            user: { email: "agent@thor.test" }
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" }
          }
        );
      }

      if (url === "https://worker.example.dev/api/listings") {
        return new Response(JSON.stringify({ data: [apiListing], count: 1 }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }

      if (
        url ===
        `https://worker.example.dev/api/orgs/${demoOrgId}/listings/33333333-3333-4333-8333-333333333333/workflow`
      ) {
        return new Response(
          JSON.stringify({
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
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" }
          }
        );
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
    const workflow = screen.getByTestId("tenant-workflow");
    expect((await within(workflow).findAllByText(/Workflow live/i)).length).toBeGreaterThan(0);
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
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("unavailable", { status: 404 }));

    render(<App />);

    const workflow = screen.getByTestId("tenant-workflow");
    fireEvent.click(within(workflow).getByRole("button", { name: /Marcheaza contactat pentru Apartament 2 camere Titan/i }));

    expect(await within(workflow).findByText(/Salvat local/i)).toBeInTheDocument();
    const titanWorkflowCard = within(workflow).getByRole("article", { name: /Apartament 2 camere Titan/i });
    expect(within(titanWorkflowCard).getByText(/Status: Contactat/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        `https://worker.example.dev/api/orgs/${demoOrgId}/listings/cl-apt-titan/state`,
        expect.objectContaining({ method: "PATCH" })
      )
    );
  });

  it("uses demo fallback listings when the Worker API is unavailable", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("unavailable", { status: 502 }));

    render(<App />);

    expect(await screen.findAllByText(/Fallback demo/i)).toHaveLength(2);
    expect(screen.getAllByText("Apartament 2 camere Titan")).toHaveLength(3);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
  });

  it("renders live API listings when the Worker API returns data", async () => {
    vi.stubEnv("VITE_WORKER_API_URL", "https://worker.example.dev");
    const apiListing = {
      id: "api-listing-1",
      recordType: "source_listing",
      sourceId: "demo",
      sourceListingKey: "api-listing-1",
      sourceListingId: "api-listing-1",
      canonicalListingId: null,
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
      searchText: "listing live worker",
      observedAt: "2026-05-25T00:00:00.000Z",
      lastSeenAt: "2026-05-25T00:00:00.000Z"
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: [apiListing], count: 1 }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    render(<App />);

    expect(await screen.findAllByText("Listing live din Worker")).toHaveLength(2);
    expect(screen.getAllByText(/Live API/i)).toHaveLength(2);
    await waitFor(() => expect(screen.queryByText("Apartament 2 camere Titan")).not.toBeInTheDocument());
  });
});
