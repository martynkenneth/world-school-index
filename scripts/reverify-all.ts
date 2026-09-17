import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { htmlToVisibleText } from "./extract.ts";
import { runFetch } from "./fetch.ts";
import {
  finalizeDerivedFields,
  normalizeWhitespace,
  type ProvenanceEntry,
  type SchoolRecord,
} from "./lib/school-record.ts";

type FetchRequest = {
  requested_url: string;
  final_url: string | null;
  retrieved_date: string;
  status: "fetched" | "unfetched" | "blocked";
  crawl_permitted: boolean;
  http_status: number | null;
  cache_path: string | null;
  error: string | null;
};

type FetchLog = { requests: FetchRequest[] };

type VerificationIssue = {
  field: string;
  source_url: string;
  result: "blocked" | "unfetched" | "evidence_changed";
  http_status: number | null;
  detail: string | null;
};

type SchoolResult = {
  id: string;
  country: string;
  slug: string;
  previous_last_verified: string | null;
  last_verified: string | null;
  sources_checked: number;
  sources_fetched: number;
  fields_refreshed: number;
  candidates_refreshed: number;
  issues: VerificationIssue[];
};

const ROOT = path.resolve("data", "schools");
const TODAY = new Date().toISOString().slice(0, 10);

async function listRecordPaths(): Promise<string[]> {
  const countries = (await readdir(ROOT, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const records: string[] = [];
  for (const country of countries) {
    const directory = path.join(ROOT, country);
    const filenames = (await readdir(directory))
      .filter((filename) => filename.endsWith(".json"))
      .sort();
    records.push(...filenames.map((filename) => path.join(directory, filename)));
  }
  return records;
}

function sourceUrls(record: SchoolRecord): string[] {
  const urls = new Set<string>();
  for (const provenance of Object.values(record.provenance)) {
    if (provenance.source_url.startsWith("https://")) urls.add(provenance.source_url);
    for (const candidate of provenance.candidates) {
      if (candidate.source_url.startsWith("https://")) urls.add(candidate.source_url);
    }
  }
  return [...urls].sort();
}

function requestFor(log: FetchLog, sourceUrl: string): FetchRequest | undefined {
  return log.requests.find((request) =>
    request.requested_url === sourceUrl || request.final_url === sourceUrl);
}

async function evidenceStillVisible(
  request: FetchRequest,
  evidence: string,
  cache: Map<string, string>,
): Promise<boolean> {
  if (request.status !== "fetched" || !request.crawl_permitted || request.http_status !== 200 || !request.cache_path) {
    return false;
  }
  let visibleText = cache.get(request.cache_path);
  if (!visibleText) {
    visibleText = htmlToVisibleText(await readFile(path.resolve(request.cache_path), "utf8"));
    cache.set(request.cache_path, visibleText);
  }
  return visibleText.includes(normalizeWhitespace(evidence));
}

function issueFor(field: string, sourceUrl: string, request: FetchRequest | undefined): VerificationIssue {
  if (!request) {
    return {
      field,
      source_url: sourceUrl,
      result: "unfetched",
      http_status: null,
      detail: "Source URL was not present in the fetch log",
    };
  }
  return {
    field,
    source_url: sourceUrl,
    result: request.status === "blocked" ? "blocked" : "unfetched",
    http_status: request.http_status,
    detail: request.error,
  };
}

async function refreshProvenance(
  field: string,
  provenance: ProvenanceEntry,
  log: FetchLog,
  visibleTextCache: Map<string, string>,
  issues: VerificationIssue[],
): Promise<{ fields: number; candidates: number }> {
  let fields = 0;
  let candidates = 0;
  const request = requestFor(log, provenance.source_url);
  if (!request || request.status !== "fetched" || !request.crawl_permitted || request.http_status !== 200 || !request.cache_path) {
    issues.push(issueFor(field, provenance.source_url, request));
  } else if (await evidenceStillVisible(request, provenance.evidence, visibleTextCache)) {
    provenance.retrieved_date = TODAY;
    fields += 1;
  } else {
    issues.push({
      field,
      source_url: provenance.source_url,
      result: "evidence_changed",
      http_status: request.http_status,
      detail: "Stored evidence is no longer present verbatim in the fetched page",
    });
  }

  for (const [index, candidate] of provenance.candidates.entries()) {
    const candidateField = `${field} candidate ${index + 1}`;
    const candidateRequest = requestFor(log, candidate.source_url);
    if (!candidateRequest || candidateRequest.status !== "fetched" || !candidateRequest.crawl_permitted ||
      candidateRequest.http_status !== 200 || !candidateRequest.cache_path) {
      issues.push(issueFor(candidateField, candidate.source_url, candidateRequest));
    } else if (await evidenceStillVisible(candidateRequest, candidate.evidence, visibleTextCache)) {
      candidate.retrieved_date = TODAY;
      candidates += 1;
    } else {
      issues.push({
        field: candidateField,
        source_url: candidate.source_url,
        result: "evidence_changed",
        http_status: candidateRequest.http_status,
        detail: "Stored conflict evidence is no longer present verbatim in the fetched page",
      });
    }
  }
  return { fields, candidates };
}

async function reverifyRecord(recordPath: string): Promise<SchoolResult> {
  const country = path.basename(path.dirname(recordPath));
  const slug = path.basename(recordPath, ".json");
  const record = JSON.parse(await readFile(recordPath, "utf8")) as SchoolRecord;
  const urls = sourceUrls(record);
  const previousLastVerified = record.last_verified;

  if (urls.length === 0) {
    return {
      id: record.id,
      country,
      slug,
      previous_last_verified: previousLastVerified,
      last_verified: record.last_verified,
      sources_checked: 0,
      sources_fetched: 0,
      fields_refreshed: 0,
      candidates_refreshed: 0,
      issues: [],
    };
  }

  await runFetch(["--country", country, "--slug", slug, ...urls]);
  const logPath = path.resolve("data", "raw", country, slug, `${TODAY}.fetch.json`);
  const log = JSON.parse(await readFile(logPath, "utf8")) as FetchLog;
  const visibleTextCache = new Map<string, string>();
  const issues: VerificationIssue[] = [];
  let fieldsRefreshed = 0;
  let candidatesRefreshed = 0;

  for (const [field, provenance] of Object.entries(record.provenance)) {
    const refreshed = await refreshProvenance(field, provenance, log, visibleTextCache, issues);
    fieldsRefreshed += refreshed.fields;
    candidatesRefreshed += refreshed.candidates;
  }

  finalizeDerivedFields(record);
  if (fieldsRefreshed > 0 || candidatesRefreshed > 0) {
    await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  }
  return {
    id: record.id,
    country,
    slug,
    previous_last_verified: previousLastVerified,
    last_verified: record.last_verified,
    sources_checked: urls.length,
    sources_fetched: log.requests.filter((request) => request.status === "fetched").length,
    fields_refreshed: fieldsRefreshed,
    candidates_refreshed: candidatesRefreshed,
    issues,
  };
}

async function run(): Promise<void> {
  const countryIndex = process.argv.indexOf("--country");
  const countryFilter = countryIndex >= 0 ? process.argv[countryIndex + 1] : undefined;
  const startIndex = process.argv.indexOf("--start-at");
  const startAt = startIndex >= 0 ? process.argv[startIndex + 1] : undefined;
  const limitIndex = process.argv.indexOf("--limit");
  const parsedLimit = limitIndex >= 0 ? Number(process.argv[limitIndex + 1]) : Number.POSITIVE_INFINITY;
  if (!Number.isInteger(parsedLimit) && parsedLimit !== Number.POSITIVE_INFINITY) {
    throw new Error("--limit must be a positive integer");
  }

  let records = await listRecordPaths();
  if (countryFilter) records = records.filter((recordPath) => path.basename(path.dirname(recordPath)) === countryFilter);
  if (startAt) records = records.filter((recordPath) => path.basename(recordPath, ".json") >= startAt);
  records = records.slice(0, parsedLimit);
  if (records.length === 0) throw new Error("No school records matched the requested filters");

  const results: SchoolResult[] = [];
  for (const [index, recordPath] of records.entries()) {
    console.log(`[${index + 1}/${records.length}] ${path.relative(ROOT, recordPath).replaceAll("\\", "/")}`);
    try {
      results.push(await reverifyRecord(recordPath));
    } catch (error) {
      const country = path.basename(path.dirname(recordPath));
      const slug = path.basename(recordPath, ".json");
      const record = JSON.parse(await readFile(recordPath, "utf8")) as SchoolRecord;
      results.push({
        id: record.id,
        country,
        slug,
        previous_last_verified: record.last_verified,
        last_verified: record.last_verified,
        sources_checked: sourceUrls(record).length,
        sources_fetched: 0,
        fields_refreshed: 0,
        candidates_refreshed: 0,
        issues: [{
          field: "*",
          source_url: "",
          result: "unfetched",
          http_status: null,
          detail: error instanceof Error ? error.message : String(error),
        }],
      });
    }
  }

  const reportPath = path.resolve("data", "automation", `global-reverification-${TODAY}.json`);
  const summary = {
    schema_version: "1.0",
    retrieved_date: TODAY,
    schools_checked: results.length,
    sources_checked: results.reduce((sum, result) => sum + result.sources_checked, 0),
    sources_fetched: results.reduce((sum, result) => sum + result.sources_fetched, 0),
    fields_refreshed: results.reduce((sum, result) => sum + result.fields_refreshed, 0),
    candidates_refreshed: results.reduce((sum, result) => sum + result.candidates_refreshed, 0),
    schools_with_issues: results.filter((result) => result.issues.length > 0).length,
    results,
  };
  await writeFile(reportPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(`Re-verification report: ${path.relative(process.cwd(), reportPath).replaceAll("\\", "/")}`);
  console.log(JSON.stringify({
    schools_checked: summary.schools_checked,
    sources_checked: summary.sources_checked,
    sources_fetched: summary.sources_fetched,
    fields_refreshed: summary.fields_refreshed,
    candidates_refreshed: summary.candidates_refreshed,
    schools_with_issues: summary.schools_with_issues,
  }));
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
