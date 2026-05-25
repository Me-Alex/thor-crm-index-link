export const demoListingFixtureHtml = `
<article data-source-listing-id="demo-apt-titan">
  <h1 data-field="title">Apartament 2 camere Titan</h1>
  <p data-field="description">Apartament luminos, aproape de metrou. Text scurt pentru index + link.</p>
  <dl>
    <dt>Pret</dt><dd data-field="price">89.500 EUR</dd>
    <dt>Suprafata</dt><dd data-field="area">54 mp</dd>
    <dt>Camere</dt><dd data-field="rooms">2 camere</dd>
    <dt>Tip</dt><dd data-field="propertyType">Apartament</dd>
    <dt>Tranzactie</dt><dd data-field="transactionType">Vanzare</dd>
    <dt>Oras</dt><dd data-field="city">Bucuresti</dd>
    <dt>Sector</dt><dd data-field="district">Sector 3</dd>
    <dt>Cartier</dt><dd data-field="neighborhood">Titan</dd>
    <dt>Etaj</dt><dd data-field="floor">4</dd>
    <dt>Agent</dt><dd data-field="agentName">Agent Demo</dd>
  </dl>
</article>
`.trim();

export const demoHouseFixtureHtml = `
<article data-source-listing-id="demo-house-borhanci">
  <h1 data-field="title">Casa individuala cu teren Borhanci</h1>
  <p data-field="description">Casa luminoasa cu teren, potrivita pentru familie. Text scurt pentru index + link.</p>
  <dl>
    <dt>Pret</dt><dd data-field="price">249.000 EUR</dd>
    <dt>Suprafata</dt><dd data-field="area">142 mp</dd>
    <dt>Camere</dt><dd data-field="rooms">5 camere</dd>
    <dt>Tip</dt><dd data-field="propertyType">Casa</dd>
    <dt>Tranzactie</dt><dd data-field="transactionType">Vanzare</dd>
    <dt>Oras</dt><dd data-field="city">Cluj-Napoca</dd>
    <dt>Judet</dt><dd data-field="district">Cluj</dd>
    <dt>Cartier</dt><dd data-field="neighborhood">Borhanci</dd>
    <dt>Agent</dt><dd data-field="agentName">Agent Demo</dd>
  </dl>
</article>
`.trim();

export const demoSearchFixtureHtml = `
<main>
  <a data-listing-link href="/listings/demo-apt-titan">Apartament Titan</a>
  <a data-listing-link href="https://example.test/listings/demo-house-borhanci">Casa Borhanci</a>
  <a href="/about">Ignored non-listing link</a>
</main>
`.trim();

export const demoDetailFixtureHtmlByUrl = {
  "https://example.test/listings/demo-apt-titan": demoListingFixtureHtml,
  "https://example.test/listings/demo-house-borhanci": demoHouseFixtureHtml
} as const;
