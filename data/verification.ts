import bisHanoi from "./schools/vietnam/british-international-school-hanoi.json";
import bvisHanoi from "./schools/vietnam/british-vietnamese-international-school-hanoi.json";
import concordiaHanoi from "./schools/vietnam/concordia-international-school-hanoi.json";
import hanoiInternationalSchool from "./schools/vietnam/hanoi-international-school.json";
import lfayHanoi from "./schools/vietnam/lycee-francais-alexandre-yersin-hanoi.json";
import stPaulHanoi from "./schools/vietnam/st-paul-american-school-hanoi.json";
import unisHanoi from "./schools/vietnam/united-nations-international-school-hanoi.json";
import dwightHanoi from "./schools/vietnam/dwight-school-hanoi.json";
import fairmontVietnam from "./schools/vietnam/fairmont-international-school-vietnam.json";
import isphHanoi from "./schools/vietnam/international-school-parkcity-hanoi.json";
import reigateVietnam from "./schools/vietnam/reigate-grammar-school-vietnam.json";
import sisCiputra from "./schools/vietnam/singapore-international-school-ciputra.json";
import sisGamudaGardens from "./schools/vietnam/singapore-international-school-gamuda-gardens.json";
import sisVanPhuc from "./schools/vietnam/singapore-international-school-van-phuc.json";
import trueNorthHanoi from "./schools/vietnam/true-north-international-school.json";
import westlinkHanoi from "./schools/vietnam/westlink-international-school-hanoi.json";
import apuHcmc from "./schools/vietnam/apu-american-international-school-ho-chi-minh-city.json";
import aisVietnam from "./schools/vietnam/australian-international-school-vietnam.json";
import bisHcmc from "./schools/vietnam/british-international-school-ho-chi-minh-city.json";
import cisVietnam from "./schools/vietnam/canadian-international-school-vietnam.json";
import eisHcmc from "./schools/vietnam/european-international-school-ho-chi-minh-city.json";
import ishcmc from "./schools/vietnam/international-school-ho-chi-minh-city.json";
import ishcmcAmericanAcademy from "./schools/vietnam/ishcmc-american-academy.json";
import lfiDuras from "./schools/vietnam/lycee-francais-international-marguerite-duras.json";
import renaissanceSaigon from "./schools/vietnam/renaissance-international-school-saigon.json";
import ssis from "./schools/vietnam/saigon-south-international-school.json";
import abcInternationalSchool from "./schools/vietnam/abc-international-school-ho-chi-minh-city.json";
import theAmericanSchool from "./schools/vietnam/the-american-school-ho-chi-minh-city.json";
import apuDaNang from "./schools/vietnam/apu-american-international-school-da-nang.json";
import globalESchoolDaNang from "./schools/vietnam/global-e-school-da-nang.json";
import odysseyInternationalSchool from "./schools/vietnam/odyssey-international-school.json";
import sakuraOlympia from "./schools/vietnam/sakura-olympia-school-system.json";
import sisDaNang from "./schools/vietnam/singapore-international-school-da-nang.json";
import skyLineDaNang from "./schools/vietnam/sky-line-school-da-nang.json";
import stNicholasDaNang from "./schools/vietnam/st-nicholas-school-da-nang.json";
import ukAcademyDaNang from "./schools/vietnam/uk-academy-da-nang.json";
import bangkokPrep from "./schools/thailand/bangkok-international-preparatory-secondary-school.json";
import denlaBritishSchool from "./schools/thailand/denla-british-school.json";
import hamptonChaengwattana from "./schools/thailand/hampton-international-school-chaengwattana.json";
import internationalChristianSchoolNonthaburi from "./schools/thailand/international-christian-school-nonthaburi.json";
import internationalSchoolBangkok from "./schools/thailand/international-school-bangkok.json";
import knightsbridgeHouse from "./schools/thailand/knightsbridge-house-international-school-thailand.json";
import myisInternationalSchool from "./schools/thailand/myis-international-school.json";
import newAmericanChineseInternationalSchool from "./schools/thailand/new-american-chinese-international-school.json";
import risRatchapruek from "./schools/thailand/ruamrudee-international-school-ratchapruek.json";
import stAndrewsSamakee from "./schools/thailand/st-andrews-samakee-international-school.json";
import aisSingapore from "./schools/singapore/australian-international-school-singapore.json";
import cisSingapore from "./schools/singapore/canadian-international-school-singapore.json";
import dulwichSingapore from "./schools/singapore/dulwich-college-singapore.json";
import nexusSingapore from "./schools/singapore/nexus-international-school-singapore.json";
import sasSingapore from "./schools/singapore/singapore-american-school.json";
import stamfordSingapore from "./schools/singapore/stamford-american-international-school.json";
import tanglinSingapore from "./schools/singapore/tanglin-trust-school.json";
import uwcsea from "./schools/singapore/uwc-south-east-asia.json";
import asbGreenValley from "./schools/thailand/american-school-bangkok-green-valley.json";
import dPrep from "./schools/thailand/d-prep-international-school.json";
import thaiChineseInternationalSchool from "./schools/thailand/thai-chinese-international-school.json";
import tsiBearing from "./schools/thailand/tsi-international-school-bearing.json";

type ProvenanceEntry = {
  conflict: boolean;
  source_url: string;
  retrieved_date: string;
  evidence: string;
};

