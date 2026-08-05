import Ajv2020, { type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import { readFile } from "node:fs/promises";
import path from "node:path";

type SourcedText = { source_ids: string[] };

export type CityGuideRecord = {
  id: string;
  country: string;
  country_slug: string;
  city: string;
  city_slug: string;
  topic: string;
  title: string;
  canonical_path: string;
  published_date: string;
  checked_date: string;
  recheck_date: string;
  sitemap: { include: boolean };
  direct_answer: SourcedText;
  key_facts: SourcedText[];
  sections: Array<{ paragraphs: SourcedText[]; items: SourcedText[] }>;
  internal_links: Array<{ href: string; purpose: string }>;
  sources: Array<{
    id: string;
    url: string;
    retrieved_date: string;
    evidence: string[];
  }>;
};

type CityProgress = {
  cities: Array<{ country: string; city: string; city_slug: string; status: string }>;
};

type GuideLedger = {
  topic_rotation: string[];
  cities: Array<{
    country: string;
    city: string;
    city_slug: string;
    completed_articles: Array<{
      topic: string;
      title: string;
      url: string;
      published_date: string;
      checked_date: string;
      recheck_date: string;
      official_sources: string[];
    }>;
    next_recommended_topic: string;
  }>;
};

let compiledValidator: Promise<ValidateFunction> | undefined;

function formatAjvErrors(errors: ErrorObject[] | null | undefined): string[] {
  return (errors ?? []).map((error) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`);
}

async function getSchemaValidator(): Promise<ValidateFunction> {
  compiledValidator ??= (async () => {
    const schemaUrl = new URL("../../schema/city-guide.schema.json", import.meta.url);
    const schema = JSON.parse(await readFile(schemaUrl, "utf8"));
    return new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  })();
  return compiledValidator;
}

function countWords(value: string): number {
  return value.trim().split(/\s+/u).filter(Boolean).length;
}

function isRealIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

function referencedSourceIds(guide: CityGuideRecord): string[] {
  return [
    ...guide.direct_answer.source_ids,
    ...guide.key_facts.flatMap((fact) => fact.source_ids),
    ...guide.sections.flatMap((section) => [
      ...section.paragraphs.flatMap((paragraph) => paragraph.source_ids),
      ...section.items.flatMap((item) => item.source_ids),
    ]),
  ];
}

export async function validateCityGuideRecord(guide: CityGuideRecord): Promise<string[]> {
  const errors: string[] = [];
  const validate = await getSchemaValidator();
  if (!validate(guide)) errors.push(...formatAjvErrors(validate.errors));

  const expectedCanonical = `/guides/${guide.country_slug}/${guide.city_slug}/${guide.topic}/`;
  if (guide.canonical_path !== expectedCanonical) {
    errors.push(`canonical_path: expected ${expectedCanonical}, received ${guide.canonical_path}`);
  }

  for (const [label, value] of [
    ["published_date", guide.published_date],
    ["checked_date", guide.checked_date],
    ["recheck_date", guide.recheck_date],
  ]) {
    if (!isRealIsoDate(value)) errors.push(`${label}: ${JSON.stringify(value)} is not a real ISO date`);
  }
  if (guide.published_date > guide.checked_date) errors.push("published_date must not be later than checked_date");
  if (guide.recheck_date <= guide.checked_date) errors.push("recheck_date must be later than checked_date");

  const sourceIds = guide.sources.map((source) => source.id);
  const sourceIdSet = new Set(sourceIds);
  if (sourceIdSet.size !== sourceIds.length) errors.push("sources: source ids must be unique");
  const sourceUrls = guide.sources.map((source) => source.url);
  if (new Set(sourceUrls).size !== sourceUrls.length) errors.push("sources: source URLs must be unique");

  const referencedIds = referencedSourceIds(guide);
  for (const sourceId of referencedIds) {
    if (!sourceIdSet.has(sourceId)) errors.push(`source reference ${sourceId}: no matching source exists`);
  }
  for (const sourceId of sourceIdSet) {
    if (!referencedIds.includes(sourceId)) errors.push(`source ${sourceId}: source is never cited in article content`);
  }

  for (const source of guide.sources) {
    if (!isRealIsoDate(source.retrieved_date)) errors.push(`source ${source.id}: retrieved_date is not a real ISO date`);
    if (source.retrieved_date > guide.checked_date) errors.push(`source ${source.id}: retrieved after the guide checked_date`);
    for (const [index, evidence] of source.evidence.entries()) {
      const words = countWords(evidence);
      if (words > 25) errors.push(`source ${source.id} evidence ${index + 1}: ${words} words; maximum is 25`);
    }
  }

  const purposes = guide.internal_links.map((link) => link.purpose);
  for (const required of ["city-hub", "country-hub", "school-directory"]) {
    if (purposes.filter((purpose) => purpose === required).length !== 1) {
      errors.push(`internal_links: expected exactly one ${required} link`);
    }
  }
  if (!guide.sitemap.include) errors.push("sitemap.include: published guides must be included");

  return errors;
}

export async function validateCityGuideData(
  guidesPath = path.resolve("data", "city-guides.json"),
  progressPath = path.resolve("data", "automation", "city-progress.json"),
  ledgerPath = path.resolve("data", "automation", "city-living-guide-progress.json"),
): Promise<{ guideCount: number; sourceCount: number }> {
  const [guides, progress, ledger] = await Promise.all([
    readFile(guidesPath, "utf8").then((value) => JSON.parse(value) as CityGuideRecord[]),
    readFile(progressPath, "utf8").then((value) => JSON.parse(value) as CityProgress),
    readFile(ledgerPath, "utf8").then((value) => JSON.parse(value) as GuideLedger),
  ]);

  if (!Array.isArray(guides) || guides.length === 0) throw new Error("City-guide validation failed: no guides were found");
  const failures: string[] = [];
  const ids = new Set<string>();
  const canonicals = new Set<string>();

  for (const guide of guides) {
    const guideErrors = await validateCityGuideRecord(guide);
    if (ids.has(guide.id)) guideErrors.push(`id: duplicate guide id ${guide.id}`);
    if (canonicals.has(guide.canonical_path)) guideErrors.push(`canonical_path: duplicate ${guide.canonical_path}`);
    ids.add(guide.id);
    canonicals.add(guide.canonical_path);

    const city = progress.cities.find((item) => item.city_slug === guide.city_slug && item.country === guide.country);
    if (!city || city.status !== "complete") guideErrors.push("city: guide city is not marked complete in city-progress.json");

    const ledgerCity = ledger.cities.find((item) => item.city_slug === guide.city_slug && item.country === guide.country);
    const ledgerArticle = ledgerCity?.completed_articles.find((article) => article.url === guide.canonical_path);
    if (!ledgerArticle) {
      guideErrors.push("ledger: no completed article matches the canonical path");
    } else {
      for (const field of ["topic", "title", "published_date", "checked_date", "recheck_date"] as const) {
        if (ledgerArticle[field] !== guide[field]) guideErrors.push(`ledger: ${field} does not match guide data`);
      }
      const guideSources = guide.sources.map((source) => source.url).sort();
      const ledgerSources = [...ledgerArticle.official_sources].sort();
      if (JSON.stringify(guideSources) !== JSON.stringify(ledgerSources)) guideErrors.push("ledger: official_sources do not match guide sources");
    }

    if (guideErrors.length > 0) failures.push(`${guide.id}:\n  - ${guideErrors.join("\n  - ")}`);
  }

  const completedCities = progress.cities.filter((city) => city.status === "complete");
  for (const city of completedCities) {
    if (!ledger.cities.some((item) => item.city_slug === city.city_slug && item.country === city.country)) {
      failures.push(`ledger: missing completed city ${city.city}, ${city.country}`);
    }
  }
  for (const city of ledger.cities) {
    if (!ledger.topic_rotation.includes(city.next_recommended_topic)) {
      failures.push(`ledger: ${city.city} next_recommended_topic is outside the rotation`);
    }
    const topics = city.completed_articles.map((article) => article.topic);
    const urls = city.completed_articles.map((article) => article.url);
    if (new Set(topics).size !== topics.length) failures.push(`ledger: ${city.city} repeats a completed topic`);
    if (new Set(urls).size !== urls.length) failures.push(`ledger: ${city.city} repeats a completed URL`);
    for (const article of city.completed_articles) {
      if (!guides.some((guide) => guide.canonical_path === article.url)) failures.push(`ledger: ${article.url} has no guide data`);
    }
  }

  if (failures.length > 0) throw new Error(`City-guide validation failed:\n${failures.join("\n")}`);
  return { guideCount: guides.length, sourceCount: guides.reduce((total, guide) => total + guide.sources.length, 0) };
}
