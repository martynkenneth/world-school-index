CREATE TABLE `parent_perspectives` (
	`id` text PRIMARY KEY NOT NULL,
	`school_slug` text NOT NULL,
	`relationship` text NOT NULL,
	`year_group` text NOT NULL,
	`attendance_period` text NOT NULL,
	`topics` text NOT NULL,
	`comment` text NOT NULL,
	`parent_email` text NOT NULL,
	`consent_to_publish` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`moderated_at` integer,
	`moderator_email` text,
	`moderation_note` text
);
--> statement-breakpoint
CREATE INDEX `parent_perspectives_school_status_idx` ON `parent_perspectives` (`school_slug`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `parent_perspectives_email_created_idx` ON `parent_perspectives` (`parent_email`,`created_at`);