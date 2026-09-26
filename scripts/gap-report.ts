import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  CORE_FIELD_PATHS,
  getAtPath,
  validateSchoolRecord,
  type JsonObject,
  type SchoolRecord,
} from "./lib/school-record.ts";

export type ActionTag = "SEARCH" | "EMAIL" | "JS" | "UNPUBLISHED";

export type GapAction = {
  tag: ActionTag;
  detail: string;
};

type FetchRequest = {
  requested_url?: string;
  final_url?: string;
  retrieved_date?: string;
  status?: string;
  crawl_permitted?: boolean;
  http_status?: number | null;
  cache_path?: string | null;
  error?: string | null;
};

export type CrawlEvidence = {
  requests: FetchRequest[];
  discoveredUrls: string[];
  jsShellUrls: string[];
};

export type GapSchool = {
  name: string;
  city: string | null;
  score: number;
  missing: Array<{ field: string; action: GapAction }>;
  admissionsUrl: string | null;
  admissionsEmail: string | null;
  highestImpactNextField: string;
};

const FIELD_KEYWORDS: Record<string, string[]> = {
  name: ["about", "contact"],
  "location.city": ["contact", "campus", "about"],
  "location.address": ["contact", "campus", "location", "about"],
  curricula: ["curriculum", "academic", "programme", "program"],
  age_range: ["admission", "grade", "year", "programme", "program"],
  accreditations: ["accredit", "authori", "membership", "about"],
  "fees.by_year_group": ["fee", "tuition", "admission"],
  "languages.instruction": ["language", "curriculum", "academic", "programme", "program"],
  "contact.website": ["home", "about", "contact"],
};

const IMPACT_ORDER = [
  "fees.by_year_group",
  "curricula",
  "age_range",
  "accreditations",
  "languages.instruction",
  "location.address",
  "contact.website",
  "location.city",
  "name",
];

function isPopulated(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.values(value as JsonObject).some(isPopulated);
  return true;
}

export function isCoreFieldPopulated(record: SchoolRecord, field: string): boolean {
  const value = getAtPath(record, field);
  if (field === "age_range") {
    const range = value as { min?: unknown; max?: unknown } | undefined;
    return Boolean(range && isPopulated(range.min) && isPopulated(range.max));
  }
  if (field === "fees.by_year_group") {
    const rows = Array.isArray(value) ? value : [];
    return rows.some((row) => isPopulated((row as JsonObject).tuition));
  }
  return isPopulated(value);
}

export function missingCoreFields(record: SchoolRecord): string[] {
  return CORE_FIELD_PATHS.filter((field) => !isCoreFieldPopulated(record, field));
}

export function highestImpactField(fields: string[]): string {
  return [...fields].sort((left, right) => {
    const leftRank = IMPACT_ORDER.indexOf(left);
    const rightRank = IMPACT_ORDER.indexOf(right);
    return (leftRank === -1 ? IMPACT_ORDER.length : leftRank) -
      (rightRank === -1 ? IMPACT_ORDER.length : rightRank);
  })[0] ?? "none";
}

export function sixMonthRetryDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const targetMonth = month - 1 + 6;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = targetMonth % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, normalizedMonth, Math.min(day, lastDay)))
    .toISOString()
    .slice(0, 10);
}

function validHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function uniqueUrls(values: unknown[]): string[] {
  return [...new Set(values.filter(validHttpUrl))].sort();
}

function orderedUniqueUrls(values: unknown[]): string[] {
  return [...new Set(values.filter(validHttpUrl))];
}

function normalizedHost(url: string): string {
  return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
}

