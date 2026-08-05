import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SchoolCard } from "@/components/SchoolCard";
import { getGuidesByCity } from "@/data/guides";
import { formatVerifiedDate, getSchoolsByCity } from "@/data/schools";
import { getStrictRecord } from "@/data/verification";

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await params;
  const citySchools = getSchoolsByCity(city);
  if (!citySchools.length) return {};
  return {
    title: `International Schools in ${citySchools[0].city} | World School Index`,
    description: `Explore official-source-linked international school profiles in ${citySchools[0].city}, ${citySchools[0].country}.`,
  };
}

export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  const citySchools = getSchoolsByCity(city);
  if (!citySchools.length) notFound();
  const cityName = citySchools[0].city;
  const countryName = citySchools[0].country;
  const countrySlug = citySchools[0].countrySlug;
  const cityGuides = getGuidesByCity(city);
  const openDayUpdates = city === "hanoi"
    ? citySchools.flatMap((school) => {
        const record = getStrictRecord(school.slug);
        return (record?.admissions.open_days ?? []).flatMap((openDay, index) => {
          const provenance = record?.provenance[`admissions.open_days[${index}]`];
          return provenance && !provenance.conflict
            ? [{ school, openDay, provenance }]
            : [];
        });
      })
    : [];

  return (
    <main>
      <section className="compact-hero">
        <div className="shell">
          <div className="breadcrumbs"><Link href="/">World</Link><span>/</span><Link href={`/countries/${countrySlug}`}>{countryName}</Link><span>/</span><span>{cityName}</span></div>
          <span className="eyebrow light">City directory</span>
          <h1>International schools in {cityName}</h1>
          <p>{citySchools.length} official-source-linked profiles in the current collection.</p>
        </div>
      </section>
      <section className="section shell">
        {openDayUpdates.length > 0 && (
          <aside className="city-answer" aria-labelledby="hanoi-open-day-answer">
            <span className="eyebrow">Admissions update</span>
            <h2 id="hanoi-open-day-answer">What open day is published for a Hanoi international school?</h2>
            <p>
              <strong>One of the {citySchools.length} listed profiles has a current official notice.</strong>{" "}
              <Link href={`/schools/${openDayUpdates[0].school.slug}`}>{openDayUpdates[0].school.name}</Link>{" "}
              publishes “{openDayUpdates[0].openDay}”.
            </p>
            <div className="city-answer-links">
              <a href={openDayUpdates[0].provenance.source_url} target="_blank" rel="noreferrer">
                Official open-day notice ↗
              </a>
              <span>Checked {formatVerifiedDate(openDayUpdates[0].provenance.retrieved_date)}</span>
            </div>
            <small>
              This count covers listed profiles, not every school in Hanoi. Confirm event availability directly with the school.
            </small>
          </aside>
        )}
        {cityGuides.length > 0 && (
          <section className="city-guides" aria-labelledby="city-living-guides-heading">
            <div>
              <span className="eyebrow">Living in {cityName}</span>
              <h2 id="city-living-guides-heading">Practical guides for families</h2>
              <p>Source-checked city guidance to use alongside the school directory.</p>
            </div>
            <div className="city-guide-links">
              {cityGuides.map((guide) => (
                <Link href={guide.canonical_path} key={guide.id}>
                  <strong>{guide.title}</strong>
                  <span>Sources checked {formatVerifiedDate(guide.checked_date)} →</span>
                </Link>
              ))}
            </div>
          </section>
        )}
        <div className="school-grid">
          {citySchools.map((school) => <SchoolCard key={school.slug} school={school} />)}
        </div>
        <div className="back-row"><Link className="text-link" href={`/countries/${countrySlug}`}>← Back to all {countryName} schools</Link></div>
      </section>
    </main>
  );
}
