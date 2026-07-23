import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SchoolCard } from "@/components/SchoolCard";
import { getSchoolsByCity } from "@/data/schools";

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await params;
  const citySchools = getSchoolsByCity(city);
  if (!citySchools.length) return {};
  return {
    title: `International Schools in ${citySchools[0].city} | World School Index`,
    description: `Explore source-checked international schools in ${citySchools[0].city}, ${citySchools[0].country}.`,
  };
}

export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  const citySchools = getSchoolsByCity(city);
  if (!citySchools.length) notFound();
  const cityName = citySchools[0].city;
  const countryName = citySchools[0].country;
  const countrySlug = citySchools[0].countrySlug;

  return (
    <main>
      <section className="compact-hero">
        <div className="shell">
          <div className="breadcrumbs"><Link href="/">World</Link><span>/</span><Link href={`/countries/${countrySlug}`}>{countryName}</Link><span>/</span><span>{cityName}</span></div>
          <span className="eyebrow light">City directory</span>
          <h1>International schools in {cityName}</h1>
          <p>{citySchools.length} source-checked records in the current collection.</p>
        </div>
      </section>
      <section className="section shell">
        <div className="school-grid">
          {citySchools.map((school) => <SchoolCard key={school.slug} school={school} />)}
        </div>
        <div className="back-row"><Link className="text-link" href={`/countries/${countrySlug}`}>← Back to all {countryName} schools</Link></div>
      </section>
    </main>
  );
}
