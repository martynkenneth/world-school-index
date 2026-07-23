import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const MINIMUM_DELAY_MS = 3_000;
const MAX_CONCURRENT_DOMAINS = 3;
const DEFAULT_CONTACT_URL = "https://world-school-index-vietnam.martynkenneth.chatgpt.site/about/crawler";
const BOT_TOKEN = "worldschoolindexbot";

type RobotsRule = { type: "allow" | "disallow"; path: string };
type RobotsPolicy = {
  permitted: boolean;
  delayMs: number;
  robotsUrl: string;
  robotsStatus: number | null;
  reason: string;
};

type FetchEntry = {
  requested_url: string;
  final_url: string | null;
  retrieved_date: string;
  status: "fetched" | "unfetched" | "blocked";
  crawl_permitted: boolean;
  http_status: number | null;
  content_type: string | null;
  cache_path: string | null;
  robots_url: string;
  robots_status: number | null;
  error: string | null;
};

type ParsedArguments = {
  country: string;
  slug: string;
  contactUrl: string;
  urls: URL[];
};

const domainQueues = new Map<string, Promise<void>>();
const lastRequestStartedAt = new Map<string, number>();
const robotsCache = new Map<string, Promise<RobotsPolicy>>();

function parseArguments(argv: string[]): ParsedArguments {
  let country = "";
  let slug = "";
  let contactUrl = process.env.WSI_CRAWLER_CONTACT_URL ?? DEFAULT_CONTACT_URL;
  const urls: URL[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--country") country = argv[++index] ?? "";
    else if (argument === "--slug") slug = argv[++index] ?? "";
    else if (argument === "--contact") contactUrl = argv[++index] ?? "";
    else if (argument.startsWith("--")) throw new Error(`Unknown option: ${argument}`);
    else urls.push(new URL(argument));
  }

  if (!/^[a-z]{2,}$/.test(country)) throw new Error("--country must be a lowercase country slug");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("--slug must be a lowercase URL slug");
  if (urls.length === 0) throw new Error("Provide at least one HTTPS source URL");
  if (urls.some((url) => url.protocol !== "https:")) throw new Error("Only HTTPS source URLs are accepted");
  const parsedContact = new URL(contactUrl);
  if (parsedContact.protocol !== "https:") throw new Error("Crawler contact URL must use HTTPS");
  return { country, slug, contactUrl: parsedContact.toString(), urls };
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function rateLimitedFetch(url: URL, userAgent: string, delayMs = MINIMUM_DELAY_MS): Promise<Response> {
  const origin = url.origin;
  const previous = domainQueues.get(origin) ?? Promise.resolve();
  let responsePromise!: Promise<Response>;
  const queued = previous.then(async () => {
    const lastStarted = lastRequestStartedAt.get(origin) ?? 0;
    const waitFor = Math.max(0, Math.max(MINIMUM_DELAY_MS, delayMs) - (Date.now() - lastStarted));
    if (waitFor > 0) await sleep(waitFor);
    lastRequestStartedAt.set(origin, Date.now());
    responsePromise = fetch(url, {
      redirect: "manual",
      headers: {
        "user-agent": userAgent,
        accept: "text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.1",
      },
    });
    await responsePromise;
  });
  domainQueues.set(origin, queued.catch(() => undefined));
  await queued;
  return responsePromise;
}

export function parseRobots(body: string, pathname: string): { permitted: boolean; crawlDelayMs: number } {
  type Group = { agents: string[]; rules: RobotsRule[]; crawlDelaySeconds: number | null };
  const groups: Group[] = [];
  let current: Group | null = null;

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const directive = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (directive === "user-agent") {
      if (!current || current.rules.length > 0 || current.crawlDelaySeconds !== null) {
        current = { agents: [], rules: [], crawlDelaySeconds: null };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if (current && (directive === "allow" || directive === "disallow")) {
      current.rules.push({ type: directive, path: value });
    } else if (current && directive === "crawl-delay") {
      const seconds = Number(value);
      if (Number.isFinite(seconds) && seconds >= 0) current.crawlDelaySeconds = seconds;
    }
  }

  const exactGroups = groups.filter((group) => group.agents.includes(BOT_TOKEN));
  const selected = exactGroups.length > 0
    ? exactGroups
    : groups.filter((group) => group.agents.includes("*"));
  const rules = selected.flatMap((group) => group.rules).filter((rule) => rule.path !== "");
  const requestPath = pathname || "/";
  const matches = rules
    .map((rule) => {
      const endAnchored = rule.path.endsWith("$");
      const withoutEnd = endAnchored ? rule.path.slice(0, -1) : rule.path;
      const pattern = withoutEnd
        .split("*")
        .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
        .join(".*");
      const expression = new RegExp(`^${pattern}${endAnchored ? "$" : ""}`);
      return expression.test(requestPath) ? rule : null;
    })
    .filter((rule): rule is RobotsRule => rule !== null)
    .sort((left, right) => right.path.length - left.path.length || (left.type === "allow" ? -1 : 1));
  const crawlDelaySeconds = Math.max(0, ...selected.map((group) => group.crawlDelaySeconds ?? 0));
  return {
    permitted: matches[0]?.type !== "disallow",
    crawlDelayMs: crawlDelaySeconds * 1_000,
  };
}

async function robotsPolicy(url: URL, userAgent: string): Promise<RobotsPolicy> {
  const cacheKey = `${url.origin}${url.pathname}`;
  const cached = robotsCache.get(cacheKey);
  if (cached) return cached;

  const policyPromise = (async () => {
    const robotsUrl = new URL("/robots.txt", url.origin);
    try {
      const response = await rateLimitedFetch(robotsUrl, userAgent);
      if (response.status === 404 || response.status === 410) {
        return {
          permitted: true,
          delayMs: MINIMUM_DELAY_MS,
          robotsUrl: robotsUrl.toString(),
          robotsStatus: response.status,
          reason: "robots.txt not present",
        };
      }
      if (!response.ok) {
        return {
          permitted: false,
          delayMs: MINIMUM_DELAY_MS,
          robotsUrl: robotsUrl.toString(),
          robotsStatus: response.status,
          reason: `robots.txt returned HTTP ${response.status}`,
        };
      }
      const parsed = parseRobots(await response.text(), `${url.pathname}${url.search}`);
      return {
        permitted: parsed.permitted,
        delayMs: Math.max(MINIMUM_DELAY_MS, parsed.crawlDelayMs),
        robotsUrl: robotsUrl.toString(),
        robotsStatus: response.status,
        reason: parsed.permitted ? "allowed by robots.txt" : "disallowed by robots.txt",
      };
    } catch (error) {
      return {
        permitted: false,
        delayMs: MINIMUM_DELAY_MS,
        robotsUrl: robotsUrl.toString(),
        robotsStatus: null,
        reason: `robots.txt fetch failed: ${(error as Error).message}`,
      };
    }
  })();
  robotsCache.set(cacheKey, policyPromise);
  return policyPromise;
}

function cachePathFor(country: string, slug: string, date: string, url: URL, sourceIndex: number): string {
  const suffix = sourceIndex === 0 ? "" : `-${createHash("sha256").update(url.toString()).digest("hex").slice(0, 10)}`;
  return path.join("data", "raw", country, slug, `${date}${suffix}.html`);
}

async function fetchSource(
  requestedUrl: URL,
  sourceIndex: number,
  country: string,
  slug: string,
  date: string,
  userAgent: string,
): Promise<FetchEntry> {
  let currentUrl = requestedUrl;
  let lastPolicy = await robotsPolicy(currentUrl, userAgent);

  for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
    lastPolicy = await robotsPolicy(currentUrl, userAgent);
    if (!lastPolicy.permitted) {
      return {
        requested_url: requestedUrl.toString(),
        final_url: currentUrl.toString(),
        retrieved_date: date,
        status: "blocked",
        crawl_permitted: false,
        http_status: null,
        content_type: null,
        cache_path: null,
        robots_url: lastPolicy.robotsUrl,
        robots_status: lastPolicy.robotsStatus,
        error: lastPolicy.reason,
      };
    }

    let response: Response;
    try {
      response = await rateLimitedFetch(currentUrl, userAgent, lastPolicy.delayMs);
    } catch (error) {
      return {
        requested_url: requestedUrl.toString(),
        final_url: currentUrl.toString(),
        retrieved_date: date,
        status: "unfetched",
        crawl_permitted: true,
        http_status: null,
        content_type: null,
        cache_path: null,
        robots_url: lastPolicy.robotsUrl,
        robots_status: lastPolicy.robotsStatus,
        error: (error as Error).message,
      };
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) break;
      currentUrl = new URL(location, currentUrl);
      if (currentUrl.protocol !== "https:") {
        return {
          requested_url: requestedUrl.toString(),
          final_url: currentUrl.toString(),
          retrieved_date: date,
          status: "unfetched",
          crawl_permitted: true,
          http_status: response.status,
          content_type: response.headers.get("content-type"),
          cache_path: null,
          robots_url: lastPolicy.robotsUrl,
          robots_status: lastPolicy.robotsStatus,
          error: "Redirect target is not HTTPS",
        };
      }
      continue;
    }

    const contentType = response.headers.get("content-type");
    if (!response.ok) {
      return {
        requested_url: requestedUrl.toString(),
        final_url: currentUrl.toString(),
        retrieved_date: date,
        status: "unfetched",
        crawl_permitted: true,
        http_status: response.status,
        content_type: contentType,
        cache_path: null,
        robots_url: lastPolicy.robotsUrl,
        robots_status: lastPolicy.robotsStatus,
        error: `HTTP ${response.status}`,
      };
    }
    if (!contentType?.toLowerCase().includes("text/html")) {
      return {
        requested_url: requestedUrl.toString(),
        final_url: currentUrl.toString(),
        retrieved_date: date,
        status: "unfetched",
        crawl_permitted: true,
        http_status: response.status,
        content_type: contentType,
        cache_path: null,
        robots_url: lastPolicy.robotsUrl,
        robots_status: lastPolicy.robotsStatus,
        error: `Expected HTML, received ${contentType ?? "an unknown content type"}`,
      };
    }

    const relativeCachePath = cachePathFor(country, slug, date, requestedUrl, sourceIndex);
    await mkdir(path.dirname(path.resolve(relativeCachePath)), { recursive: true });
    await writeFile(path.resolve(relativeCachePath), await response.text(), "utf8");
    return {
      requested_url: requestedUrl.toString(),
      final_url: currentUrl.toString(),
      retrieved_date: date,
      status: "fetched",
      crawl_permitted: true,
      http_status: response.status,
      content_type: contentType,
      cache_path: relativeCachePath.replaceAll("\\", "/"),
      robots_url: lastPolicy.robotsUrl,
      robots_status: lastPolicy.robotsStatus,
      error: null,
    };
  }

  return {
    requested_url: requestedUrl.toString(),
    final_url: currentUrl.toString(),
    retrieved_date: date,
    status: "unfetched",
    crawl_permitted: lastPolicy.permitted,
    http_status: null,
    content_type: null,
    cache_path: null,
    robots_url: lastPolicy.robotsUrl,
    robots_status: lastPolicy.robotsStatus,
    error: "Too many redirects or redirect without a location header",
  };
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  async function run(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

export async function runFetch(argv = process.argv.slice(2)): Promise<void> {
  const { country, slug, contactUrl, urls } = parseArguments(argv);
  const retrievedDate = new Date().toISOString().slice(0, 10);
  const userAgent = `WorldSchoolIndexBot/1.0 (+${contactUrl})`;
  const indexedUrls = urls.map((url, index) => ({ url, index }));
  const groups = Array.from(Map.groupBy(indexedUrls, ({ url }) => url.origin).values());
  const groupedResults = await mapWithConcurrency(groups, MAX_CONCURRENT_DOMAINS, async (group) => {
    const results: Array<{ index: number; entry: FetchEntry }> = [];
    for (const { url, index } of group) {
      results.push({ index, entry: await fetchSource(url, index, country, slug, retrievedDate, userAgent) });
    }
    return results;
  });
  const requests = groupedResults.flat().sort((left, right) => left.index - right.index).map(({ entry }) => entry);
  const logPath = path.join("data", "raw", country, slug, `${retrievedDate}.fetch.json`);
  await mkdir(path.dirname(path.resolve(logPath)), { recursive: true });
  await writeFile(path.resolve(logPath), `${JSON.stringify({
    schema_version: "1.0",
    country,
    slug,
    retrieved_date: retrievedDate,
    user_agent: userAgent,
    limits: {
      minimum_delay_ms: MINIMUM_DELAY_MS,
      max_concurrent_domains: MAX_CONCURRENT_DOMAINS,
    },
    requests,
  }, null, 2)}\n`, "utf8");
  console.log(`Fetch log: ${logPath}`);
  requests.forEach((request) => console.log(`${request.status}: ${request.requested_url}${request.error ? ` (${request.error})` : ""}`));
}

if (process.argv.includes("--country") && process.argv.includes("--slug")) {
  runFetch().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
