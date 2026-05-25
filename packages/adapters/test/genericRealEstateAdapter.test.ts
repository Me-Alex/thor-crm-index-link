import { describe, expect, it } from "vitest";
import { getAdapter } from "../src";

describe("generic real-estate portal adapter", () => {
  it("discovers same-origin listing detail URLs that match the source policy", () => {
    const adapter = getAdapter("imobiliare");
    const html = `
<a href="/vanzare-apartamente/bucuresti/titan/apartament-de-vanzare-2-camere-XA123">valid</a>
<a href="https://www.imobiliare.ro/inchirieri-apartamente/bucuresti/garsoniera-XB456">valid rent</a>
<a href="https://other.example/listing">external</a>
<a href="/blog/piata-imobiliara">not listing</a>`;

    expect(
      adapter.parseListingUrls(html, {
        sourceId: "imobiliare",
        url: "https://www.imobiliare.ro/vanzare-apartamente/bucuresti",
        observedAt: "2026-05-25T00:00:00.000Z"
      })
    ).toEqual({
      ok: true,
      urls: [
        "https://www.imobiliare.ro/vanzare-apartamente/bucuresti/titan/apartament-de-vanzare-2-camere-XA123",
        "https://www.imobiliare.ro/inchirieri-apartamente/bucuresti/garsoniera-XB456"
      ]
    });
  });

  it("parses only normalized index fields from JSON-LD and meta content", () => {
    const adapter = getAdapter("imobiliare");
    const html = `
<html>
  <head>
    <title>Apartament 2 camere Titan, Bucuresti</title>
    <meta property="og:description" content="Etaj intermediar, aproape de metrou." />
    <script type="application/ld+json">
      {
        "@type": "Product",
        "name": "Apartament 2 camere Titan",
        "description": "Apartament luminos, link catre sursa pentru detalii.",
        "offers": { "price": "89500", "priceCurrency": "EUR" },
        "floorSize": { "value": 54, "unitText": "mp" },
        "numberOfRooms": 2,
        "address": { "addressLocality": "Bucuresti", "addressRegion": "Sector 3" }
      }
    </script>
  </head>
  <body>54 mp</body>
</html>`;

    expect(
      adapter.parseListingDetail(html, {
        sourceId: "imobiliare",
        url: "https://www.imobiliare.ro/vanzare-apartamente/bucuresti/titan/apartament-de-vanzare-2-camere-XA123",
        observedAt: "2026-05-25T00:00:00.000Z"
      })
    ).toEqual({
      ok: true,
      observation: expect.objectContaining({
        sourceId: "imobiliare",
        title: "Apartament 2 camere Titan",
        description: "Apartament luminos, link catre sursa pentru detalii.",
        priceText: "89500 EUR",
        areaText: "54 mp",
        roomsText: "2 camere",
        propertyTypeText: "apartament",
        transactionTypeText: "vanzare",
        cityText: "Bucuresti",
        districtText: "Sector 3"
      }),
      coverage: expect.objectContaining({
        title: true,
        price: true,
        area: true
      })
    });
  });
});
