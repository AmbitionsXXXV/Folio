CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`content_json` text,
	`content_text` text,
	`is_inbox` integer DEFAULT true NOT NULL,
	`is_starred` integer DEFAULT false NOT NULL,
	`is_pinned` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`version` text DEFAULT '1' NOT NULL,
	`deleted_at` integer,
	`sync_status` text DEFAULT 'pending',
	`last_synced_at` integer
);
--> statement-breakpoint
CREATE INDEX `entries_user_id_updated_at_idx` ON `entries` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `entries_user_id_is_inbox_idx` ON `entries` (`user_id`,`is_inbox`);--> statement-breakpoint
CREATE INDEX `entries_user_id_is_starred_idx` ON `entries` (`user_id`,`is_starred`);--> statement-breakpoint
CREATE INDEX `entries_user_id_deleted_at_idx` ON `entries` (`user_id`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `entries_sync_status_idx` ON `entries` (`sync_status`);--> statement-breakpoint
CREATE TABLE `entry_review_state` (
	`entry_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`due_at` integer NOT NULL,
	`last_reviewed_at` integer,
	`interval_days` integer DEFAULT 0 NOT NULL,
	`ease` real DEFAULT 2.5 NOT NULL,
	`reps` integer DEFAULT 0 NOT NULL,
	`lapses` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`sync_status` text DEFAULT 'pending'
);
--> statement-breakpoint
CREATE INDEX `entry_review_state_user_due_idx` ON `entry_review_state` (`user_id`,`due_at`);--> statement-breakpoint
CREATE TABLE `entry_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`source_id` text NOT NULL,
	`position` text,
	`created_at` integer NOT NULL,
	`sync_status` text DEFAULT 'pending'
);
--> statement-breakpoint
CREATE INDEX `entry_sources_entry_id_source_id_idx` ON `entry_sources` (`entry_id`,`source_id`);--> statement-breakpoint
CREATE INDEX `entry_sources_source_id_idx` ON `entry_sources` (`source_id`);--> statement-breakpoint
CREATE TABLE `entry_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`tag_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`sync_status` text DEFAULT 'pending'
);
--> statement-breakpoint
CREATE INDEX `entry_tags_entry_id_tag_id_idx` ON `entry_tags` (`entry_id`,`tag_id`);--> statement-breakpoint
CREATE INDEX `entry_tags_tag_id_idx` ON `entry_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `review_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`entry_id` text NOT NULL,
	`note` text,
	`rating` text DEFAULT 'good' NOT NULL,
	`scheduled_due_at` integer,
	`reviewed_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`sync_status` text DEFAULT 'pending'
);
--> statement-breakpoint
CREATE INDEX `review_events_user_id_idx` ON `review_events` (`user_id`);--> statement-breakpoint
CREATE INDEX `review_events_entry_id_idx` ON `review_events` (`entry_id`);--> statement-breakpoint
CREATE INDEX `review_events_reviewed_at_idx` ON `review_events` (`reviewed_at`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text DEFAULT 'link' NOT NULL,
	`title` text NOT NULL,
	`url` text,
	`author` text,
	`published_at` integer,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`sync_status` text DEFAULT 'pending',
	`last_synced_at` integer
);
--> statement-breakpoint
CREATE INDEX `sources_user_id_idx` ON `sources` (`user_id`);--> statement-breakpoint
CREATE INDEX `sources_user_id_type_idx` ON `sources` (`user_id`,`type`);--> statement-breakpoint
CREATE INDEX `sources_user_id_deleted_at_idx` ON `sources` (`user_id`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `sources_sync_status_idx` ON `sources` (`sync_status`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`sync_status` text DEFAULT 'pending',
	`last_synced_at` integer
);
--> statement-breakpoint
CREATE INDEX `tags_user_id_name_idx` ON `tags` (`user_id`,`name`);--> statement-breakpoint
CREATE INDEX `tags_sync_status_idx` ON `tags` (`sync_status`);