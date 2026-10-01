CREATE TABLE `x_ingestion` (
	`id` text PRIMARY KEY NOT NULL,
	`since_id` text,
	`next_allowed` integer DEFAULT 0 NOT NULL,
	`last_attempt` text,
	`last_success` text,
	`last_error` text,
	`day` text,
	`reserved_posts` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `events` ADD `source_url` text;--> statement-breakpoint
ALTER TABLE `events` ADD `author_username` text;--> statement-breakpoint
ALTER TABLE `events` ADD `author_name` text;--> statement-breakpoint
ALTER TABLE `events` ADD `author_avatar` text;