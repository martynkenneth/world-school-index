import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  assertValidSchoolRecord,
  assertValueAppearsInEvidence,
  countWords,
  createEmptySchoolRecord,
  finalizeDerivedFields,
  normalizeWhitespace,
  setAtPath,
  type JsonObject,
  type ProvenanceEntry,
} from "./lib/school-record.ts";

type FetchRequest = {
  requested_url: string;
  final_url: string | null;
  retrieved_date: string;
  status: "fetched" | "unfetched" | "blocked";
  crawl_permitted: boolean;
  http_status: number | null;
  cache_path: string | null;
};

type FetchLog = { requests: FetchRequest[] };

type ExtractionClaim = {
  path: string;
  value: unknown;
  source_url?: string;
  retrieved_date?: string;
  evidence?: string;
  method?: "published" | "manual" | "conflict";
  conflict?: boolean;
  candidates?: ProvenanceEntry["candidates"];
};

type ExtractionManifest = {
  id: string;
  status: "active" | "closed" | "unverified";
  fetch_log?: string;
  output: string;
  claims: ExtractionClaim[];
};

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    hellip: "…",
    ldquo: "“",
    lsquo: "‘",
    lt: "<",
    nbsp: " ",
    ndash: "–",
    quot: '"',
    rdquo: "”",
    rsquo: "’",
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, token: string) => {
    if (token.startsWith("#x")) return String.fromCodePoint(Number.parseInt(token.slice(2), 16));
    if (token.startsWith("#")) return String.fromCodePoint(Number.parseInt(token.slice(1), 10));
    return named[token.toLowerCase()] ?? entity;
  });
}

