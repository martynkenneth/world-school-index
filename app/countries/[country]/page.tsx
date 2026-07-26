import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DirectoryExplorer } from "@/components/DirectoryExplorer";
import { getSchoolsByCountry } from "@/data/schools";

export async function generateMetadata({ params }: { params: Promise<{ country: string }> }): Promise<Metadata> {
  const { country } = await params;
  const countrySchools = getSchoolsByCountry(country);
  if (!countrySchools.length) return {};
  const countryName = countrySchools[0].country;
  const cityNames = Array.from(new Set(countrySchools.map((school) => school.city)));
  return {
    title: `International Schools in ${countryName} | World School Index`,
    description: `Explore official-source-linked international school profiles across ${cityNames.join(", ")}, ${countryName}.`,
  };
}

export default async function CountryPage({ params }: { params: Promise<{ country: string }> }) {
  const { country } = await params;
  const countrySchools = getSchoolsByCountry(country);
  if (!countrySchools.length) notFound();
  const countryName = countrySchools[0].country;
  const cities = Array.from(new Set(countrySchools.map((school) => school.city)));

  return (
    <main>
      <section className="country-hero">
        <div className="shell">
          <div className="breadcrumbs"><Link href="/">World</Link><span>/</span><span>{countryName}</span></div>
          <span className="eyebrow light">Country directory · {countryName}</span>
          <h1>International schools in {countryName}</h1>
          <p>
            Compare curricula, age ranges, languages, ownership models, and recorded
            accreditations across {countryName}&apos;s main international-school hubs.
          </p>
          <div className="country-stats">
            <div><strong>{countrySchools.length}</strong><span>school profiles</span></div>
            <div><strong>{cities.length}</strong><span>cities covered</span></div>
            <div><strong>100%</strong><span>official-source links</span></div>
          </div>
        </div>
      </section>
      <div className="shell city-strip" aria-label={`${countryName} cities`}>
        {cities.map((city) => {
          const citySlug = countrySchools.find((school) => school.city === city)?.citySlug;
          const count = countrySchools.filter((school) => school.city === city).length;
          return <Link key={city} href={`/cities/${citySlug}`}><strong>{city}</strong><span>{count} records</span></Link>;
        })}
      </div>
      <div className="shell section">
        <div className="coverage-note">
          <strong>Coverage note</strong>
          <p>
            Provisional profiles display useful directory facts while field-level evidence is
            collected. Their status is shown on every card and record; this is not yet a claim
            of national completeness.
          </p>
        </div>
        <DirectoryExplorer schools={countrySchools} />
      </div>
    </main>
  );
}
