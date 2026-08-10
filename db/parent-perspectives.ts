import { and, asc, count, desc, eq, gte } from "drizzle-orm";
import { getDb } from "./index";
import { parentPerspectives } from "./schema";
import type { ParentPerspectiveInput } from "../lib/parent-perspectives";

export type PublishedParentPerspective = {
  id: string;
  relationship: string;
  yearGroup: string;
  attendancePeriod: string;
  topics: string[];
  comment: string;
  createdAt: Date;
};

export async function listPublishedParentPerspectives(schoolSlug: string): Promise<PublishedParentPerspective[]> {
  try {
    const db = await getDb();
    return await db
      .select({
        id: parentPerspectives.id,
        relationship: parentPerspectives.relationship,
        yearGroup: parentPerspectives.yearGroup,
        attendancePeriod: parentPerspectives.attendancePeriod,
        topics: parentPerspectives.topics,
        comment: parentPerspectives.comment,
        createdAt: parentPerspectives.createdAt,
      })
      .from(parentPerspectives)
      .where(and(eq(parentPerspectives.schoolSlug, schoolSlug), eq(parentPerspectives.status, "approved")))
      .orderBy(desc(parentPerspectives.createdAt))
      .limit(8);
  } catch {
    return [];
  }
}

export async function countRecentParentSubmissions(parentEmail: string): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const db = await getDb();
  const [row] = await db
    .select({ value: count() })
    .from(parentPerspectives)
    .where(and(eq(parentPerspectives.parentEmail, parentEmail), gte(parentPerspectives.createdAt, cutoff)));
  return row?.value ?? 0;
}

export async function createParentPerspective(input: ParentPerspectiveInput): Promise<void> {
  const db = await getDb();
  await db.insert(parentPerspectives).values({
    id: crypto.randomUUID(),
    ...input,
    status: "pending",
  });
}

export async function listPendingParentPerspectives() {
  const db = await getDb();
  return db
    .select()
    .from(parentPerspectives)
    .where(eq(parentPerspectives.status, "pending"))
    .orderBy(asc(parentPerspectives.createdAt));
}

export async function moderateParentPerspective(
  id: string,
  status: "approved" | "rejected",
  moderatorEmail: string,
  moderationNote: string,
): Promise<void> {
  const db = await getDb();
  await db
    .update(parentPerspectives)
    .set({ status, moderatorEmail, moderationNote: moderationNote || null, moderatedAt: new Date() })
    .where(eq(parentPerspectives.id, id));
}
