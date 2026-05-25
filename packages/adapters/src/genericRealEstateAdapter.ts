import type { ListingDetailAdapter, ListingParseResult, ListingUrlParseResult, ParseContext } from "./types";
import type { SourceRegistryEntry } from "./sourceRegistry";

export function createGenericRealEstateAdapter(source: SourceRegistryEntry): ListingDetailAdapter {
  return {
    sourceId: source.id,
    approvedSeedUrls: [...source.crawlConfig.seedUrls, ...source.crawlConfig.sitemapUrls],
    parseListingUrls(html: string, context: ParseContext): ListingUrlParseResult {
      const urls = [...extractSitemapLocUrls(html), ...extractAnchorUrls(html)]
        .map((href) => toSameOriginAbsoluteUrl(href, context.url))
        .filter((url): url is string => Boolean(url))
        .filter((url) => matchesSourceDetailUrl(url, source))
        .slice(0, source.crawlConfig.maxDiscoverUrls);
      const uniqueUrls = [...new Set(urls)];

      if (uniqueUrls.length === 0) {
        return { ok: false, errors: ["missing_listing_links"] };
      }

      return { ok: true, urls: uniqueUrls };
    },
    parseListingDetail(html: string, context: ParseContext): ListingParseResult {
      const jsonLd = firstListingLikeJsonLd(html);
      const jsonLdRecords = jsonLdRecordCandidates(jsonLd);
      const listingEntity = jsonLdRecords[0] ?? jsonLd;
      const title = firstText(jsonLdString(listingEntity, "name"), jsonLdString(jsonLd, "name"), jsonLdString(jsonLd, "headline"), extractMetaContent(html, ["og:title", "twitter:title"]), extractTagText(html, "title"), extractTagText(html, "h1"));
      const description = firstText(jsonLdString(listingEntity, "description"), jsonLdString(jsonLd, "description"), extractMetaContent(html, ["og:description", "description", "twitter:description"]));
      const priceText = formatPriceText(
        firstJsonLdValue(jsonLdRecords, [["offers", "price"], ["offers", "priceSpecification", "price"], ["priceSpecification", "price"], "price"]),
        firstJsonLdValue(jsonLdRecords, [["offers", "priceCurrency"], ["offers", "priceSpecification", "priceCurrency"], ["priceSpecification", "priceCurrency"], "priceCurrency"]),
        html
      );
      const areaText =
        formatAreaText(
          firstJsonLdValue(jsonLdRecords, [["floorSize", "value"], "floorSize"]) ?? additionalPropertyValue(jsonLdRecords, [/suprafata/u, /surface/u, /\barea\b/u]),
          firstJsonLdValue(jsonLdRecords, [["floorSize", "unitText"], ["floorSize", "unitCode"]])
        ) ?? extractAreaText(html);
      const roomsText =
        formatRoomsText(firstJsonLdValue(jsonLdRecords, ["numberOfRooms"]) ?? additionalPropertyValue(jsonLdRecords, [/camere/u, /rooms/u, /numar camere/u])) ??
        extractRoomsText(`${title ?? ""} ${description ?? ""} ${html}`);
      const propertyTypeText = inferPropertyTypeText(`${jsonLdTypeText(listingEntity)} ${title ?? ""} ${description ?? ""} ${context.url}`);
      const transactionTypeText = inferTransactionTypeText(`${title ?? ""} ${description ?? ""} ${context.url}`);
      const cityText = firstText(...jsonLdRecords.flatMap((record) => [jsonLdString(record, ["address", "addressLocality"]), jsonLdString(record, "addressLocality")]));
      const districtText = firstText(...jsonLdRecords.flatMap((record) => [jsonLdString(record, ["address", "addressRegion"]), jsonLdString(record, "addressRegion")]));
      const sourceListingId = sourceListingIdFromUrl(context.url);

      const coverage = {
        sourceListingId: Boolean(sourceListingId),
        title: Boolean(title),
        description: Boolean(description),
        price: Boolean(priceText),
        area: Boolean(areaText),
        rooms: Boolean(roomsText),
        propertyType: Boolean(propertyTypeText),
        transactionType: Boolean(transactionTypeText),
        city: Boolean(cityText),
        district: Boolean(districtText),
        neighborhood: false,
        floor: false,
        agentName: false
      };

      const errors = requiredErrors([
        ["missing_title", title],
        ["missing_price", priceText],
        ["missing_area", areaText]
      ]);

      if (!title || !priceText || !areaText) {
        return { ok: false, errors, coverage };
      }

      return {
        ok: true,
        coverage,
        observation: {
          sourceId: context.sourceId,
          ...(sourceListingId ? { sourceListingId } : {}),
          url: context.url,
          title,
          ...(description ? { description } : {}),
          priceText,
          areaText,
          ...(roomsText ? { roomsText } : {}),
          ...(propertyTypeText ? { propertyTypeText } : {}),
          ...(transactionTypeText ? { transactionTypeText } : {}),
          ...(cityText ? { cityText } : {}),
          ...(districtText ? { districtText } : {}),
          observedAt: context.observedAt
        }
      };
    }
  };
}

