import type { MetadataRoute } from "next";
import { cityGuides, guideUrl, SITE_URL } from "@/data/guides";
import { countries, schools } from "@/data/schools";
import { getVerificationSummary } from "@/data/verification";

export default function sitemap(): MetadataRoute.Sitemap {
  const cityEntries = Array.from(
    new Map(schools.map((school) => [school.citySlug, school])).values(),
  ).map((school) => ({
    url: `${SITE_URL}/cities/${school.citySlug}`,
    lastModified: school.verifiedOn,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const countryEntries = countries.map((country) => ({
    url: `${SITE_URL}/countries/${country.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const schoolEntries = schools
    .filter((school) => getVerificationSummary(school.slug).indexable)
    .map((school) => ({
      url: `${SITE_URL}/schools/${school.slug}`,
      lastModified: getVerificationSummary(school.slug).lastVerified ?? school.verifiedOn,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

  const guideEntries = cityGuides
    .filter((guide) => guide.sitemap.include)
    .map((guide) => ({
      url: guideUrl(guide),
      lastModified: guide.checked_date,
      changeFrequency: guide.sitemap.change_frequency,
      priority: guide.sitemap.priority,
    }));

  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    ...countryEntries,
    ...cityEntries,
    ...schoolEntries,
    ...guideEntries,
  ];
}
