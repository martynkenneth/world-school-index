import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatVerifiedDate, getSchool, getSchoolsByCity } from "@/data/schools";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const school = getSchool(slug);
  if (!school) return {};
  return { title: `${school.name} | World School Index`, description: school.summary };
}

export default async function SchoolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const school = getSchool(slug);
  if (!school) notFound();
  const nearby = getSchoolsByCity(school.citySlug).filter((item) => item.slug !== school.slug).slice(0, 3);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "School",
    name: school.name,
    url: school.website,
    address: { "@type": "PostalAddress", addressLocality: school.city, addressCountry: school.countryCode },
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="school-hero">
        <div className="shell">
          <div className="breadcrumbs"><Link href="/">World</Link><span>/</span><Link href={`/countries/${school.countrySlug}`}>{school.country}</Link><span>/</span><Link href={`/cities/${school.citySlug}`}>{school.city}</Link></div>
          <div className="school-title-grid">
            <div>
              <span className="eyebrow light">Verified school record</span>
              <h1>{school.name}</h1>
              <p>{school.summary}</p>
            </div>
            <div className="record-seal"><span>{school.countryCode}</span><strong>Source checked</strong><small>{formatVerifiedDate(school.verifiedOn)}</small></div>
          </div>
        </div>
      </section>
      <section className="section shell record-layout">
        <div>
          <div className="record-section">
            <span className="eyebrow">At a glance</span>
            <h2>Core school information</h2>
            <dl className="fact-table">
              <div><dt>Location</dt><dd>{school.city}, {school.country}</dd></div>
              <div><dt>Age range</dt><dd>{school.ageRange}</dd></div>
              <div><dt>Language</dt><dd>{school.language}</dd></div>
              <div><dt>School type</dt><dd>{school.schoolType}</dd></div>
              <div><dt>Ownership</dt><dd>{school.ownership}</dd></div>
              {school.founded && <div><dt>Founded</dt><dd>{school.founded}</dd></div>}
            </dl>
          </div>
          <div className="record-section">
            <span className="eyebrow">Academic pathways</span>
            <h2>Curriculum and accreditation</h2>
            <div className="tag-row large-tags">{school.curricula.map((item) => <span className="tag" key={item}>{item}</span>)}</div>
            {school.accreditation.length ? (
              <div className="accreditation-list">{school.accreditation.map((item) => <span key={item}>✓ {item}</span>)}</div>
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
          <span className="eyebrow">Source record</span>
          <h2>Check the original</h2>
          <p>This profile was compiled from the school’s own published information.</p>
          <dl><div><dt>Last checked</dt><dd>{formatVerifiedDate(school.verifiedOn)}</dd></div><div><dt>Source type</dt><dd>Official school website</dd></div></dl>
          <a className="button primary full" href={school.sourceUrl} target="_blank" rel="noreferrer">Open source ↗</a>
          <a className="button outline full" href={school.website} target="_blank" rel="noreferrer">Visit school website ↗</a>
          <small>Admissions, fees, capacity, and programmes can change. Confirm directly before making decisions.</small>
        </aside>
      </section>
    </main>
  );
}
