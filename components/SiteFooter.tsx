import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div>
          <span className="eyebrow light">World School Index</span>
          <h2>A careful directory, built country by country.</h2>
        </div>
        <div>
          <p>
            School details change. Every record carries a source and verification date;
            families should always confirm admissions information with the school.
          </p>
          <div className="footer-links">
            <Link href="/countries/vietnam">Explore Vietnam</Link>
            <Link href="/about">How records are verified</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
