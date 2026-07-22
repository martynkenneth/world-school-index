import Link from "next/link";
import { SchoolCard } from "@/components/SchoolCard";
import { countries, schools } from "@/data/schools";

const featured = schools.filter((school) => school.featured).slice(0, 3);

export default function Home() {
  return (
    <main>
      <section className="home-hero">
        <div className="shell hero-grid">
          <div>
            <span className="eyebrow light">The independent school directory</span>
            <h1>Find the right international school, anywhere.</h1>
            <p className="hero-copy">
              A source-led directory of international schools, built carefully country by
              country. Vietnam is the first live collection.
            </p>
            <div className="hero-actions">
              <Link className="button primary" href="/countries/vietnam">Explore Vietnam</Link>
              <Link className="button ghost" href="/about">How we verify</Link>
            </div>
          </div>
          <div className="coverage-card">
            <div className="coverage-orbit" aria-hidden="true"><span>VN</span></div>
            <span className="eyebrow">Coverage now</span>
            <strong>{schools.length}</strong>
            <p>source-checked school records across {countries[0].cityCount} Vietnamese cities</p>
            <div className="coverage-progress"><span /></div>
            <small>Vietnam · Initial collection expanding</small>
          </div>
        </div>
      </section>

      <section className="section shell country-launch">
        <div className="section-heading split-heading">
          <div>
            <span className="eyebrow">Country index</span>
            <h2>Starting with Vietnam</h2>
          </div>
          <p>
            Each country collection uses the same structured record, making the directory
            straightforward to extend without sacrificing quality.
          </p>
        </div>
        <Link className="country-card" href="/countries/vietnam">
          <div className="country-code">VN</div>
          <div>
            <span className="status-dot">Live collection</span>
            <h3>Vietnam</h3>
            <p>Hanoi · Ho Chi Minh City · Da Nang</p>
          </div>
          <dl>
            <div><dt>Schools</dt><dd>{countries[0].schoolCount}</dd></div>
            <div><dt>Cities</dt><dd>{countries[0].cityCount}</dd></div>
          </dl>
          <span className="country-arrow">→</span>
        </Link>
      </section>

      <section className="section warm-section">
        <div className="shell">
          <div className="section-heading split-heading">
            <div>
              <span className="eyebrow">Featured records</span>
              <h2>A first look at Vietnam</h2>
            </div>
            <Link className="text-link" href="/countries/vietnam">See all Vietnam schools →</Link>
          </div>
          <div className="school-grid">
            {featured.map((school) => <SchoolCard key={school.slug} school={school} />)}
          </div>
        </div>
      </section>

      <section className="section shell principles">
        <div className="principles-intro">
          <span className="eyebrow">Built for trust</span>
          <h2>Useful facts. Visible sources. No invented rankings.</h2>
        </div>
        <div className="principle-grid">
          <article><span>01</span><h3>Source-led</h3><p>Every school record links back to an official source.</p></article>
          <article><span>02</span><h3>Date-stamped</h3><p>Verification dates make stale information easier to spot.</p></article>
          <article><span>03</span><h3>Globally consistent</h3><p>The same core fields will work for every country and city.</p></article>
        </div>
      </section>
    </main>
  );
}
