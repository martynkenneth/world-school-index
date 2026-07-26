import Link from "next/link";
import type { School } from "@/data/schools";
import { formatVerifiedDate } from "@/data/schools";
import { getVerificationSummary } from "@/data/verification";

export function SchoolCard({ school }: { school: School }) {
  const verification = getVerificationSummary(school.slug);
  return (
    <article className="school-card">
      <div className="card-topline">
        <span className="school-monogram" aria-hidden="true">
          {school.shortName.slice(0, 2).toUpperCase()}
        </span>
        <span className={`verified-pill ${verification.hasStrictRecord ? "reviewed" : "provisional"}`}>
          {verification.hasStrictRecord
            ? `Evidence review ${verification.completenessScore}/12`
            : "Provisional profile"}
        </span>
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
        <small>
          {verification.lastVerified
            ? `Evidence checked ${formatVerifiedDate(verification.lastVerified)}`
            : `Official source linked ${formatVerifiedDate(school.verifiedOn)}`}
        </small>
        <Link className="text-link" href={`/schools/${school.slug}`}>View record →</Link>
      </div>
    </article>
  );
}
