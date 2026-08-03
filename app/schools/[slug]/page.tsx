import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatVerifiedDate, getSchool, getSchoolsByCity } from "@/data/schools";
import {
  getFieldVerificationState,
  getStrictRecord,
  getVerificationSummary,
  type FieldVerificationState,
} from "@/data/verification";

function FieldState({ state }: { state: FieldVerificationState }) {
  if (state === "pending") return null;

  const labels = {
    "evidence-backed": "Evidence-backed",
    conflict: "Conflicting sources",
  };
  return <span className={`fact-state ${state}`}>{labels[state]}</span>;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const school = getSchool(slug);
  if (!school) return {};
  const verification = getVerificationSummary(slug);
  return {
    title: `${school.name} | World School Index`,
    description: `${school.name} school record for ${school.city}, ${school.country}.`,
    robots: verification.indexable ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function SchoolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const school = getSchool(slug);
  if (!school) notFound();
  const verification = getVerificationSummary(slug);
  const strictRecord = getStrictRecord(slug);
  const nearby = getSchoolsByCity(school.citySlug).filter((item) => item.slug !== school.slug).slice(0, 3);
  const ageRange = strictRecord?.age_range.min != null && strictRecord.age_range.max != null
    ? `${strictRecord.age_range.min}-${strictRecord.age_range.max}`
    : school.ageRange;
  const language = strictRecord?.languages.instruction.length
    ? strictRecord.languages.instruction.join(", ")
    : school.language;
  const schoolType = strictRecord?.school_type === "non-profit"
    ? "Not-for-profit international day school"
    : school.schoolType;
  const ownership = strictRecord?.school_type === "non-profit" ? "Not-for-profit" : school.ownership;
  const curricula = strictRecord?.curricula.length ? strictRecord.curricula : school.curricula;
  const accreditation = strictRecord?.accreditations.length
    ? strictRecord.accreditations.map((item) => item.body)
    : school.accreditation;
  const founded = strictRecord?.founded ?? school.founded;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: school.name,
    url: school.website,
    address: { "@type": "PostalAddress", addressLocality: school.city, addressCountry: school.countryCode },
  };

  return (
    <main>
      {verification.hasStrictRecord && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
      <section className="school-hero">
        <div className="shell">
          <div className="breadcrumbs"><Link href="/">World</Link><span>/</span><Link href={`/countries/${school.countrySlug}`}>{school.country}</Link><span>/</span><Link href={`/cities/${school.citySlug}`}>{school.city}</Link></div>
          <div className="school-title-grid">
            <div>
              <span className="eyebrow light">Provisional school profile</span>
              <h1>{school.name}</h1>
              <p>
                {school.city}, {school.country}. Published from an official school source;
                field-level evidence review is in progress.
              </p>
            </div>
            <div className="record-seal">
              <span>{verification.hasStrictRecord ? `${verification.completenessScore}/12` : school.countryCode}</span>
              <strong>{verification.hasStrictRecord ? "Evidence review" : "Provisional profile"}</strong>
              <small>
                {verification.lastVerified
                  ? `Evidence checked ${formatVerifiedDate(verification.lastVerified)}`
                  : `Official source linked ${formatVerifiedDate(school.verifiedOn)}`}
              </small>
            </div>
          </div>
        </div>
      </section>
      <section className="section shell record-layout">
        <div>
          <div className="record-section">
            <span className="eyebrow">At a glance</span>
            <h2>Core school information</h2>
            <dl className="fact-table">
              <div><dt>Location</dt><dd><span>{school.city}, {school.country}</span><FieldState state={getFieldVerificationState(slug, ["location.city", "location.country"])} /></dd></div>
              <div><dt>Age range</dt><dd><span>{ageRange}</span><FieldState state={getFieldVerificationState(slug, ["age_range"])} /></dd></div>
              <div><dt>Language</dt><dd><span>{language}</span><FieldState state={getFieldVerificationState(slug, ["languages.instruction"])} /></dd></div>
              <div><dt>School type</dt><dd><span>{schoolType}</span><FieldState state={getFieldVerificationState(slug, ["school_type"])} /></dd></div>
              <div><dt>Ownership</dt><dd><span>{ownership}</span><FieldState state={getFieldVerificationState(slug, ["school_type"])} /></dd></div>
              {founded && <div><dt>Founded</dt><dd><span>{founded}</span><FieldState state={getFieldVerificationState(slug, ["founded"])} /></dd></div>}
            </dl>
          </div>
          <div className="record-section">
            <span className="eyebrow">Academic pathways</span>
            <h2>Curriculum and accreditation</h2>
            <div className="section-verification"><FieldState state={getFieldVerificationState(slug, ["curricula"])} /></div>
            <div className="tag-row large-tags">{curricula.map((item) => <span className="tag" key={item}>{item}</span>)}</div>
            {accreditation.length ? (
              <>
                <div className="section-verification"><FieldState state={getFieldVerificationState(slug, ["accreditations"])} /></div>
                <div className="accreditation-list">{accreditation.map((item) => <span key={item}>{item}</span>)}</div>
              </>
            ) : (
              <p className="muted">No external accreditation has yet been recorded in this seed entry.</p>
            )}
          </div>
          {nearby.length > 0 && (
            <div className="record-section">
              <span className="eyebrow">Also in {school.city}</span>
              <h2>Continue exploring</h2>
              <div className="nearby-links">{nearby.map((item) => <Link key={item.slug} href={`/schools/${item.slug}`}><strong>{item.shortName}</strong><span>{item.curricula[0]} · {item.ageRange}</span></Link>)}</div>
            </div>
          )}
        </div>
        <aside className="source-panel">
          <span className="eyebrow">Verification status</span>
          <h2>{verification.hasStrictRecord ? `${verification.completenessScore} of 12 core fields` : "Provisional profile"}</h2>
          <p>
            Available facts are shown for discovery, but only facts carrying an evidence-backed
            label have completed the field-level source check.
          </p>
          <dl>
            <div><dt>Search indexing</dt><dd>{verification.indexable ? "Eligible" : "Held until 8/12"}</dd></div>
            <div><dt>Source type</dt><dd>Official school website</dd></div>
            {verification.conflictCount > 0 && <div><dt>Open conflicts</dt><dd>{verification.conflictCount}</dd></div>}
          </dl>
          <a className="button primary full" href={school.sourceUrl} target="_blank" rel="noreferrer">Open source ↗</a>
          <a className="button outline full" href={school.website} target="_blank" rel="noreferrer">Visit school website ↗</a>
          <small>Admissions, fees, capacity, and programmes can change. Confirm directly before making decisions.</small>
          <Link className="disclaimer-link" href="/disclaimer">Read the data disclaimer</Link>
        </aside>
      </section>
    </main>
  );
}
