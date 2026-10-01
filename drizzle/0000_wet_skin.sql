CREATE TABLE `events` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` text NOT NULL,
	`content` text NOT NULL,
	`city` text NOT NULL,
	`area` text NOT NULL,
	`category` text NOT NULL,
	`sentiment` text NOT NULL,
	`source` text NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`received_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_id_unique` ON `events` (`id`);--> statement-breakpoint
CREATE INDEX `idx_events_mode_time` ON `events` (`demo`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_events_mode_city` ON `events` (`demo`,`city`);