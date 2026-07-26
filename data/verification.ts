import bisHanoi from "./schools/vietnam/british-international-school-hanoi.json";
import bvisHanoi from "./schools/vietnam/british-vietnamese-international-school-hanoi.json";
import concordiaHanoi from "./schools/vietnam/concordia-international-school-hanoi.json";
import hanoiInternationalSchool from "./schools/vietnam/hanoi-international-school.json";
import lfayHanoi from "./schools/vietnam/lycee-francais-alexandre-yersin-hanoi.json";
import stPaulHanoi from "./schools/vietnam/st-paul-american-school-hanoi.json";
import unisHanoi from "./schools/vietnam/united-nations-international-school-hanoi.json";

type ProvenanceEntry = {
  conflict: boolean;
};

export type StrictSchoolRecord = {
  completeness_score: number;
  indexable: boolean;
  last_verified: string;
  age_range: { min: number | null; max: number | null };
  curricula: string[];
  accreditations: Array<{ body: string }>;
  languages: { instruction: string[] };
  school_type: string | null;
  founded: number | null;
  provenance: Record<string, ProvenanceEntry>;
};

const strictRecords: Record<string, StrictSchoolRecord> = {
  "british-international-school-hanoi": bisHanoi as StrictSchoolRecord,
  "british-vietnamese-international-school-hanoi": bvisHanoi as StrictSchoolRecord,
  "concordia-international-school-hanoi": concordiaHanoi as StrictSchoolRecord,
  "hanoi-international-school": hanoiInternationalSchool as StrictSchoolRecord,
  "lycee-francais-alexandre-yersin-hanoi": lfayHanoi as StrictSchoolRecord,
  "st-paul-american-school-hanoi": stPaulHanoi as StrictSchoolRecord,
  "united-nations-international-school-hanoi": unisHanoi as StrictSchoolRecord,
};

export function getStrictRecord(slug: string) {
  return strictRecords[slug];
}

export function getVerificationSummary(slug: string) {
  const record = getStrictRecord(slug);
  if (!record) {
    return {
      hasStrictRecord: false,
      completenessScore: 0,
      indexable: false,
      lastVerified: null,
      conflictCount: 0,
    };
  }

  return {
    hasStrictRecord: true,
    completenessScore: record.completeness_score,
    indexable: record.indexable,
    lastVerified: record.last_verified,
    conflictCount: Object.values(record.provenance).filter((entry) => entry.conflict).length,
  };
}

export type FieldVerificationState = "evidence-backed" | "conflict" | "pending";

export function getFieldVerificationState(
  slug: string,
  fieldPrefixes: string[],
): FieldVerificationState {
  const record = getStrictRecord(slug);
  if (!record) return "pending";

  const matches = Object.entries(record.provenance).filter(([key]) =>
    fieldPrefixes.some((prefix) => key === prefix || key.startsWith(`${prefix}[`) || key.startsWith(`${prefix}.`)),
  );

  if (matches.some(([, entry]) => entry.conflict)) return "conflict";
  return matches.length > 0 ? "evidence-backed" : "pending";
}
