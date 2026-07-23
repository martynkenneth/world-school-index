import Link from "next/link";
import type { School } from "@/data/schools";
import { formatVerifiedDate } from "@/data/schools";

export function SchoolCard({ school }: { school: School }) {
  return (
    <article className="school-card">
      <div className="card-topline">
        <span className="school-monogram" aria-hidden="true">
          {school.shortName.slice(0, 2).toUpperCase()}
        </span>
        <span className="verified-pill">Verification pending</span>
      </div>
      <p className="location-line">
        <Link href={`/cities/${school.citySlug}`}>{school.city}</Link> · {school.region}
      </p>
      <h3>
        <Link href={`/schools/${school.slug}`}>{school.name}</Link>
      </h3>
      <div className="tag-row">
        {school.curricula.slice(0, 3).map((item) => (
          <span className="tag" key={item}>{item}</span>
        ))}
      </div>
      <dl className="card-facts">
        <div><dt>Ages</dt><dd>{school.ageRange}</dd></div>
        <div><dt>Language</dt><dd>{school.language}</dd></div>
      </dl>
      <div className="card-footer">
        <small>Legacy check {formatVerifiedDate(school.verifiedOn)}</small>
        <Link className="text-link" href={`/schools/${school.slug}`}>View record →</Link>
      </div>
    </article>
  );
}
