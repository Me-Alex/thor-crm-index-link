import { render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";

describe("App", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("renders the primary web dashboard sections", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /Thor CRM Index \+ Link/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Search$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Listing Detail/i })).toBeInTheDocument();
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

  it("uses demo fallback listings when the Worker API is unavailable", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("unavailable", { status: 502 }));

    render(<App />);

    expect(await screen.findAllByText(/Fallback demo/i)).toHaveLength(2);
    expect(screen.getAllByText("Apartament 2 camere Titan")).toHaveLength(2);
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
    expect(screen.queryByText("Apartament 2 camere Titan")).not.toBeInTheDocument();
  });
});
