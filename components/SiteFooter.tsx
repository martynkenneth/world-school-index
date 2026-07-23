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
            School details change. New-format records carry field-level source evidence;
            legacy records remain excluded from indexing until migrated.
          </p>
          <div className="footer-links">
            <Link href="/countries/vietnam">Explore Vietnam</Link>
            <Link href="/countries/thailand">Explore Thailand</Link>
            <Link href="/about">How records are verified</Link>
            <Link href="/about/crawler">Crawler policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
