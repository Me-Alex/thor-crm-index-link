export interface RobotsRule {
  directive: "allow" | "disallow";
  value: string;
}

export interface RobotsGroup {
  agents: string[];
  rules: RobotsRule[];
  crawlDelaySeconds?: number;
}

export interface RobotsPolicy {
  groups: RobotsGroup[];
  sitemaps: string[];
  crawlDelaySecondsByAgent: Map<string, number>;
}

export interface RobotsDecision {
  allowed: boolean;
  matchedRule?: string;
  userAgent: string;
}

export function parseRobotsTxt(value: string): RobotsPolicy {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  let currentGroup: RobotsGroup | undefined;

  for (const rawLine of value.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/u, "").trim();
    if (!line) {
      currentGroup = undefined;
      continue;
    }

    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const rawDirectiveValue = line.slice(separatorIndex + 1).trim();

    if (key === "sitemap") {
      if (rawDirectiveValue) {
        sitemaps.push(rawDirectiveValue);
      }
      continue;
    }

    if (key === "user-agent") {
      const agent = rawDirectiveValue.toLowerCase();
      if (!currentGroup || currentGroup.rules.length > 0) {
        currentGroup = { agents: [], rules: [] };
        groups.push(currentGroup);
      }
      currentGroup.agents.push(agent);
      continue;
    }

    if (!currentGroup) {
      continue;
    }

    if (key === "allow" || key === "disallow") {
      currentGroup.rules.push({ directive: key, value: rawDirectiveValue });
      continue;
    }

    if (key === "crawl-delay") {
      const delay = Number.parseFloat(rawDirectiveValue);
      if (Number.isFinite(delay) && delay >= 0) {
        currentGroup.crawlDelaySeconds = delay;
      }
    }
  }

  return {
    groups,
    sitemaps: [...new Set(sitemaps)],
    crawlDelaySecondsByAgent: crawlDelayEntriesByAgent(groups)
  };
}

export function isRobotsAllowed(policy: RobotsPolicy, userAgent: string, url: string): RobotsDecision {
  const normalizedAgent = userAgent.toLowerCase();
  const group = selectGroup(policy, normalizedAgent);
  const path = pathForRobots(url);

  if (!group) {
    return { allowed: true, userAgent: normalizedAgent };
  }

  const rule = group.rules
    .filter((candidate) => candidate.value !== "")
    .filter((candidate) => robotsPatternToRegExp(candidate.value).test(path))
    .sort((left, right) => right.value.length - left.value.length || allowSortValue(right.directive) - allowSortValue(left.directive))[0];

  if (!rule) {
    return { allowed: true, userAgent: group.agents[0] ?? normalizedAgent };
  }

  return {
    allowed: rule.directive === "allow",
    matchedRule: rule.value,
    userAgent: group.agents[0] ?? normalizedAgent
  };
}

function selectGroup(policy: RobotsPolicy, normalizedAgent: string): RobotsGroup | undefined {
  return (
    policy.groups.find((group) => group.agents.some((agent) => agent !== "*" && normalizedAgent.includes(agent))) ??
    policy.groups.find((group) => group.agents.includes("*"))
  );
}

function pathForRobots(value: string): string {
  const url = new URL(value);
  return `${url.pathname}${url.search}`;
}

function robotsPatternToRegExp(value: string): RegExp {
  const anchored = value.endsWith("$");
  const pattern = value.replace(/\$$/u, "");
  const escaped = pattern
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${escaped}${anchored ? "$" : ""}`, "u");
}

function allowSortValue(directive: RobotsRule["directive"]): number {
  return directive === "allow" ? 1 : 0;
}

function crawlDelayEntriesByAgent(groups: RobotsGroup[]): Map<string, number> {
  const entries: Array<[string, number]> = [];
  for (const group of groups) {
    if (group.crawlDelaySeconds === undefined) {
      continue;
    }
    for (const agent of group.agents) {
      entries.push([agent, group.crawlDelaySeconds]);
    }
  }
  return new Map(entries);
}
