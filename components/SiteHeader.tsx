import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="brand" href="/" aria-label="World School Index home">
          <span className="brand-mark">W</span>
          <span>
            <strong>World School Index</strong>
            <small>International schools, clearly mapped</small>
          </span>
        </Link>
        <nav aria-label="Primary navigation">
          <Link href="/countries/vietnam">Vietnam</Link>
          <Link href="/about">Methodology</Link>
        </nav>
      </div>
    </header>
  );
}
