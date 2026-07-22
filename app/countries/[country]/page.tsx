import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DirectoryExplorer } from "@/components/DirectoryExplorer";
import { getSchoolsByCountry } from "@/data/schools";

export async function generateMetadata({ params }: { params: Promise<{ country: string }> }): Promise<Metadata> {
  const { country } = await params;
  if (country !== "vietnam") return {};
  return {
    title: "International Schools in Vietnam | World School Index",
    description: "Explore source-checked international schools in Hanoi, Ho Chi Minh City, and Da Nang, Vietnam.",
  };
}

export default async function CountryPage({ params }: { params: Promise<{ country: string }> }) {
  const { country } = await params;
  if (country !== "vietnam") notFound();
  const countrySchools = getSchoolsByCountry(country);
  const cities = Array.from(new Set(countrySchools.map((school) => school.city)));

  return (
    <main>
      <section className="country-hero">
        <div className="shell">
          <div className="breadcrumbs"><Link href="/">World</Link><span>/</span><span>Vietnam</span></div>
          <span className="eyebrow light">Country directory · Vietnam</span>
          <h1>International schools in Vietnam</h1>
          <p>
            Compare curricula, age ranges, languages, ownership models, and official
            accreditations across Vietnam’s main international-school hubs.
          </p>
          <div className="country-stats">
            <div><strong>{countrySchools.length}</strong><span>initial records</span></div>
            <div><strong>{cities.length}</strong><span>cities covered</span></div>
            <div><strong>100%</strong><span>official-source links</span></div>
          </div>
        </div>
      </section>
      <div className="shell city-strip" aria-label="Vietnam cities">
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
            This is the verified seed collection, not yet a claim of completeness. New
            schools and cities will be added in review batches with their source and check date.
          </p>
        </div>
        <DirectoryExplorer schools={countrySchools} />
      </div>
    </main>
  );
}
