import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { chatGPTSignOutPath, requireChatGPTUser } from "@/app/chatgpt-auth";
import { listPendingParentPerspectives } from "@/db/parent-perspectives";
import { getSchool } from "@/data/schools";
import { isParentPerspectiveModerator } from "@/lib/parent-perspective-moderators";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Moderate Parent Perspectives | World School Index",
  robots: { index: false, follow: false },
};

export default async function ParentPerspectiveModerationPage() {
  const user = await requireChatGPTUser("/parent-perspectives/moderate");
  if (!(await isParentPerspectiveModerator(user.email))) notFound();
  const submissions = await listPendingParentPerspectives();

  return (
    <main>
      <section className="compact-hero">
        <div className="shell narrow">
          <span className="eyebrow light">Private moderation</span>
          <h1>Parent perspectives</h1>
          <p>Review pending submissions before anything appears on a public school profile.</p>
        </div>
      </section>
      <section className="section shell narrow moderation-page">
        <div className="moderation-toolbar">
          <p>Signed in as <strong>{user.email}</strong></p>
          <Link href={chatGPTSignOutPath("/parent-perspectives/moderate")}>Sign out</Link>
        </div>
        {submissions.length === 0 ? (
          <div className="empty-state">
            <h2>No perspectives awaiting review</h2>
            <p>New parent submissions will appear here as pending.</p>
          </div>
        ) : (
          <div className="moderation-list">
            {submissions.map((submission) => {
              const school = getSchool(submission.schoolSlug);
              return (
                <article className="moderation-card" key={submission.id}>
                  <div className="moderation-card-header">
                    <div>
                      <span className="eyebrow">Pending perspective</span>
                      <h2>{school?.name ?? submission.schoolSlug}</h2>
                    </div>
                    <time dateTime={submission.createdAt.toISOString()}>{submission.createdAt.toLocaleDateString("en-GB")}</time>
                  </div>
                  <dl>
                    <div><dt>Relationship</dt><dd>{submission.relationship}</dd></div>
                    <div><dt>Year group</dt><dd>{submission.yearGroup}</dd></div>
                    <div><dt>Attendance</dt><dd>{submission.attendancePeriod}</dd></div>
                    <div><dt>Topics</dt><dd>{submission.topics.join(", ")}</dd></div>
                    <div><dt>Private email</dt><dd>{submission.parentEmail}</dd></div>
                  </dl>
                  <blockquote>{submission.comment}</blockquote>
                  <form action="/api/parent-perspectives/moderate" method="post" className="moderation-form">
                    <input type="hidden" name="id" value={submission.id} />
                    <label>
                      Private moderation note
                      <input name="moderationNote" maxLength={500} placeholder="Optional reason or follow-up note" />
                    </label>
                    <div className="moderation-actions">
                      <button className="button primary" type="submit" name="status" value="approved">Publish perspective</button>
                      <button className="button danger" type="submit" name="status" value="rejected">Reject</button>
                    </div>
                  </form>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
