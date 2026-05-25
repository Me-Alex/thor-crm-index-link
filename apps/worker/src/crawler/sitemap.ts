export interface SitemapParseOptions {
  baseUrl: string;
  limit: number;
}

export function parseSitemapUrls(xml: string, options: SitemapParseOptions): string[] {
  const base = new URL(options.baseUrl);
  const urls: string[] = [];

  for (const match of xml.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/giu)) {
    const rawUrl = decodeXml(match[1]);
    if (!rawUrl) {
      continue;
    }

    const parsed = parseSameOriginHttpUrl(rawUrl, base);
    if (!parsed || urls.includes(parsed)) {
      continue;
    }

    urls.push(parsed);
    if (urls.length >= options.limit) {
      break;
    }
  }

  return urls;
}

function parseSameOriginHttpUrl(value: string, base: URL): string | undefined {
  try {
    const url = new URL(value, base);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.origin !== base.origin) {
      return undefined;
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

function decodeXml(value: string | undefined): string | undefined {
  const decoded = value
    ?.replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
  return decoded || undefined;
}