function extractAnchorUrls(html: string): string[] {
  return [...html.matchAll(/<a\b[^>]*>/giu)].map((match) => extractAttributeFromTag(match[0], "href")).filter((href): href is string => Boolean(href));
}

function extractSitemapLocUrls(value: string): string[] {
  return [...value.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/giu)].map((match) => decodeHtml(stripTags(match[1]))).filter((url): url is string => Boolean(url));
}

function matchesSourceDetailUrl(value: string, source: SourceRegistryEntry): boolean {
  const url = new URL(value);
  const path = `${url.pathname}${url.search}`;
  return source.crawlConfig.detailUrlPatterns.some((pattern) => new RegExp(pattern, "iu").test(path));
}

function toSameOriginAbsoluteUrl(value: string | undefined, baseUrl: string): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const base = new URL(baseUrl);
    const url = new URL(decodeHtml(value) ?? value, baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return undefined;
    }
    return url.origin === base.origin ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function firstListingLikeJsonLd(html: string): Record<string, unknown> | undefined {
  return extractJsonLdObjects(html).find((item) => {
    const type = normalizeText(jsonLdString(item, "@type") ?? "");
    return /\b(product|offer|realestatelisting|apartment|house|singlefamilyresidence|residence)\b/.test(type) || Boolean(jsonLdValue(item, ["offers", "price"]));
  });
}

function jsonLdRecordCandidates(value: Record<string, unknown> | undefined): Array<Record<string, unknown>> {
  const records: Array<Record<string, unknown>> = [];
  addRecord(records, value);
  addRecord(records, firstRecord(jsonLdValue(value, "mainEntity")));
  addRecord(records, firstRecord(jsonLdValue(value, ["offers", "itemOffered"])));
  addRecord(records, firstRecord(jsonLdValue(value, ["mainEntity", "offers", "itemOffered"])));
  return records;
}

function addRecord(records: Array<Record<string, unknown>>, value: Record<string, unknown> | undefined): void {
  if (value && !records.includes(value)) {
    records.push(value);
  }
}

function firstRecord(value: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(value)) {
    return value.find(isRecord);
  }
  return isRecord(value) ? value : undefined;
}

function firstJsonLdValue(records: readonly Record<string, unknown>[], paths: string | readonly string[] | ReadonlyArray<string | readonly string[]>): unknown {
  const normalizedPaths = isJsonLdPath(paths) ? [paths] : paths;
  for (const record of records) {
    for (const path of normalizedPaths) {
      const value = jsonLdValue(record, path);
      if (scalarToText(value)) {
        return value;
      }
    }
  }
  return undefined;
}

function isJsonLdPath(value: string | readonly string[] | ReadonlyArray<string | readonly string[]>): value is string | readonly string[] {
  return typeof value === "string" || value.every((item) => typeof item === "string");
}