function usefulDiscoveredUrl(url: string, allowedHosts: Set<string>): boolean {
  const parsed = new URL(url);
  if (!parsed.hostname.includes(".") || !allowedHosts.has(normalizedHost(url))) return false;
  return !/\.(?:css|js|mjs|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot)(?:$|[?#])/i.test(parsed.pathname);
}

function urlMatchesField(url: string, field: string): boolean {
  const lower = url.toLowerCase();
  return (FIELD_KEYWORDS[field] ?? []).some((keyword) => lower.includes(keyword));
}

function recordUrls(record: SchoolRecord): string[] {
  const contact = record.contact as JsonObject;
  return uniqueUrls([
    contact.admissions_url,
    contact.website,
    ...Object.values(record.provenance).flatMap((entry) => [
      entry.source_url,
      ...entry.candidates.map((candidate) => candidate.source_url),
    ]),
  ]);
}

export function candidateUrlsForField(
  field: string,
  record: SchoolRecord,
  evidence: CrawlEvidence,
): string[] {
  const trackedUrls = recordUrls(record);
  const requestUrls = orderedUniqueUrls(
    evidence.requests.flatMap((request) => [request.requested_url, request.final_url]),
  );
  const allowedHosts = new Set([...trackedUrls, ...requestUrls].map(normalizedHost));
  const discoveredUrls = evidence.discoveredUrls.filter((url) => usefulDiscoveredUrl(url, allowedHosts));
  const all = orderedUniqueUrls([...discoveredUrls, ...trackedUrls, ...requestUrls]);
  const matched = all.filter((url) => urlMatchesField(url, field));
  const admissionsUrl = (record.contact as JsonObject).admissions_url;
  const website = (record.contact as JsonObject).website;
  return orderedUniqueUrls([
    ...matched,
    ...(validHttpUrl(admissionsUrl) ? [admissionsUrl] : []),
    ...(validHttpUrl(website) ? [website] : []),
    ...all,
  ]).slice(0, 3);
}

function markdownUrls(urls: string[]): string {
  return urls.map((url) => `<${url}>`).join(", ");
}

function exactBlocker(request: FetchRequest): string | null {
  if (typeof request.error === "string" && request.error.trim()) return request.error.trim();
  if (request.status && request.status !== "fetched") {
    return request.http_status ? `${request.status}: HTTP ${request.http_status}` : request.status;
  }
  return null;
}

function successfulDates(requests: FetchRequest[]): string[] {
  return [...new Set(requests
    .filter((request) => request.status === "fetched" && typeof request.retrieved_date === "string")
    .map((request) => request.retrieved_date as string))].sort();
}

export function classifyGapAction(
  field: string,
  record: SchoolRecord,
  evidence: CrawlEvidence,
  reportDate: string,
): GapAction {
  const candidates = candidateUrlsForField(field, record, evidence);
  const relevantRequests = evidence.requests.filter((request) =>
    [request.requested_url, request.final_url].some((url) => validHttpUrl(url) && urlMatchesField(url, field)),
  );
  const requests = relevantRequests.length > 0 ? relevantRequests : evidence.requests;
  const failed = [...requests].reverse().find((request) => request.status !== "fetched");
  const email = (record.contact as JsonObject).email;
  const blocker = failed ? exactBlocker(failed) : null;
  if (blocker && typeof email === "string" && email.trim()) {
    return { tag: "EMAIL", detail: `blocker: \`${blocker.replaceAll("`", "'")}\`` };
  }

  const jsUrl = candidates.find((url) => evidence.jsShellUrls.includes(url)) ??
    evidence.jsShellUrls.find((url) => requests.some((request) => request.final_url === url || request.requested_url === url));
  if (jsUrl) {
    return {
      tag: "JS",
      detail: `headless-browser note: render <${jsUrl}> with Playwright/Chromium before extracting \`${field}\``,
    };
  }

  const fetchedUrls = new Set(evidence.requests
    .filter((request) => request.status === "fetched")
    .flatMap((request) => [request.requested_url, request.final_url])
    .filter(validHttpUrl));
  const unfetchedCandidates = candidates.filter((url) => !fetchedUrls.has(url));
  if (unfetchedCandidates.length > 0) {
    return { tag: "SEARCH", detail: `candidate URLs: ${markdownUrls(unfetchedCandidates)}` };
  }

  const dates = successfulDates(requests);
  if (dates.length >= 2) {
    return {
      tag: "UNPUBLISHED",
      detail: `repeated successful crawls: ${dates.join(", ")}; retry: ${sixMonthRetryDate(reportDate)}`,
    };
  }

  return {
    tag: "SEARCH",
    detail: `candidate URLs: ${markdownUrls(candidates.length > 0 ? candidates : recordUrls(record))}`,
  };
}

function htmlLooksLikeJsShell(html: string): boolean {
  const scriptCount = (html.match(/<script\b/gi) ?? []).length;
  const visible = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return scriptCount >= 3 && visible.length < 400;
}

function linksFromHtml(html: string, baseUrl: string): string[] {
  const urls: string[] = [];
  const matcher = /\bhref\s*=\s*["']([^"'#]+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(html)) !== null) {
    try {
      const url = new URL(match[1], baseUrl);
      if (url.protocol === "http:" || url.protocol === "https:") {
        url.hash = "";
        urls.push(url.href);
      }
    } catch {
      // Ignore malformed links in fetched school HTML.
    }
  }
  return uniqueUrls(urls);
}

async function jsonFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return jsonFiles(absolute);
    return entry.isFile() && entry.name.endsWith(".json") ? [absolute] : [];
  }));
  return nested.flat().sort();
}

