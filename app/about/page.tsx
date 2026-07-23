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
        <h2>Evidence before coverage</h2>
        <p>
          A value is stored only when it appears on a fetched primary-source page. Each
          populated field records its source URL, retrieval date, and a short verbatim
          evidence snippet. Unsupported values remain unpublished.
        </p>
        <h2>Publication gate</h2>
        <ol>
          <li>Records must pass the strict school-data schema.</li>
          <li>Every populated field must carry field-level provenance.</li>
          <li>Conflicting sources are retained for human review, not silently resolved.</li>
          <li>At least eight core fields are required before search indexing.</li>
        </ol>
        <h2>Migration status</h2>
        <p>
          Earlier Vietnam and Thailand entries remain visible as legacy records while they
          are migrated. They are excluded from search indexing until they pass the new
          field-level evidence and completeness checks.
        </p>
        <div className="method-cta"><Link className="button primary" href="/about/crawler">Crawler policy</Link></div>
      </section>
    </main>
  );
}
