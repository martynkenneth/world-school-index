export const PARENT_RELATIONSHIPS = ["Current parent", "Former parent"] as const;
export const PARENT_TOPICS = [
  "Admissions",
  "Communication",
  "Daily school life",
  "Learning support",
  "Transport",
  "Transition advice",
] as const;

export type ParentPerspectiveInput = {
  schoolSlug: string;
  relationship: (typeof PARENT_RELATIONSHIPS)[number];
  yearGroup: string;
  attendancePeriod: string;
  topics: string[];
  comment: string;
  parentEmail: string;
  consentToPublish: true;
};

type ValidationResult =
  | { ok: true; value: ParentPerspectiveInput }
  | { ok: false; error: string; isHoneypot?: boolean };

export function validateParentPerspectiveInput(input: Record<string, unknown>): ValidationResult {
  const schoolSlug = cleanText(input.schoolSlug);
  const relationship = cleanText(input.relationship);
  const yearGroup = cleanText(input.yearGroup);
  const attendancePeriod = cleanText(input.attendancePeriod);
  const comment = cleanText(input.comment);
  const parentEmail = cleanText(input.parentEmail).toLowerCase();
  const website = cleanText(input.website);
  const topics = Array.isArray(input.topics)
    ? [...new Set(input.topics.map(cleanText).filter(Boolean))]
    : [];

  if (website) return { ok: false, error: "Submission received.", isHoneypot: true };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(schoolSlug)) {
    return { ok: false, error: "Choose a valid school." };
  }
  if (!PARENT_RELATIONSHIPS.includes(relationship as (typeof PARENT_RELATIONSHIPS)[number])) {
    return { ok: false, error: "Choose your relationship to the school." };
  }
  if (yearGroup.length < 2 || yearGroup.length > 40) {
    return { ok: false, error: "Enter a year group of 2–40 characters." };
  }
  if (attendancePeriod.length < 4 || attendancePeriod.length > 50) {
    return { ok: false, error: "Enter an attendance period of 4–50 characters." };
  }
  if (topics.length < 1 || topics.length > 3 || topics.some((topic) => !PARENT_TOPICS.includes(topic as (typeof PARENT_TOPICS)[number]))) {
    return { ok: false, error: "Choose between one and three available topics." };
  }
  if (comment.length < 80 || comment.length > 1200) {
    return { ok: false, error: "Write between 80 and 1,200 characters." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail) || parentEmail.length > 254) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (input.consentToPublish !== true && input.consentToPublish !== "on") {
    return { ok: false, error: "Publication consent is required." };
  }

  return {
    ok: true,
    value: {
      schoolSlug,
      relationship: relationship as ParentPerspectiveInput["relationship"],
      yearGroup,
      attendancePeriod,
      topics,
      comment,
      parentEmail,
      consentToPublish: true,
    },
  };
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}
