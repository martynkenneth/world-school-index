import guideData from "./city-guides.json";

export const SITE_URL = "https://worldschoolindex.com";

export type GuideSource = {
  id: string;
  publisher: string;
  title: string;
  url: string;
  source_type: string;
  retrieved_date: string;
  evidence: string[];
};

export type SourceIds = { source_ids: string[] };

export type CityGuide = {
  schema_version: string;
  id: string;
  country: string;
  country_slug: string;
  city: string;
  city_slug: string;
  topic: string;
  title: string;
  description: string;
  canonical_path: string;
  published_date: string;
  checked_date: string;
  recheck_date: string;
  sitemap: {
    include: boolean;
    change_frequency: "weekly" | "monthly" | "yearly";
    priority: number;
  };
  direct_answer: { text: string } & SourceIds;
  key_facts: Array<{ label: string; answer: string } & SourceIds>;
  sections: Array<{
    id: string;
    heading: string;
    paragraphs: Array<{ text: string } & SourceIds>;
    items: Array<{ text: string } & SourceIds>;
  }>;
  family_section: {
    heading: string;
    paragraphs: string[];
    checklist: string[];
  };
  internal_links: Array<{
    label: string;
    href: string;
    purpose: "city-hub" | "country-hub" | "school-directory";
  }>;
  sources: GuideSource[];
};

export const cityGuides = guideData as CityGuide[];

export function getCityGuide(country: string, city: string, topic: string) {
  return cityGuides.find((guide) => (
    guide.country_slug === country
    && guide.city_slug === city
    && guide.topic === topic
  ));
}

export function getGuidesByCity(citySlug: string) {
  return cityGuides.filter((guide) => guide.city_slug === citySlug);
}

export function guideUrl(guide: CityGuide) {
  return new URL(guide.canonical_path, SITE_URL).toString();
}
