import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  cityGuides,
  getCityGuide,
  guideUrl,
  SITE_URL,
  type CityGuide,
} from "@/data/guides";
import { formatVerifiedDate } from "@/data/schools";

type GuideParams = Promise<{ country: string; city: string; topic: string }>;

export function generateStaticParams() {
  return cityGuides.map((guide) => ({
    country: guide.country_slug,
    city: guide.city_slug,
    topic: guide.topic,
  }));
}

export async function generateMetadata({ params }: { params: GuideParams }): Promise<Metadata> {
  const { country, city, topic } = await params;
  const guide = getCityGuide(country, city, topic);
  if (!guide) return {};

  return {
    title: `${guide.title} | World School Index`,
    description: guide.description,
    alternates: { canonical: guide.canonical_path },
    robots: { index: true, follow: true },
    openGraph: {
      title: guide.title,
      description: guide.description,
      type: "article",
      publishedTime: guide.published_date,
      modifiedTime: guide.checked_date,
      url: guideUrl(guide),
    },
  };
}

function Citations({ guide, sourceIds }: { guide: CityGuide; sourceIds: string[] }) {
  const sources = sourceIds.map((id) => guide.sources.find((source) => source.id === id));
  return (
    <span className="guide-citations" aria-label="Sources">
      {sources.map((source, index) => source && (
        <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
          {source.publisher}{index < sources.length - 1 ? ";" : " ↗"}
        </a>
      ))}
    </span>
  );
}

export default async function GuidePage({ params }: { params: GuideParams }) {
  const { country, city, topic } = await params;
  const guide = getCityGuide(country, city, topic);
  if (!guide) notFound();

  const canonicalUrl = guideUrl(guide);
  const isCultureGuide = guide.topic === "culture-and-etiquette";
  const topicLabel = isCultureGuide ? "Culture and etiquette" : "Living in the city";
  const directAnswerQuestion = isCultureGuide
    ? `What etiquette should a family know before living in ${guide.city}?`
    : `What should a family know before living in ${guide.city}?`;
  const keyFactsHeading = isCultureGuide
    ? `${guide.city} etiquette: key facts`
    : `Living in ${guide.city}: key facts`;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    datePublished: guide.published_date,
    dateModified: guide.checked_date,
    mainEntityOfPage: canonicalUrl,
    author: { "@type": "Organization", name: "World School Index" },
    publisher: { "@type": "Organization", name: "World School Index", url: `${SITE_URL}/` },
    about: { "@type": "Place", name: `${guide.city}, ${guide.country}` },
    citation: guide.sources.map((source) => source.url),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "World", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: guide.country, item: `${SITE_URL}/countries/${guide.country_slug}` },
      { "@type": "ListItem", position: 3, name: guide.city, item: `${SITE_URL}/cities/${guide.city_slug}` },
      { "@type": "ListItem", position: 4, name: guide.title, item: canonicalUrl },
    ],
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <section className="guide-hero">
        <div className="shell guide-hero-inner">
          <div className="breadcrumbs">
            <Link href="/">World</Link><span>/</span>
            <Link href={`/countries/${guide.country_slug}`}>{guide.country}</Link><span>/</span>
            <Link href={`/cities/${guide.city_slug}`}>{guide.city}</Link><span>/</span>
            <span>Living guide</span>
          </div>
          <span className="eyebrow light">City living guide · {topicLabel}</span>
          <h1>{guide.title}</h1>
          <p>{guide.description}</p>
          <div className="guide-dates">
            <span>Published {formatVerifiedDate(guide.published_date)}</span>
            <span>Sources checked {formatVerifiedDate(guide.checked_date)}</span>
            <span>Next review {formatVerifiedDate(guide.recheck_date)}</span>
          </div>
        </div>
      </section>

      <article className="section shell guide-layout">
        <div className="guide-content">
          <section className="direct-answer" aria-labelledby="direct-answer-heading">
            <span className="eyebrow">Direct answer</span>
            <h2 id="direct-answer-heading">{directAnswerQuestion}</h2>
            <p>{guide.direct_answer.text}</p>
            <Citations guide={guide} sourceIds={guide.direct_answer.source_ids} />
          </section>

          <section className="guide-section" aria-labelledby="key-facts-heading">
            <h2 id="key-facts-heading">{keyFactsHeading}</h2>
            <div className="guide-table-wrap">
              <table className="guide-table">
                <thead><tr><th scope="col">{isCultureGuide ? "Situation" : "Planning point"}</th><th scope="col">Practical baseline</th><th scope="col">Official source</th></tr></thead>
                <tbody>
                  {guide.key_facts.map((fact) => (
                    <tr key={fact.label}>
                      <th scope="row">{fact.label}</th>
                      <td>{fact.answer}</td>
                      <td><Citations guide={guide} sourceIds={fact.source_ids} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {guide.sections.map((section) => (
            <section className="guide-section" id={section.id} key={section.id}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.text}>
                  {paragraph.text} <Citations guide={guide} sourceIds={paragraph.source_ids} />
                </p>
              ))}
              {section.items.length > 0 && (
                <ul>
                  {section.items.map((item) => (
                    <li key={item.text}>
                      {item.text} <Citations guide={guide} sourceIds={item.source_ids} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <section className="guide-family" aria-labelledby="family-school-heading">
            <span className="eyebrow">School decisions</span>
            <h2 id="family-school-heading">{guide.family_section.heading}</h2>
            {guide.family_section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            <h3>Questions to take on a school visit</h3>
            <ul>{guide.family_section.checklist.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>

          <section className="guide-section guide-sources" aria-labelledby="official-sources-heading">
            <h2 id="official-sources-heading">Official sources</h2>
            <p>Evidence snippets are retained in the guide data for validation; the links below open the full official pages.</p>
            <ol>
              {guide.sources.map((source) => (
                <li key={source.id}>
                  <a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a>
                  <span>{source.publisher} · Retrieved {formatVerifiedDate(source.retrieved_date)}</span>
                </li>
              ))}
            </ol>
          </section>

          <aside className="guide-recheck">
            <strong>Reconfirm changeable details</strong>
            <p>Official arrangements and practical details can change. Check the linked official sources before acting; this guide is scheduled for review by {formatVerifiedDate(guide.recheck_date)}.</p>
          </aside>
        </div>

        <aside className="guide-nav" aria-label="Related directory pages">
          <span className="eyebrow">Continue comparing</span>
          <h2>{guide.city} school planning</h2>
          <nav>
            {guide.internal_links.map((link) => (
              <Link href={link.href} key={link.purpose}>{link.label}<span>→</span></Link>
            ))}
          </nav>
          <small>This guide supports practical planning; school records retain their separate evidence and index gates.</small>
        </aside>
      </article>
    </main>
  );
}