function additionalPropertyValue(records: readonly Record<string, unknown>[], namePatterns: readonly RegExp[]): unknown {
  for (const pattern of namePatterns) {
    for (const record of records) {
      for (const property of jsonLdRecordArray(record["additionalProperty"])) {
        const name = normalizeText(firstText(jsonLdString(property, "name"), jsonLdString(property, "propertyID")) ?? "");
        if (pattern.test(name)) {
          return jsonLdValue(property, "value");
        }
      }
    }
  }
  return undefined;
}

function jsonLdRecordArray(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }
  return isRecord(value) ? [value] : [];
}

function jsonLdTypeText(value: Record<string, unknown> | undefined): string {
  const raw = jsonLdValue(value, "@type");
  if (Array.isArray(raw)) {
    return raw.map((item) => scalarToText(item)).filter(Boolean).join(" ");
  }
  return scalarToText(raw) ?? "";
}

function extractJsonLdObjects(html: string): Array<Record<string, unknown>> {
  return [...html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/giu)].flatMap((match) => {
    try {
      return flattenJsonLd(JSON.parse(decodeHtml(stripHtmlComments(match[1])) ?? "{}"));
    } catch {
      return [];
    }
  });
}

function flattenJsonLd(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.flatMap(flattenJsonLd);
  }
  if (!isRecord(value)) {
    return [];
  }
  const graph = value["@graph"];
  return [value, ...flattenJsonLd(graph)];
}

function jsonLdString(value: Record<string, unknown> | undefined, keyOrPath: string | readonly string[]): string | undefined {
  const raw = jsonLdValue(value, keyOrPath);
  if (typeof raw === "string") {
    return decodeHtml(stripTags(raw));
  }
  if (typeof raw === "number") {
    return String(raw);
  }
  return undefined;
}

function jsonLdValue(value: Record<string, unknown> | undefined, keyOrPath: string | readonly string[]): unknown {
  if (!value) {
    return undefined;
  }
  const path = Array.isArray(keyOrPath) ? keyOrPath : [keyOrPath];
  let current: unknown = value;
  for (const key of path) {
    if (Array.isArray(current)) {
      current = current[0];
    }
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[key];
  }
  if (Array.isArray(current)) {
    return current[0];
  }
  return current;
}

function formatPriceText(price: unknown, currency: unknown, html: string): string | undefined {
  const value = scalarToText(price);
  if (!value) {
    return extractPriceText(html);
  }
  const normalizedCurrency = normalizeText(scalarToText(currency) ?? "EUR");
  if (normalizedCurrency && normalizedCurrency !== "eur") {
    return undefined;
  }
  return `${value} EUR`;
}

function formatAreaText(value: unknown, unitText: unknown): string | undefined {
  const area = scalarToText(value);
  if (!area) {
    return undefined;
  }
  if (/\b(mp|m2|m²|sqm|squaremeter|squaremeters)\b/iu.test(area)) {
    return area;
  }
  const unit = normalizeText(scalarToText(unitText) ?? "mp");
  if (unit && !/^(mp|m2|m²|sqm|squaremeter|squaremeters)$/.test(unit)) {
    return undefined;
  }
  return `${area} mp`;
}

function formatRoomsText(value: unknown): string | undefined {
  const rooms = scalarToText(value);
  if (!rooms) {
    return undefined;
  }
  return /\b(camere|camera|rooms?)\b/iu.test(rooms) ? rooms : `${rooms} camere`;
}

