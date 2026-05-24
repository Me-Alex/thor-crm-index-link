import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../src/App";

describe("App", () => {
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
});
