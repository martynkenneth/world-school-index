import { readFile } from "node:fs/promises";
import Ajv2020, { type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";

export type JsonObject = Record<string, unknown>;

export type ProvenanceEntry = {
  source_url: string;
  retrieved_date: string;
  evidence: string;
  method: "published" | "manual" | "conflict";
  conflict: boolean;
  candidates: Array<{
    value: unknown;
    source_url: string;
    retrieved_date: string;
    evidence: string;
  }>;
};

export type SchoolRecord = JsonObject & {
  id: string;
  provenance: Record<string, ProvenanceEntry>;
  completeness_score: number;
  indexable: boolean;
  last_verified: string | null;
};

export const CORE_FIELD_PATHS = [
  "name",
  "location.city",
  "location.address",
  "curricula",
  "age_range",
  "accreditations",
  "fees.by_year_group",
  "enrolment.total",
  "staffing.teacher_student_ratio",
  "languages.instruction",
  "contact.website",
  "admissions.open_days",
] as const;

const PROVENANCE_EXEMPT_PATHS = new Set([
  "id",
  "status",
  "fees.published",
  "completeness_score",
  "indexable",
  "last_verified",
]);

let compiledValidator: Promise<ValidateFunction> | undefined;

export function createEmptySchoolRecord(id: string, status: "active" | "closed" | "unverified"): SchoolRecord {
  return {
    id,
    name: "",
    former_names: [],
    status,
    location: {
      country: null,
      city: null,
      district: null,
      address: null,
      lat: null,
      lng: null,
    },
    founded: null,
    school_type: null,
    curricula: [],
    age_range: { min: null, max: null },
    year_groups: [],
    accreditations: [],
    fees: {
      published: false,
      currency: null,
      academic_year: null,
      fee_basis: null,
      by_year_group: [],
      additional: {
        application: null,
        enrolment: null,
        capital_levy: null,
        bus: null,
        lunch: null,
        uniform: null,
      },
      sibling_discount: null,
      early_payment_discount: null,
    },
    enrolment: {
      total: null,
      nationalities_count: null,
      largest_nationality: null,
      largest_nationality_pct: null,
    },
    staffing: {
      teacher_student_ratio: null,
      avg_class_size: null,
      expat_teacher_pct: null,
    },
    languages: {
      instruction: [],
      offered: [],
      eal_provision: {
        offered: null,
        model: null,
        additional_cost: null,
      },
    },
    outcomes: {
      ib_average: null,
      ib_year: null,
      igcse_a_star_a_pct: null,
      university_destinations: [],
    },
    admissions: {
      open_days: [],
      application_deadline: null,
      assessment_required: null,
      waitlist: null,
    },
    facilities: [],
    contact: {
      website: null,
      admissions_url: null,
      phone: null,
      email: null,
    },
    provenance: {},
    completeness_score: 0,
    indexable: false,
    last_verified: null,
  };
}

function parsePath(path: string): Array<string | number> {
  const parts: Array<string | number> = [];
  const matcher = /([^[.\]]+)|\[([0-9]+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(path)) !== null) {
    parts.push(match[1] ?? Number(match[2]));
  }
  if (parts.length === 0 || parts.map(String).join("") === "") {
    throw new Error(`Invalid field path: ${path}`);
  }
  return parts;
}

export function getAtPath(root: unknown, path: string): unknown {
  let current = root;
  for (const segment of parsePath(path)) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string | number, unknown>)[segment];
  }
  return current;
}

export function setAtPath(root: JsonObject, path: string, value: unknown): void {
  const parts = parsePath(path);
  let current: Record<string | number, unknown> = root;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const segment = parts[index];
    const nextSegment = parts[index + 1];
    const existing = current[segment];
    if (existing === null || typeof existing !== "object") {
      current[segment] = typeof nextSegment === "number" ? [] : {};
    }
    current = current[segment] as Record<string | number, unknown>;
  }
  current[parts.at(-1)!] = value;
}

function isPopulated(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") {
    return Object.values(value as JsonObject).some(isPopulated);
  }
  return true;
}

export function computeCompletenessScore(record: SchoolRecord): number {
  return CORE_FIELD_PATHS.reduce((score, path) => {
    const value = getAtPath(record, path);
    if (path === "age_range") {
      const range = value as { min?: unknown; max?: unknown } | undefined;
      return score + (range && isPopulated(range.min) && isPopulated(range.max) ? 1 : 0);
    }
    if (path === "fees.by_year_group") {
      const rows = Array.isArray(value) ? value : [];
      return score + (rows.some((row) => isPopulated((row as JsonObject).tuition)) ? 1 : 0);
    }
    return score + (isPopulated(value) ? 1 : 0);
  }, 0);
}

function hasPublishedFees(record: SchoolRecord): boolean {
  const fees = record.fees as JsonObject;
  const byYearGroup = fees.by_year_group as JsonObject[];
  const additional = fees.additional as JsonObject;
  return (
    byYearGroup.some((row) => isPopulated(row.tuition)) ||
    Object.values(additional).some(isPopulated) ||
    isPopulated(fees.sibling_discount) ||
    isPopulated(fees.early_payment_discount)
  );
}

