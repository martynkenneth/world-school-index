import type { School as DirectorySchool } from "./schools";

export type SchoolOperatingStatus = "operating" | "planned" | "closed" | "unknown";
export type SourceType = "official-school" | "government" | "accreditor" | "association";
export type VerificationLevel = "core" | "enhanced" | "school-confirmed";

export type SchoolEntity = {
  id: string;
  canonicalName: string;
  shortName: string;
  slug: string;
  countryCode: string;
  status: SchoolOperatingStatus;
  ownership: string;
  founded?: number;
};

export type CampusEntity = {
  id: string;
  schoolId: string;
  name: string;
  countryCode: string;
  city: string;
  citySlug: string;
  region: string;
  campusType: "day" | "boarding" | "day-and-boarding" | "unknown";
};

export type ProgrammeClaim = {
  id: string;
  schoolId: string;
  campusId: string;
  programme: string;
  sourceId: string;
};

export type AccreditationClaim = {
  id: string;
  schoolId: string;
  accreditation: string;
  sourceId: string;
  status: "recorded" | "externally-verified";
};

export type SourceEntity = {
  id: string;
  schoolId: string;
  type: SourceType;
  publisher: string;
  url: string;
  observedOn: string;
  supports: string[];
};

export type VerificationRecord = {
  id: string;
  schoolId: string;
  level: VerificationLevel;
  verifiedOn: string;
  sourceIds: string[];
};

export type NormalizedDirectory = {
  schools: SchoolEntity[];
  campuses: CampusEntity[];
  programmes: ProgrammeClaim[];
  accreditations: AccreditationClaim[];
  sources: SourceEntity[];
  verifications: VerificationRecord[];
};

function campusType(schoolType: string): CampusEntity["campusType"] {
  const value = schoolType.toLowerCase();
  if (value.includes("day and boarding")) return "day-and-boarding";
  if (value.includes("boarding")) return "boarding";
  if (value.includes("day school")) return "day";
  return "unknown";
}

export function normalizeSchoolRecords(records: DirectorySchool[]): NormalizedDirectory {
  const normalized: NormalizedDirectory = {
    schools: [],
    campuses: [],
    programmes: [],
    accreditations: [],
    sources: [],
    verifications: [],
  };

  for (const record of records) {
    const schoolId = `school:${record.countryCode.toLowerCase()}:${record.slug}`;
    const campusId = `campus:${record.countryCode.toLowerCase()}:${record.slug}:main`;
    const sourceId = `source:${record.countryCode.toLowerCase()}:${record.slug}:official`;

    normalized.schools.push({
      id: schoolId,
      canonicalName: record.name,
      shortName: record.shortName,
      slug: record.slug,
      countryCode: record.countryCode,
      status: "operating",
      ownership: record.ownership,
      founded: record.founded,
    });
    normalized.campuses.push({
      id: campusId,
      schoolId,
      name: `${record.shortName} main campus`,
      countryCode: record.countryCode,
      city: record.city,
      citySlug: record.citySlug,
      region: record.region,
      campusType: campusType(record.schoolType),
    });
    normalized.sources.push({
      id: sourceId,
      schoolId,
      type: "official-school",
      publisher: record.name,
      url: record.sourceUrl,
      observedOn: record.verifiedOn,
      supports: ["identity", "location", "curriculum", "age-range", "language"],
    });
    normalized.verifications.push({
      id: `verification:${record.countryCode.toLowerCase()}:${record.slug}:${record.verifiedOn}`,
      schoolId,
      level: "core",
      verifiedOn: record.verifiedOn,
      sourceIds: [sourceId],
    });
    record.curricula.forEach((programme, index) => {
      normalized.programmes.push({
        id: `programme:${record.countryCode.toLowerCase()}:${record.slug}:${index + 1}`,
        schoolId,
        campusId,
        programme,
        sourceId,
      });
    });
    record.accreditation.forEach((accreditation, index) => {
      normalized.accreditations.push({
        id: `accreditation:${record.countryCode.toLowerCase()}:${record.slug}:${index + 1}`,
        schoolId,
        accreditation,
        sourceId,
        status: "recorded",
      });
    });
  }

  return normalized;
}