async function loadCrawlEvidence(rawRoot: string, country: string, slug: string): Promise<CrawlEvidence> {
  const schoolDirectory = path.join(rawRoot, country, slug);
  let entries;
  try {
    entries = await readdir(schoolDirectory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { requests: [], discoveredUrls: [], jsShellUrls: [] };
    }
    throw error;
  }

  const requests: FetchRequest[] = [];
  const fetchLogs = entries
    .filter((item) => item.isFile() && item.name.endsWith(".fetch.json"))
    .sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of fetchLogs) {
    const log = JSON.parse(await readFile(path.join(schoolDirectory, entry.name), "utf8")) as {
      retrieved_date?: string;
      requests?: FetchRequest[];
    };
    for (const request of log.requests ?? []) {
      requests.push({ ...request, retrieved_date: request.retrieved_date ?? log.retrieved_date });
    }
  }
  requests.sort((left, right) =>
    (left.retrieved_date ?? "").localeCompare(right.retrieved_date ?? "") ||
      (left.requested_url ?? "").localeCompare(right.requested_url ?? "") ||
      (left.status ?? "").localeCompare(right.status ?? ""),
  );

  const discoveredUrls: string[] = [];
  const jsShellUrls: string[] = [];
  const rawRootResolved = path.resolve(rawRoot);
  for (const request of requests.filter((item) => item.status === "fetched" && item.cache_path)) {
    const cachePath = path.resolve(request.cache_path as string);
    if (cachePath !== rawRootResolved && !cachePath.startsWith(`${rawRootResolved}${path.sep}`)) continue;
    try {
      const html = await readFile(cachePath, "utf8");
      const baseUrl = request.final_url ?? request.requested_url;
      if (!validHttpUrl(baseUrl)) continue;
      discoveredUrls.push(...linksFromHtml(html, baseUrl));
      if (htmlLooksLikeJsShell(html)) jsShellUrls.push(baseUrl);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  return {
    requests,
    discoveredUrls: uniqueUrls(discoveredUrls),
    jsShellUrls: uniqueUrls(jsShellUrls),
  };
}

export function rankGapSchools(schools: GapSchool[]): GapSchool[] {
  return [...schools].sort((left, right) =>
    (8 - left.score) - (8 - right.score) || left.name.localeCompare(right.name),
  );
}

function displayValue(value: string | null): string {
  return value?.trim() ? value : "Not published";
}

export function renderGapReport(
  schools: GapSchool[],
  reportDate: string,
  checkedCount: number,
  invalidCount: number,
): string {
  const ranked = rankGapSchools(schools);
  const actionTotals = new Map<ActionTag, number>([
    ["SEARCH", 0],
    ["EMAIL", 0],
    ["JS", 0],
    ["UNPUBLISHED", 0],
  ]);
  for (const school of ranked) {
    for (const missing of school.missing) {
      actionTotals.set(missing.action.tag, (actionTotals.get(missing.action.tag) ?? 0) + 1);
    }
  }

  const lines = [
    `# World School Index gap report — ${reportDate}`,
    "",
    `Scope: ${checkedCount} school records checked; ${invalidCount} schema-invalid record(s) excluded; ${ranked.length} schema-valid, non-indexable school(s) included.`,
    "",
    "Ranking: `8 - completeness_score` ascending, then school name.",
    "",
  ];

  ranked.forEach((school, index) => {
    lines.push(
      `## ${index + 1}. ${school.name}`,
      "",
      `- City: ${displayValue(school.city)}`,
      `- Completeness score: ${school.score}/9`,
      `- Gap to index threshold: ${8 - school.score}`,
      "- Missing core fields:",
      ...school.missing.map(({ field, action }) => `  - \`${field}\` — **${action.tag}** — ${action.detail}`),
      `- Admissions URL: ${school.admissionsUrl ? `<${school.admissionsUrl}>` : "Not published"}`,
      `- Admissions email: ${displayValue(school.admissionsEmail)}`,
      `- Highest-impact next field: \`${school.highestImpactNextField}\``,
      "",
    );
  });

  lines.push(
    "## Totals",
    "",
    `- Schools one field from threshold: ${ranked.filter((school) => 8 - school.score === 1).length}`,
    `- Schools two fields from threshold: ${ranked.filter((school) => 8 - school.score === 2).length}`,
    "- Missing fields by action:",
    ...(["SEARCH", "EMAIL", "JS", "UNPUBLISHED"] as ActionTag[])
      .map((tag) => `  - ${tag}: ${actionTotals.get(tag) ?? 0}`),
    "",
  );
  return lines.join("\n");
}

function parseDateArgument(argv: string[]): string {
  const index = argv.indexOf("--date");
  const date = index === -1 ? new Date().toLocaleDateString("en-CA") : argv[index + 1];
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new Error("--date must be a valid ISO date (YYYY-MM-DD)");
  }
  return date;
}

