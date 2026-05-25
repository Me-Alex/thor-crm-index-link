export interface HtmlFetchOptions {
  fetch?: typeof fetch;
  maxBytes?: number;
}

export const crawlerUserAgent = "ThorCRMIndexLink/0.1 (+https://github.com/Me-Alex/thor-crm-index-link)";
const maxHtmlBytes = 1_000_000;

export async function fetchHtml(url: string, options: HtmlFetchOptions = {}): Promise<string> {
  assertHttpUrl(url);

  const fetcher = options.fetch ?? fetch;
  const maxBytes = options.maxBytes ?? maxHtmlBytes;
  const response = await fetcher(url, {
    headers: {
      "user-agent": crawlerUserAgent
    }
  });

  if (!response.ok) {
    throw new Error(`html_fetch_failed:${response.status}`);
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength && Number.parseInt(contentLength, 10) > maxBytes) {
    throw new Error("html_fetch_too_large");
  }

  const html = await response.text();
  if (new TextEncoder().encode(html).byteLength > maxBytes) {
    throw new Error("html_fetch_too_large");
  }

  return html;
}

function assertHttpUrl(value: string): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("invalid_crawl_url");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("unsupported_crawl_url_protocol");
  }
}
