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
  const feePublications = city === "ho-chi-minh-city"
    ? citySchools.flatMap((school) => {
        const record = getStrictRecord(school.slug);
        const academicYearProvenance = record?.provenance["fees.academic_year"];
        const currencyProvenance = record?.provenance["fees.currency"];
        const feeRows = record?.fees.by_year_group ?? [];
        const rowsAreVerified = feeRows.every((_, index) => {
          const labelProvenance = record?.provenance[`fees.by_year_group[${index}].label`];
          const tuitionProvenance = record?.provenance[`fees.by_year_group[${index}].tuition`];
          return labelProvenance && tuitionProvenance && !labelProvenance.conflict && !tuitionProvenance.conflict;
        });

        return record?.fees.published && record.fees.academic_year && record.fees.currency
          && feeRows.length > 0 && rowsAreVerified
          && academicYearProvenance && currencyProvenance
          && !academicYearProvenance.conflict && !currencyProvenance.conflict
          ? [{ school, fees: record.fees, provenance: academicYearProvenance }]
          : [];
      })
    : [];
  const currentFeePublication = feePublications[0];
  const programmeChanges = city === "da-nang"
    ? citySchools.flatMap((school) => {
        const record = getStrictRecord(school.slug);
        return (record?.curricula ?? []).flatMap((programme, index) => {
          const programmeProvenance = record?.provenance[`curricula[${index}]`];
          const yearGroup = record?.year_groups.find((value) => value.startsWith("Grades 9–10"));
          const yearGroupIndex = yearGroup ? record?.year_groups.indexOf(yearGroup) : -1;
          const yearGroupProvenance = yearGroupIndex >= 0
            ? record?.provenance[`year_groups[${yearGroupIndex}]`]
            : undefined;

          return programme === "Enhanced Dual-Diploma Preparatory Program"
            && programmeProvenance && yearGroup && yearGroupProvenance
            && !programmeProvenance.conflict && !yearGroupProvenance.conflict
            ? [{ school, programme, yearGroup, provenance: programmeProvenance }]
            : [];
        });
      })
    : [];
  const currentProgrammeChange = programmeChanges[0];

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
        {currentFeePublication && (
          <aside className="city-answer" aria-labelledby="hcmc-fees-answer">
            <span className="eyebrow">Fees update</span>
            <h2 id="hcmc-fees-answer">Which listed Ho Chi Minh City school publishes 2026–27 fees?</h2>
            <p>
              <strong>One of the {citySchools.length} listed profiles has a verified 2026-2027 tuition schedule.</strong>{" "}
              <Link href={`/schools/${currentFeePublication.school.slug}`}>{currentFeePublication.school.name}</Link>{" "}
              lists {currentFeePublication.fees.by_year_group.length} tuition bands in {currentFeePublication.fees.currency},
              from {currentFeePublication.fees.by_year_group[0].tuition} for {currentFeePublication.fees.by_year_group[0].label}
              {" "}to {currentFeePublication.fees.by_year_group.at(-1)?.tuition} for {currentFeePublication.fees.by_year_group.at(-1)?.label}.
            </p>
            <div className="city-answer-links">
              <a href={currentFeePublication.provenance.source_url} target="_blank" rel="noreferrer">
                Official 2026-2027 fee schedule ↗
              </a>
              <span>Checked {formatVerifiedDate(currentFeePublication.provenance.retrieved_date)}</span>
            </div>
            <small>
              This count covers listed profiles, not every school in Ho Chi Minh City. Confirm fees and payment terms directly with the school.
            </small>
          </aside>
        )}
        {currentProgrammeChange && (
          <aside className="city-answer" aria-labelledby="da-nang-programme-answer">
            <span className="eyebrow">Programme update</span>
            <h2 id="da-nang-programme-answer">What programme change is published for a listed Da Nang school?</h2>
            <p>
              <strong>One of the {citySchools.length} listed profiles has a verified programme addition.</strong>{" "}
              <Link href={`/schools/${currentProgrammeChange.school.slug}`}>{currentProgrammeChange.school.name}</Link>{" "}
              publishes “{currentProgrammeChange.programme}” for {currentProgrammeChange.yearGroup}.
            </p>
            <div className="city-answer-links">
              <a href={currentProgrammeChange.provenance.source_url} target="_blank" rel="noreferrer">
                Official programme pathway ↗
              </a>
              <span>Checked {formatVerifiedDate(currentProgrammeChange.provenance.retrieved_date)}</span>
            </div>
            <small>
              This answer covers listed profiles, not every school in Da Nang. Confirm current programme availability directly with the school.
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