export function finalizeDerivedFields(record: SchoolRecord): SchoolRecord {
  const score = computeCompletenessScore(record);
  record.completeness_score = score;
  record.indexable = score >= 8;
  (record.fees as JsonObject).published = hasPublishedFees(record);
  const dates = Object.values(record.provenance).map((entry) => entry.retrieved_date).sort();
  record.last_verified = dates.at(-1) ?? null;
  return record;
}

function collectPopulatedLeaves(value: unknown, path: string, output: Map<string, unknown>): void {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectPopulatedLeaves(item, `${path}[${index}]`, output));
    return;
  }
  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value as JsonObject)) {
      const childPath = path ? `${path}.${key}` : key;
      if (childPath === "provenance") continue;
      collectPopulatedLeaves(child, childPath, output);
    }
    return;
  }
  if (PROVENANCE_EXEMPT_PATHS.has(path)) return;
  if (typeof value === "string" && value.trim().length === 0) return;
  output.set(path, value);
}

export function populatedEvidenceFields(record: SchoolRecord): Map<string, unknown> {
  const fields = new Map<string, unknown>();
  collectPopulatedLeaves(record, "", fields);
  return fields;
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function countWords(value: string): number {
  const normalized = normalizeWhitespace(value);
  return normalized ? normalized.split(" ").length : 0;
}

function literalValue(value: unknown): string {
  if (typeof value === "string") return normalizeWhitespace(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  throw new Error(`Unsupported evidence value type: ${typeof value}`);
}

export function assertValueAppearsInEvidence(path: string, value: unknown, evidence: string): void {
  const literal = literalValue(value);
  if (!normalizeWhitespace(evidence).includes(literal)) {
    throw new Error(`${path}: value ${JSON.stringify(literal)} does not appear literally in its evidence`);
  }
}

function formatAjvErrors(errors: ErrorObject[] | null | undefined): string[] {
  return (errors ?? []).map((error) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`);
}

async function getSchemaValidator(): Promise<ValidateFunction> {
  compiledValidator ??= (async () => {
    const schemaUrl = new URL("../../schema/school.schema.json", import.meta.url);
    const schema = JSON.parse(await readFile(schemaUrl, "utf8"));
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    return ajv.compile(schema);
  })();
  return compiledValidator;
}

export async function validateSchoolRecord(record: SchoolRecord): Promise<string[]> {
  const errors: string[] = [];
  const validate = await getSchemaValidator();
  if (!validate(record)) errors.push(...formatAjvErrors(validate.errors));

  const fields = populatedEvidenceFields(record);
  for (const [path, value] of fields) {
    const provenance = record.provenance[path];
    if (!provenance) {
      errors.push(`${path}: populated field is missing provenance`);
      continue;
    }
    const words = countWords(provenance.evidence);
    if (words > 25) errors.push(`${path}: evidence has ${words} words; maximum is 25`);
    try {
      assertValueAppearsInEvidence(path, value, provenance.evidence);
    } catch (error) {
      errors.push((error as Error).message);
    }
  }

  for (const path of Object.keys(record.provenance)) {
    const provenance = record.provenance[path];
    if (provenance.method === "conflict") {
      if (getAtPath(record, path) !== null) {
        errors.push(`${path}: conflicting values must leave the field null until human resolution`);
      }
      for (const [index, candidate] of provenance.candidates.entries()) {
        const words = countWords(candidate.evidence);
        if (words > 25) errors.push(`${path}: conflict candidate ${index + 1} evidence has ${words} words; maximum is 25`);
        try {
          assertValueAppearsInEvidence(`${path} candidate ${index + 1}`, candidate.value, candidate.evidence);
        } catch (error) {
          errors.push((error as Error).message);
        }
      }
      continue;
    }
    if (!fields.has(path)) errors.push(`${path}: provenance points to an empty or unknown field`);
  }

  const expectedScore = computeCompletenessScore(record);
  if (record.completeness_score !== expectedScore) {
    errors.push(`completeness_score: expected ${expectedScore}, received ${record.completeness_score}`);
  }
  const expectedIndexable = expectedScore >= 8;
  if (record.indexable !== expectedIndexable) {
    errors.push(`indexable: expected ${expectedIndexable} for completeness score ${expectedScore}`);
  }
  const expectedFeesPublished = hasPublishedFees(record);
  if ((record.fees as JsonObject).published !== expectedFeesPublished) {
    errors.push(`fees.published: expected ${expectedFeesPublished}`);
  }
  const expectedLastVerified = Object.values(record.provenance)
    .map((entry) => entry.retrieved_date)
    .sort()
    .at(-1) ?? null;
  if (record.last_verified !== expectedLastVerified) {
    errors.push(`last_verified: expected ${expectedLastVerified}, received ${record.last_verified}`);
  }
  return errors;
}

export async function assertValidSchoolRecord(record: SchoolRecord): Promise<void> {
  const errors = await validateSchoolRecord(record);
  if (errors.length > 0) {
    throw new Error(`School record failed validation:\n- ${errors.join("\n- ")}`);
  }
}
