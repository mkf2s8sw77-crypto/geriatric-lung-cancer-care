CREATE TABLE `knowledge_bases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`source` text NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`approved_by` text DEFAULT '演示护理部' NOT NULL,
	`approved_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `knowledge_questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nurse_user_id` integer NOT NULL,
	`question` text NOT NULL,
	`matched_knowledge_ids` text DEFAULT '[]' NOT NULL,
	`answer_body` text NOT NULL,
	`confidence` text NOT NULL,
	`confidence_score` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`nurse_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `kb_category_idx` ON `knowledge_bases` (`category`);--> statement-breakpoint
CREATE INDEX `kq_nurse_idx` ON `knowledge_questions` (`nurse_user_id`);