CREATE TABLE `ai_butler_conversations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`user_text` text NOT NULL,
	`detected_intent` text NOT NULL,
	`bot_reply` text NOT NULL,
	`matched_rule_id` text NOT NULL,
	`model_version` text DEFAULT 'mock-butler-v1' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ai_butler_pushes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`push_type` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`cta` text DEFAULT '' NOT NULL,
	`cta_href` text DEFAULT '' NOT NULL,
	`expires_at` text NOT NULL,
	`read_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `butler_conv_patient_idx` ON `ai_butler_conversations` (`patient_id`);--> statement-breakpoint
CREATE INDEX `butler_pushes_patient_idx` ON `ai_butler_pushes` (`patient_id`);--> statement-breakpoint
CREATE INDEX `butler_pushes_type_idx` ON `ai_butler_pushes` (`push_type`);