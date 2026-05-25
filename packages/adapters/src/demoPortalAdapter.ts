import type { ListingDetailAdapter, ListingParseResult, ListingUrlParseResult, ParseContext } from "./types";
import { demoDetailFixtureHtmlByUrl } from "./demoFixture";

export const demoPortalAdapter: ListingDetailAdapter = {
  sourceId: "demo",
  approvedSeedUrls: ["https://example.test/listings"],
  detailFixtureHtmlByUrl: demoDetailFixtureHtmlByUrl,
  parseListingUrls(html: string, context: ParseContext): ListingUrlParseResult {
    const urls = [...html.matchAll(/<a\b[^>]*>/giu)]
      .filter((match) => hasAttribute(match[0], "data-listing-link"))
      .map((match) => extractAttributeFromTag(match[0], "href"))
      .map((href) => toSameOriginAbsoluteUrl(href, context.url))
      .filter((url): url is string => Boolean(url));

    if (urls.length === 0) {
      return { ok: false, errors: ["missing_listing_links"] };
    }

    return { ok: true, urls: [...new Set(urls)] };
  },

  parseListingDetail(html: string, context: ParseContext): ListingParseResult {
    const sourceListingId = extractAttribute(html, "data-source-listing-id");
    const title = extractField(html, "title");
    const description = extractField(html, "description");
    const priceText = extractField(html, "price");
    const areaText = extractField(html, "area");
    const roomsText = extractField(html, "rooms");
    const propertyTypeText = extractField(html, "propertyType");
    const transactionTypeText = extractField(html, "transactionType");
    const cityText = extractField(html, "city");
    const districtText = extractField(html, "district");
    const neighborhoodText = extractField(html, "neighborhood");
    const floorText = extractField(html, "floor");
    const agentNameText = extractField(html, "agentName");

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
      neighborhood: Boolean(neighborhoodText),
      floor: Boolean(floorText),
      agentName: Boolean(agentNameText)
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
        ...(priceText ? { priceText } : {}),
        ...(areaText ? { areaText } : {}),
        ...(roomsText ? { roomsText } : {}),
        ...(propertyTypeText ? { propertyTypeText } : {}),
        ...(transactionTypeText ? { transactionTypeText } : {}),
        ...(cityText ? { cityText } : {}),
        ...(districtText ? { districtText } : {}),
        ...(neighborhoodText ? { neighborhoodText } : {}),
        ...(floorText ? { floorText } : {}),
        ...(agentNameText ? { agentNameText } : {}),
        observedAt: context.observedAt
      }
    };
  }
};

function extractAttribute(html: string, attribute: string): string | undefined {
  const escaped = escapeRegExp(attribute);
  const match = html.match(new RegExp(`${escaped}\\s*=\\s*["']([^"']+)["']`, "iu"));
  return decodeHtml(match?.[1]);
}

function extractAttributeFromTag(tag: string, attribute: string): string | undefined {
  const escaped = escapeRegExp(attribute);
  const match = tag.match(new RegExp(`\\b${escaped}\\s*=\\s*["']([^"']+)["']`, "iu"));
  return decodeHtml(match?.[1]);
}

function hasAttribute(tag: string, attribute: string): boolean {
  const escaped = escapeRegExp(attribute);
  return new RegExp(`\\b${escaped}(?:\\s*=|\\s|>|/)`, "iu").test(tag);
}

function extractField(html: string, field: string): string | undefined {
  const escaped = escapeRegExp(field);
  const match = html.match(new RegExp(`<[^>]+data-field\\s*=\\s*["']${escaped}["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, "iu"));
  return decodeHtml(stripTags(match?.[1]));
}

function requiredErrors(entries: Array<[string, string | undefined]>): string[] {
  return entries.filter(([, value]) => !value).map(([error]) => error);
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toSameOriginAbsoluteUrl(value: string | undefined, baseUrl: string): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const base = new URL(baseUrl);
    const url = new URL(value, baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return undefined;
    }
    return url.origin === base.origin ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