function scalarToText(value: unknown): string | undefined {
  if (typeof value === "string") {
    return decodeHtml(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

function extractMetaContent(html: string, names: readonly string[]): string | undefined {
  const tags = [...html.matchAll(/<meta\b[^>]*>/giu)].map((match) => match[0]);
  for (const tag of tags) {
    const name = normalizeText(extractAttributeFromTag(tag, "property") ?? extractAttributeFromTag(tag, "name") ?? extractAttributeFromTag(tag, "itemprop") ?? "");
    if (names.some((candidate) => normalizeText(candidate) === name)) {
      return decodeHtml(extractAttributeFromTag(tag, "content"));
    }
  }
  return undefined;
}

function extractTagText(html: string, tagName: string): string | undefined {
  const escaped = escapeRegExp(tagName);
  const match = html.match(new RegExp(`<${escaped}\\b[^>]*>([\\s\\S]*?)<\\/${escaped}>`, "iu"));
  return decodeHtml(stripTags(match?.[1]));
}

function extractPriceText(html: string): string | undefined {
  const text = normalizeVisibleText(html);
  const match = text.match(/(?:€\s*)?(\d[\d\s.,]{2,})(?:\s*(?:€|eur|euro))(?![a-z0-9])/iu);
  return match?.[1] ? `${match[1].trim()} EUR` : undefined;
}

function extractAreaText(html: string): string | undefined {
  const text = normalizeVisibleText(html);
  const normalizedText = normalizeText(text);
  const labeledMatch = normalizedText.match(/\b(?:suprafata(?:\s+utila)?|surface|area)\s*:?\s*(\d{1,5}(?:[.,]\d{1,2})?)\s*(?:m²|m2|mp)(?![a-z0-9])/iu);
  if (labeledMatch?.[1]) {
    return `${labeledMatch[1]} mp`;
  }
  const match = text.match(/(\d{1,5}(?:[.,]\d{1,2})?)\s*(?:m²|m2|mp)(?![a-z0-9])/iu);
  return match?.[1] ? `${match[1]} mp` : undefined;
}

function extractRoomsText(html: string): string | undefined {
  const text = normalizeVisibleText(html);
  const match = text.match(/\b(\d{1,2})\s*(?:camere|camera)\b/iu);
  return match?.[1] ? `${match[1]} camere` : undefined;
}

function inferPropertyTypeText(value: string): string {
  const text = normalizeText(value);
  if (/\b(casa|vila|duplex)\b/.test(text)) return "casa";
  if (/\bteren\b/.test(text)) return "teren";
  if (/\b(spatiu|birou|comercial)\b/.test(text)) return "spatiu comercial";
  if (/\b(ap|apartament|apartment|garsoniera|studio)\b/.test(text) || /\b\d{1,2}\s+camere\b/.test(text)) return "apartament";
  return "altul";
}

function inferTransactionTypeText(value: string): string {
  return /\b(inchiriere|inchirieri|inchiriat|inchiriez|inchiriaza|chirie|rent)\b/iu.test(value) ? "inchiriere" : "vanzare";
}

function sourceListingIdFromUrl(value: string): string | undefined {
  const pathname = new URL(value).pathname.replace(/\/+$/g, "");
  const slug = pathname.split("/").filter(Boolean).at(-1);
  return slug ? slug.slice(0, 160) : undefined;
}

function requiredErrors(entries: Array<[string, string | undefined]>): string[] {
  return entries.filter(([, value]) => !value).map(([error]) => error);
}

function extractAttributeFromTag(tag: string, attribute: string): string | undefined {
  const escaped = escapeRegExp(attribute);
  const match = tag.match(new RegExp(`\\b${escaped}\\s*=\\s*["']([^"']+)["']`, "iu"));
  return decodeHtml(match?.[1]);
}

function stripHtmlComments(value: string | undefined): string | undefined {
  return value?.replace(/<!--/g, "").replace(/-->/g, "");
}

function stripTags(value: string | undefined): string | undefined {
  return value?.replace(/<[^>]*>/g, " ");
}

function decodeHtml(value: string | undefined): string | undefined {
  const decoded = value
    ?.replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

  return decoded || undefined;
}

function normalizeVisibleText(html: string): string {
  const withoutNonVisibleBlocks = html.replace(/<script\b[\s\S]*?<\/script>/giu, " ").replace(/<style\b[\s\S]*?<\/style>/giu, " ");
  return stripTags(withoutNonVisibleBlocks)?.replace(/\s+/g, " ").trim() ?? "";
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function firstText(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => Boolean(value));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
