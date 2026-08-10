import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const parentPerspectives = sqliteTable(
  "parent_perspectives",
  {
    id: text("id").primaryKey(),
    schoolSlug: text("school_slug").notNull(),
    relationship: text("relationship").notNull(),
    yearGroup: text("year_group").notNull(),
    attendancePeriod: text("attendance_period").notNull(),
    topics: text("topics", { mode: "json" }).$type<string[]>().notNull(),
    comment: text("comment").notNull(),
    parentEmail: text("parent_email").notNull(),
    consentToPublish: integer("consent_to_publish", { mode: "boolean" }).notNull(),
    status: text("status").notNull().default("pending"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    moderatedAt: integer("moderated_at", { mode: "timestamp_ms" }),
    moderatorEmail: text("moderator_email"),
    moderationNote: text("moderation_note"),
  },
  (table) => [
    index("parent_perspectives_school_status_idx").on(table.schoolSlug, table.status, table.createdAt),
    index("parent_perspectives_email_created_idx").on(table.parentEmail, table.createdAt),
  ],
);