export async function generateGapReport(reportDate: string): Promise<string> {
  const schoolsRoot = path.resolve("data", "schools");
  const rawRoot = path.resolve("data", "raw");
  const files = await jsonFiles(schoolsRoot);
  const schools: GapSchool[] = [];
  let invalidCount = 0;

  for (const file of files) {
    const record = JSON.parse(await readFile(file, "utf8")) as SchoolRecord;
    const errors = await validateSchoolRecord(record);
    if (errors.length > 0) {
      invalidCount += 1;
      continue;
    }
    if (record.indexable) continue;

    const relative = path.relative(schoolsRoot, file);
    const country = relative.split(path.sep)[0];
    const slug = path.basename(file, ".json");
    const evidence = await loadCrawlEvidence(rawRoot, country, slug);
    const missing = missingCoreFields(record);
    const contact = record.contact as JsonObject;
    schools.push({
      name: record.name as string,
      city: ((record.location as JsonObject).city as string | null) ?? null,
      score: record.completeness_score,
      missing: missing.map((field) => ({
        field,
        action: classifyGapAction(field, record, evidence, reportDate),
      })),
      admissionsUrl: (contact.admissions_url as string | null) ?? null,
      admissionsEmail: (contact.email as string | null) ?? null,
      highestImpactNextField: highestImpactField(missing),
    });
  }

  return renderGapReport(schools, reportDate, files.length, invalidCount);
}

async function main(): Promise<void> {
  const reportDate = parseDateArgument(process.argv.slice(2));
  const output = path.resolve("reports", `gaps-${reportDate}.md`);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, await generateGapReport(reportDate), "utf8");
  console.log(`Gap report: ${path.relative(process.cwd(), output).replaceAll("\\", "/")}`);
}

if (path.basename(process.argv[1] ?? "") === "gap-report.ts") {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
