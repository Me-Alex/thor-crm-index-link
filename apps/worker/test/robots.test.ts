import { describe, expect, it } from "vitest";
import { isRobotsAllowed, parseRobotsTxt } from "../src/crawler/robots";

describe("robots parser", () => {
  const robotsTxt = `
User-agent: *
Disallow: /admin/
Disallow: /cont/
Allow: /cont/public/
Sitemap: https://example.test/sitemap.xml

User-agent: ThorCRMIndexLink
Allow: /anunturi/
Disallow: /private/
Crawl-delay: 2
`;

  it("extracts sitemap URLs and crawler-specific crawl-delay", () => {
    const policy = parseRobotsTxt(robotsTxt);

    expect(policy.sitemaps).toEqual(["https://example.test/sitemap.xml"]);
    expect(policy.crawlDelaySecondsByAgent.get("thorcrmindexlink")).toBe(2);
  });

  it("uses the most specific user-agent group when checking URLs", () => {
    const policy = parseRobotsTxt(robotsTxt);

    expect(isRobotsAllowed(policy, "ThorCRMIndexLink", "https://example.test/anunturi/apartament-2-camere")).toEqual({
      allowed: true,
      matchedRule: "/anunturi/",
      userAgent: "thorcrmindexlink"
    });
    expect(isRobotsAllowed(policy, "ThorCRMIndexLink", "https://example.test/private/listing")).toMatchObject({
      allowed: false,
      matchedRule: "/private/"
    });
  });

  it("falls back to wildcard rules and prefers allow on longer matching paths", () => {
    const policy = parseRobotsTxt(robotsTxt);

    expect(isRobotsAllowed(policy, "OtherBot", "https://example.test/admin/panel")).toMatchObject({
      allowed: false,
      matchedRule: "/admin/"
    });
    expect(isRobotsAllowed(policy, "OtherBot", "https://example.test/cont/public/page")).toEqual({
      allowed: true,
      matchedRule: "/cont/public/",
      userAgent: "*"
    });
  });
});
