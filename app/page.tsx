import Link from "next/link";
import { SchoolCard } from "@/components/SchoolCard";
import { countryCoverage, coverageSummary } from "@/data/coverage";
import { countries, schools } from "@/data/schools";

const featuredSlugs = [
  "united-nations-international-school-hanoi",
  "international-school-ho-chi-minh-city",
  "international-school-bangkok",
  "nist-international-school-bangkok",
  "bangkok-patana-school",
  "prem-international-school-chiang-mai",
  "uwc-south-east-asia",
  "singapore-american-school",
];
const featured = featuredSlugs
  .map((slug) => schools.find((school) => school.slug === slug))
  .filter((school): school is (typeof schools)[number] => Boolean(school));
const totalCities = new Set(schools.map((school) => `${school.countryCode}:${school.city}`)).size;
const countryStats = new Map(countries.map((country) => [country.code, country]));

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
              country. Vietnam, Thailand, and Singapore are now live.
            </p>
            <div className="hero-actions">
              <Link className="button primary" href="/countries/singapore">Explore Singapore</Link>
              <Link className="button ghost" href="/countries/thailand">Explore Thailand</Link>
              <Link className="button ghost" href="/countries/vietnam">Explore Vietnam</Link>
              <Link className="button ghost" href="/about">How we verify</Link>
            </div>
          </div>
          <div className="coverage-card">
            <div className="coverage-orbit" aria-hidden="true"><span>VN</span></div>
            <span className="eyebrow">Coverage now</span>
            <strong>{schools.length}</strong>
            <p>official-source-linked profiles across {totalCities} cities in {countries.length} countries</p>
            <div className="coverage-progress"><span /></div>
            <small>Vietnam + Thailand + Singapore · Collections expanding</small>
          </div>
        </div>
      </section>

      <section className="section shell country-launch" id="country-roadmap">
        <div className="section-heading split-heading">
          <div>
            <span className="eyebrow">Global coverage roadmap</span>
            <h2>Vietnam, Thailand, and Singapore live. Southeast Asia next.</h2>
          </div>
          <p>
            Every country moves through the same research, verification, and publication
            stages. Future countries remain clearly labelled until records meet the minimum standard.
          </p>
        </div>
        <div className="coverage-board" aria-label="Southeast Asia coverage progress">
          <div className="coverage-summary">
            <div><strong>{coverageSummary.published}</strong><span>country published</span></div>
            <div><strong>{coverageSummary.researching}</strong><span>countries in research</span></div>
            <div><strong>{coverageSummary.queued}</strong><span>countries queued</span></div>
          </div>
          <div className="roadmap-grid">
            {countryCoverage.map((country) => {
              const stats = countryStats.get(country.code);
              const content = (
                <>
                  <div className="roadmap-code">{country.code}</div>
                  <div>
                    <span className={`roadmap-status ${country.stage}`}>{country.stageLabel}</span>
                    <h3>{country.name}</h3>
                    <p>{country.nextStep}</p>
                    {stats && (
                      <small>{stats.schoolCount} records · {stats.cityCount} cities</small>
                    )}
                  </div>
                </>
              );
              return country.stage === "published" ? (
                <Link className="roadmap-country live" href={`/countries/${country.slug}`} key={country.code}>
                  {content}<span className="country-arrow">→</span>
                </Link>
              ) : (
                <article className="roadmap-country" key={country.code}>{content}</article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section warm-section">
        <div className="shell">
          <div className="section-heading split-heading">
            <div>
              <span className="eyebrow">Featured records</span>
              <h2>A first look across Southeast Asia</h2>
            </div>
            <Link className="text-link" href="/countries/singapore">See all Singapore schools →</Link>
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
          <article><span>02</span><h3>Status-labelled</h3><p>Each profile distinguishes provisional facts from evidence-backed claims.</p></article>
          <article><span>03</span><h3>Globally consistent</h3><p>The same core fields will work for every country and city.</p></article>
        </div>
      </section>
    </main>
  );
}
