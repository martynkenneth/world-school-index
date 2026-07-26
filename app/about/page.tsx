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
          <p>One field at a time, with literal evidence from fetched primary sources.</p>
        </div>
      </section>
      <section className="section shell narrow prose-page">
        <h2>Useful coverage, honest status</h2>
        <p>
          Once a school&apos;s identity, location, and official website are confirmed, it can
          appear as a provisional profile. This keeps the directory useful while making it
          clear which facts still need field-level evidence.
        </p>
        <p>
          A fact receives an evidence-backed label only when it appears on a fetched
          primary-source page with a source URL, retrieval date, and short evidence snippet.
          Unsupported values never receive verified status.
        </p>
        <h2>Publication gate</h2>
        <ol>
          <li>Records must pass the strict school-data schema.</li>
          <li>Every populated field must carry field-level provenance.</li>
          <li>Conflicting sources are retained for human review, not silently resolved.</li>
          <li>At least eight core fields are required before search indexing.</li>
        </ol>
        <h2>Profile visibility</h2>
        <p>
          Vietnam and Thailand profiles remain visible while evidence capture continues.
          School pages below the eight-field threshold are labelled provisional and excluded
          from search indexing. Country and city directories remain discoverable.
        </p>
        <div className="method-cta">
          <Link className="button primary" href="/about/crawler">Crawler policy</Link>
          <Link className="button outline" href="/disclaimer">Read the data disclaimer</Link>
        </div>
      </section>
    </main>
  );
}