export function htmlToVisibleText(html: string): string {
  return normalizeWhitespace(decodeHtmlEntities(html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")));
}

function hydrateStructuredArrays(record: JsonObject): void {
  const accreditations = record.accreditations as JsonObject[];
  record.accreditations = accreditations.map((item) => ({
    body: item.body ?? "",
    status: item.status ?? null,
    granted: item.granted ?? null,
    expires: item.expires ?? null,
  }));
  const fees = record.fees as JsonObject;
  fees.by_year_group = (fees.by_year_group as JsonObject[]).map((item) => ({
    label: item.label ?? "",
    tuition: item.tuition ?? null,
  }));
}

function findFetchedSource(log: FetchLog, claim: ExtractionClaim): FetchRequest {
  if (!claim.source_url || !claim.retrieved_date) {
    throw new Error(`${claim.path}: source URL and retrieval date are required`);
  }
  const request = log.requests.find((item) =>
    item.retrieved_date === claim.retrieved_date &&
    (item.requested_url === claim.source_url || item.final_url === claim.source_url));
  if (!request) throw new Error(`${claim.path}: source is not present in the fetch log`);
  if (request.status !== "fetched" || !request.crawl_permitted || request.http_status !== 200 || !request.cache_path) {
    throw new Error(`${claim.path}: source was not successfully fetched with crawl permission`);
  }
  return request;
}

export async function extractFromManifest(manifestPath: string): Promise<string> {
  const manifest = JSON.parse(await readFile(path.resolve(manifestPath), "utf8")) as ExtractionManifest;
  const fetchLog = manifest.fetch_log
    ? JSON.parse(await readFile(path.resolve(manifest.fetch_log), "utf8")) as FetchLog
    : { requests: [] };
  const record = createEmptySchoolRecord(manifest.id, manifest.status);
  const seenPaths = new Set<string>();
  const visibleTextCache = new Map<string, string>();

  for (const claim of manifest.claims) {
    if (seenPaths.has(claim.path)) throw new Error(`${claim.path}: duplicate extraction claim`);
    seenPaths.add(claim.path);
    if (["id", "status", "provenance", "completeness_score", "indexable", "last_verified", "fees.published"]
      .some((pathPrefix) => claim.path === pathPrefix || claim.path.startsWith(`${pathPrefix}.`))) {
      throw new Error(`${claim.path}: field is derived or managed by the pipeline`);
    }
    if (claim.path === "contact.website") {
      if (typeof claim.value !== "string") throw new Error("contact.website: a school homepage URL is required");
      let homepage: URL;
      try {
        homepage = new URL(claim.value);
      } catch {
        throw new Error("contact.website: invalid school homepage URL");
      }
      if (!["http:", "https:"].includes(homepage.protocol) || homepage.username || homepage.password) {
        throw new Error("contact.website: a public HTTP(S) school homepage URL is required");
      }
      setAtPath(record, claim.path, claim.value);
      continue;
    }
    if (!claim.source_url || !claim.retrieved_date || !claim.evidence) {
      throw new Error(`${claim.path}: source URL, retrieval date, and evidence are required`);
    }
    if (countWords(claim.evidence) > 25) throw new Error(`${claim.path}: evidence exceeds 25 words`);
    const source = findFetchedSource(fetchLog, claim);
    let visibleText = visibleTextCache.get(source.cache_path!);
    if (!visibleText) {
      visibleText = htmlToVisibleText(await readFile(path.resolve(source.cache_path!), "utf8"));
      visibleTextCache.set(source.cache_path!, visibleText);
    }
    const evidence = normalizeWhitespace(claim.evidence);
    if (!visibleText.includes(evidence)) {
      throw new Error(`${claim.path}: evidence is not a verbatim snippet of the fetched page`);
    }
    const method = claim.method ?? "published";
    if (method === "conflict") {
      if (claim.value !== null || claim.conflict !== true || !claim.candidates || claim.candidates.length < 2) {
        throw new Error(`${claim.path}: conflicts require a null field value, conflict true, and at least two candidates`);
      }
      for (const [index, candidate] of claim.candidates.entries()) {
        if (countWords(candidate.evidence) > 25) {
          throw new Error(`${claim.path}: conflict candidate ${index + 1} evidence exceeds 25 words`);
        }
        const candidateClaim: ExtractionClaim = {
          path: claim.path,
          value: candidate.value,
          source_url: candidate.source_url,
          retrieved_date: candidate.retrieved_date,
          evidence: candidate.evidence,
        };
        const candidateSource = findFetchedSource(fetchLog, candidateClaim);
        let candidateText = visibleTextCache.get(candidateSource.cache_path!);
        if (!candidateText) {
          candidateText = htmlToVisibleText(await readFile(path.resolve(candidateSource.cache_path!), "utf8"));
          visibleTextCache.set(candidateSource.cache_path!, candidateText);
        }
        const candidateEvidence = normalizeWhitespace(candidate.evidence);
        if (!candidateText.includes(candidateEvidence)) {
          throw new Error(`${claim.path}: conflict candidate ${index + 1} evidence is not on its fetched page`);
        }
        assertValueAppearsInEvidence(`${claim.path} candidate ${index + 1}`, candidate.value, candidateEvidence);
      }
    } else {
      assertValueAppearsInEvidence(claim.path, claim.value, evidence);
    }
    setAtPath(record, claim.path, claim.value);
    record.provenance[claim.path] = {
      source_url: claim.source_url,
      retrieved_date: claim.retrieved_date,
      evidence,
      method,
      conflict: claim.conflict ?? false,
      candidates: claim.candidates ?? [],
    };
  }

  hydrateStructuredArrays(record);
  finalizeDerivedFields(record);
  await assertValidSchoolRecord(record);
  const outputPath = path.resolve(manifest.output);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return manifest.output;
}

async function run(): Promise<void> {
  const manifestIndex = process.argv.indexOf("--manifest");
  const manifestPath = manifestIndex >= 0 ? process.argv[manifestIndex + 1] : undefined;
  if (!manifestPath) throw new Error("Usage: npm run data:extract -- --manifest <manifest.json>");
  const output = await extractFromManifest(manifestPath);
  console.log(`Extracted schema-valid record: ${output}`);
}

if (process.argv.includes("--manifest")) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
