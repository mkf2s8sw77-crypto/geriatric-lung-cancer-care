ALTER TABLE `ai_analyses` ADD `style` text DEFAULT 'balanced' NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_analyses` ADD `evidence_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_analyses` ADD `patient_hint` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `ai_analyses_style_idx` ON `ai_analyses` (`style`);