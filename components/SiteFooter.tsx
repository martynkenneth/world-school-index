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
            School details change. Provisional profiles make the directory useful while
            field-level evidence is collected; only qualifying school records are indexed.
          </p>
          <div className="footer-links">
            <Link href="/countries/vietnam">Explore Vietnam</Link>
            <Link href="/countries/thailand">Explore Thailand</Link>
            <Link href="/countries/singapore">Explore Singapore</Link>
            <Link href="/about">How records are verified</Link>
            <Link href="/disclaimer">Data disclaimer</Link>
            <Link href="/about/crawler">Crawler policy</Link>
            <Link href="/parent-perspectives/moderate">Moderate perspectives</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
