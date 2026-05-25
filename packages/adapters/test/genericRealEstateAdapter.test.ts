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

  it("uses source wording to infer OLX rental apartments from JSON-LD plus visible text", () => {
    const adapter = getAdapter("olx");
    const html = `
<html>
  <head>
    <script>window.__imageHints = "260 mp";</script>
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": "Persoana fizica inchiriez ap 2 camere",
        "description": "Apartament decomandat, aproape de metrou.",
        "offers": { "@type": "Offer", "price": "450", "priceCurrency": "EUR" }
      }
    </script>
  </head>
  <body>Recomandari similare 260 mp. Suprafața utilă: 53 m²</body>
</html>`;

    expect(
      adapter.parseListingDetail(html, {
        sourceId: "olx",
        url: "https://www.olx.ro/d/oferta/persoana-fizica-inchiriez-ap-2-camere-IDtest.html",
        observedAt: "2026-05-25T00:00:00.000Z"
      })
    ).toEqual({
      ok: true,
      observation: expect.objectContaining({
        priceText: "450 EUR",
        areaText: "53 mp",
        roomsText: "2 camere",
        propertyTypeText: "apartament",
        transactionTypeText: "inchiriere"
      }),
      coverage: expect.objectContaining({
        price: true,
        area: true,
        rooms: true
      })
    });
  });

  it("parses Imobiliare offer priceSpecification JSON-LD with meta fallback title", () => {
    const adapter = getAdapter("imobiliare");
    const html = `
<html>
  <head>
    <meta property="og:title" content="Apartament de inchiriat cu 2 camere" />
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Offer",
        "priceSpecification": {
          "@type": "UnitPriceSpecification",
          "price": "700",
          "priceCurrency": "EUR"
        }
      }
    </script>
  </head>
  <body>Suprafața utilă: 67 m²</body>
</html>`;

    expect(
      adapter.parseListingDetail(html, {
        sourceId: "imobiliare",
        url: "https://www.imobiliare.ro/oferta/apartament-de-inchiriat-sector-1-test-123",
        observedAt: "2026-05-25T00:00:00.000Z"
      })
    ).toEqual({
      ok: true,
      observation: expect.objectContaining({
        priceText: "700 EUR",
        areaText: "67 mp",
        roomsText: "2 camere",
        propertyTypeText: "apartament",
        transactionTypeText: "inchiriere"
      }),
      coverage: expect.objectContaining({
        price: true,
        area: true
      })
    });
  });

  it("parses Anuntul visible euro price and labeled characteristics", () => {
    const adapter = getAdapter("anuntul");
    const html = `
<html>
  <head>
    <meta property="og:title" content="Casa Pipera, Voluntari" />
    <meta property="og:description" content="Vila de vanzare cu 7 camere." />
  </head>
  <body>
    <h1>Casa Pipera, Voluntari</h1>
    <section>750.000 € Caracteristici Suprafata utila 270 mp Teren 450 mp 7 camere</section>
  </body>
</html>`;

    expect(
      adapter.parseListingDetail(html, {
        sourceId: "anuntul",
        url: "https://www.anuntul.ro/anunt-vanzare-casa-pipera-voluntari-ilfov-test",
        observedAt: "2026-05-25T00:00:00.000Z"
      })
    ).toEqual({
      ok: true,
      observation: expect.objectContaining({
        priceText: "750.000 EUR",
        areaText: "270 mp",
        roomsText: "7 camere",
        propertyTypeText: "casa",
        transactionTypeText: "vanzare"
      }),
      coverage: expect.objectContaining({
        price: true,
        area: true,
        rooms: true
      })
    });
  });

  it("parses HomeZZ nested RealEstateListing mainEntity properties", () => {
    const adapter = getAdapter("homezz");
    const html = `
<html>
  <head>
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "RealEstateListing",
            "name": "2 camere Lujerului",
            "description": "Apartament mobilat utilat.",
            "mainEntity": {
              "@type": "Apartment",
              "offers": { "@type": "Offer", "price": "95000", "priceCurrency": "EUR" },
              "additionalProperty": [
                { "@type": "PropertyValue", "name": "Area", "value": "1" },
                { "@type": "PropertyValue", "name": "Suprafata utila", "value": "56 mp" },
                { "@type": "PropertyValue", "name": "Numar camere", "value": "2" }
              ]
            }
          }
        ]
      }
    </script>
  </head>
</html>`;

    expect(
      adapter.parseListingDetail(html, {
        sourceId: "homezz",
        url: "https://homezz.ro/2-camere-56-mp-etajul-1-mobilat-utilat-lujerului-pla-4155380.html",
        observedAt: "2026-05-25T00:00:00.000Z"
      })
    ).toEqual({
      ok: true,
      observation: expect.objectContaining({
        priceText: "95000 EUR",
        areaText: "56 mp",
        roomsText: "2 camere",
        propertyTypeText: "apartament",
        transactionTypeText: "vanzare"
      }),
      coverage: expect.objectContaining({
        price: true,
        area: true,
        rooms: true
      })
    });
  });
});
