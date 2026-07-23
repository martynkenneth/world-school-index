import Link from "next/link";

export const metadata = {
  title: "Methodology | World School Index",
  description: "How World School Index sources, structures, and verifies international school records.",
};

export default function AboutPage() {
  return (
    <main>
      <section className="compact-hero">
        <div className="shell narrow">
          <span className="eyebrow light">Methodology</span>
          <h1>How the directory is built</h1>
          <p>One country at a time, with a visible source trail for every record.</p>
        </div>
      </section>
      <section className="section shell narrow prose-page">
        <h2>What counts as an international school?</h2>
        <p>
          The directory begins with schools that publicly offer a recognised international
          curriculum, serve internationally mobile families, or operate as an international
          or bilingual school under local rules. Labels remain descriptive so users can
          distinguish international, bilingual, integrated, day, and boarding models.
        </p>
        <h2>Minimum record standard</h2>
        <ol>
          <li>An identifiable operating school and official website.</li>
          <li>A confirmed city and country.</li>
          <li>Published curriculum or programme information.</li>
          <li>A source URL and the date it was checked.</li>
        </ol>
        <h2>What comes next</h2>
        <p>
          The Vietnam and Thailand collections are verified starting sets, not yet complete
          national censuses. Future review batches will add schools, correct records, and
          introduce fields such as fees and admissions only where dependable sources are available.
        </p>
        <div className="method-cta"><Link className="button primary" href="/countries/thailand">Explore Thailand</Link></div>
      </section>
    </main>
  );
}
