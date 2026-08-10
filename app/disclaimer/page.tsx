import Link from "next/link";

export const metadata = {
  title: "Data Disclaimer | World School Index",
  description: "How to interpret provisional and evidence-backed information in World School Index.",
};

export default function DisclaimerPage() {
  return (
    <main>
      <section className="compact-hero">
        <div className="shell narrow">
          <span className="eyebrow light">Data disclaimer</span>
          <h1>Use the directory as a starting point</h1>
          <p>Clear status labels help you see what has been checked and what still needs confirmation.</p>
        </div>
      </section>
      <section className="section shell narrow prose-page">
        <div className="disclaimer-callout">
          <strong>Always confirm important details directly with the school.</strong>
          <p>Admissions, fees, places, programmes, accreditation, and policies can change without notice.</p>
        </div>
        <h2>What provisional means</h2>
        <p>
          A provisional profile has a confirmed school identity and an official school source,
          but its displayed facts have not all completed field-level evidence review. Provisional
          information may be incomplete, outdated, or affected by conflicting source material.
        </p>
        <h2>What evidence-backed means</h2>
        <p>
          An evidence-backed label means the directory has stored a supporting source, retrieval
          date, and evidence snippet for that fact. It is not an endorsement, ranking, or guarantee
          that the information will remain current.
        </p>
        <h2>Before making a decision</h2>
        <p>
          Check the linked official source and contact the school directly. Where this directory
          and a school&apos;s current information differ, rely on the school&apos;s current published or
          confirmed information. Corrections are reviewed before publication.
        </p>
        <h2>How to interpret parent perspectives</h2>
        <p>
          Parent perspectives are user-submitted experiences, not school facts and not independently
          verified claims. They are moderated for privacy, relevance, and safety before publication,
          but they may still be subjective, incomplete, or outdated. They never affect evidence scores,
          indexing eligibility, rankings, or official school data.
        </p>
        <div className="method-cta">
          <Link className="button primary" href="/about">See the verification method</Link>
        </div>
      </section>
    </main>
  );
}
