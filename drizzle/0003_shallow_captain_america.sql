CREATE TABLE `source_state` (
	`id` text PRIMARY KEY NOT NULL,
	`next_allowed` integer DEFAULT 0 NOT NULL,
	`last_attempt` text,
	`last_success` text,
	`last_error` text,
	`last_count` integer DEFAULT 0 NOT NULL,
	`payload` text
);