export type StrictSchoolRecord = {
  completeness_score: number;
  indexable: boolean;
  last_verified: string;
  age_range: { min: number | null; max: number | null };
  curricula: string[];
  year_groups: string[];
  accreditations: Array<{ body: string }>;
  languages: { instruction: string[] };
  school_type: string | null;
  founded: number | null;
  admissions: { open_days?: string[] };
  fees: {
    published: boolean;
    currency: string | null;
    academic_year: string | null;
    fee_basis: "year" | "term" | "month" | null;
    by_year_group: Array<{ programme?: string; label: string; tuition: string | null }>;
  };
  contact: { website: string | null };
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
  "dwight-school-hanoi": dwightHanoi as StrictSchoolRecord,
  "fairmont-international-school-vietnam": fairmontVietnam as StrictSchoolRecord,
  "international-school-parkcity-hanoi": isphHanoi as StrictSchoolRecord,
  "reigate-grammar-school-vietnam": reigateVietnam as StrictSchoolRecord,
  "singapore-international-school-ciputra": sisCiputra as StrictSchoolRecord,
  "singapore-international-school-gamuda-gardens": sisGamudaGardens as StrictSchoolRecord,
  "singapore-international-school-van-phuc": sisVanPhuc as StrictSchoolRecord,
  "true-north-international-school": trueNorthHanoi as StrictSchoolRecord,
  "westlink-international-school-hanoi": westlinkHanoi as StrictSchoolRecord,
  "apu-american-international-school-ho-chi-minh-city": apuHcmc as StrictSchoolRecord,
  "australian-international-school-vietnam": aisVietnam as StrictSchoolRecord,
  "british-international-school-ho-chi-minh-city": bisHcmc as StrictSchoolRecord,
  "canadian-international-school-vietnam": cisVietnam as StrictSchoolRecord,
  "european-international-school-ho-chi-minh-city": eisHcmc as StrictSchoolRecord,
  "international-school-ho-chi-minh-city": ishcmc as StrictSchoolRecord,
  "ishcmc-american-academy": ishcmcAmericanAcademy as StrictSchoolRecord,
  "lycee-francais-international-marguerite-duras": lfiDuras as StrictSchoolRecord,
  "renaissance-international-school-saigon": renaissanceSaigon as StrictSchoolRecord,
  "saigon-south-international-school": ssis as StrictSchoolRecord,
  "abc-international-school-ho-chi-minh-city": abcInternationalSchool as StrictSchoolRecord,
  "the-american-school-ho-chi-minh-city": theAmericanSchool as StrictSchoolRecord,
  "apu-american-international-school-da-nang": apuDaNang as StrictSchoolRecord,
  "global-e-school-da-nang": globalESchoolDaNang as StrictSchoolRecord,
  "odyssey-international-school": odysseyInternationalSchool as StrictSchoolRecord,
  "sakura-olympia-school-system": sakuraOlympia as StrictSchoolRecord,
  "singapore-international-school-da-nang": sisDaNang as StrictSchoolRecord,
  "sky-line-school-da-nang": skyLineDaNang as StrictSchoolRecord,
  "st-nicholas-school-da-nang": stNicholasDaNang as StrictSchoolRecord,
  "uk-academy-da-nang": ukAcademyDaNang as StrictSchoolRecord,
  "bangkok-international-preparatory-secondary-school": bangkokPrep as StrictSchoolRecord,
  "denla-british-school": denlaBritishSchool as StrictSchoolRecord,
  "hampton-international-school-chaengwattana": hamptonChaengwattana as StrictSchoolRecord,
  "international-christian-school-nonthaburi": internationalChristianSchoolNonthaburi as StrictSchoolRecord,
  "international-school-bangkok": internationalSchoolBangkok as StrictSchoolRecord,
  "knightsbridge-house-international-school-thailand": knightsbridgeHouse as StrictSchoolRecord,
  "myis-international-school": myisInternationalSchool as StrictSchoolRecord,
  "new-american-chinese-international-school": newAmericanChineseInternationalSchool as StrictSchoolRecord,
  "ruamrudee-international-school-ratchapruek": risRatchapruek as StrictSchoolRecord,
  "st-andrews-samakee-international-school": stAndrewsSamakee as StrictSchoolRecord,
  "australian-international-school-singapore": aisSingapore as StrictSchoolRecord,
  "canadian-international-school-singapore": cisSingapore as StrictSchoolRecord,
  "dulwich-college-singapore": dulwichSingapore as StrictSchoolRecord,
  "nexus-international-school-singapore": nexusSingapore as StrictSchoolRecord,
  "singapore-american-school": sasSingapore as StrictSchoolRecord,
  "stamford-american-international-school": stamfordSingapore as StrictSchoolRecord,
  "tanglin-trust-school": tanglinSingapore as StrictSchoolRecord,
  "uwc-south-east-asia": uwcsea as StrictSchoolRecord,
  "american-school-bangkok-green-valley": asbGreenValley as StrictSchoolRecord,
  "d-prep-international-school": dPrep as StrictSchoolRecord,
  "thai-chinese-international-school": thaiChineseInternationalSchool as StrictSchoolRecord,
  "tsi-international-school-bearing": tsiBearing as StrictSchoolRecord,
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

  const matchesByPrefix = fieldPrefixes.map((prefix) => Object.entries(record.provenance).filter(([key]) =>
    key === prefix || key.startsWith(`${prefix}[`) || key.startsWith(`${prefix}.`),
  ));

  if (matchesByPrefix.flat().some(([, entry]) => entry.conflict)) return "conflict";
  return matchesByPrefix.every((matches) => matches.length > 0) ? "evidence-backed" : "pending";
}
