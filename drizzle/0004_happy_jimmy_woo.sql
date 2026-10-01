CREATE TABLE `measurements` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`observed_at` text NOT NULL,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_measurement_time` ON `measurements` (`source`,`observed_at`);