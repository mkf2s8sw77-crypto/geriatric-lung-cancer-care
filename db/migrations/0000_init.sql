CREATE TABLE `ai_analyses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`assessment_id` integer,
	`model` text DEFAULT 'mock-geriatric-lung-v1' NOT NULL,
	`input_json` text NOT NULL,
	`output_json` text NOT NULL,
	`status` text DEFAULT '已生成' NOT NULL,
	`nurse_note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`source` text NOT NULL,
	`source_id` integer,
	`level` text NOT NULL,
	`rule_version` text NOT NULL,
	`rule_snapshot` text NOT NULL,
	`status` text DEFAULT '未处理' NOT NULL,
	`handler_user_id` integer,
	`handled_at` text,
	`summary` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`handler_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `assessment_answers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`assessment_id` integer NOT NULL,
	`scale_item_id` integer NOT NULL,
	`score` real NOT NULL,
	FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`scale_item_id`) REFERENCES `scale_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `assessments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`scale_id` integer NOT NULL,
	`filled_by_user_id` integer NOT NULL,
	`source` text DEFAULT '患者' NOT NULL,
	`status` text DEFAULT '草稿' NOT NULL,
	`total_score` real,
	`top_symptom_code` text,
	`top_symptom_score` real,
	`delta_vs_prev` real,
	`risk_level` text,
	`submitted_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`scale_id`) REFERENCES `scales`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`filled_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_user_id` integer,
	`actor_role` text,
	`action` text NOT NULL,
	`target_type` text,
	`target_id` text,
	`summary` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `education_assignments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`resource_id` integer NOT NULL,
	`assigned_by` integer NOT NULL,
	`assigned_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`resource_id`) REFERENCES `education_resources`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `education_resources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`applicable_stage` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`read_minutes` integer DEFAULT 3 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `followups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`nurse_id` integer NOT NULL,
	`scheduled_at` text NOT NULL,
	`status` text DEFAULT '计划' NOT NULL,
	`method` text DEFAULT '电话' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`next_followup_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`nurse_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `interventions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`nurse_id` integer NOT NULL,
	`alert_id` integer,
	`action_type` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`nurse_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`alert_id`) REFERENCES `alerts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pathway_steps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pathway_id` integer NOT NULL,
	`ordinal` integer NOT NULL,
	`task_type` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`relative_day` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`pathway_id`) REFERENCES `pathways`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pathways` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`version` integer NOT NULL,
	`applicable_stage` text NOT NULL,
	`status` text DEFAULT '草稿' NOT NULL,
	`is_demo` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `patient_education_reads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`resource_id` integer NOT NULL,
	`read_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`confirmed` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`resource_id`) REFERENCES `education_resources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `patient_pathways` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`pathway_id` integer NOT NULL,
	`assigned_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`assigned_by` integer NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pathway_id`) REFERENCES `pathways`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `patients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`research_no` text NOT NULL,
	`full_name` text NOT NULL,
	`phone` text NOT NULL,
	`age` integer NOT NULL,
	`gender` text NOT NULL,
	`diagnosis` text NOT NULL,
	`treatment_stage` text NOT NULL,
	`enrollment_date` text NOT NULL,
	`followup_date` text NOT NULL,
	`primary_nurse_id` integer,
	`status` text DEFAULT '在组' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`primary_nurse_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `risk_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`version` integer NOT NULL,
	`status` text DEFAULT '草稿' NOT NULL,
	`thresholds_json` text NOT NULL,
	`is_demo` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scale_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`scale_id` integer NOT NULL,
	`ordinal` integer NOT NULL,
	`code` text NOT NULL,
	`prompt` text NOT NULL,
	`min_score` integer DEFAULT 0 NOT NULL,
	`max_score` integer DEFAULT 10 NOT NULL,
	`weight` real DEFAULT 1 NOT NULL,
	FOREIGN KEY (`scale_id`) REFERENCES `scales`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `scales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`version` integer NOT NULL,
	`status` text DEFAULT '草稿' NOT NULL,
	`is_demo` integer DEFAULT true NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `symptom_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`symptom_code` text NOT NULL,
	`symptom_name` text NOT NULL,
	`severity` integer NOT NULL,
	`occurred_at` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`pathway_id` integer,
	`pathway_step_id` integer,
	`task_type` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`scheduled_date` text NOT NULL,
	`status` text DEFAULT '待完成' NOT NULL,
	`feedback_note` text DEFAULT '' NOT NULL,
	`completed_at` text,
	`adjusted_from_id` integer,
	`adjusted_reason` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pathway_id`) REFERENCES `pathways`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pathway_step_id`) REFERENCES `pathway_steps`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text NOT NULL,
	`password_hash` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`last_login_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ai_analyses_patient_idx` ON `ai_analyses` (`patient_id`);--> statement-breakpoint
CREATE INDEX `alerts_patient_idx` ON `alerts` (`patient_id`);--> statement-breakpoint
CREATE INDEX `alerts_status_idx` ON `alerts` (`status`);--> statement-breakpoint
CREATE INDEX `alerts_level_idx` ON `alerts` (`level`);--> statement-breakpoint
CREATE UNIQUE INDEX `assessment_answers_uniq` ON `assessment_answers` (`assessment_id`,`scale_item_id`);--> statement-breakpoint
CREATE INDEX `assessments_patient_idx` ON `assessments` (`patient_id`);--> statement-breakpoint
CREATE INDEX `assessments_status_idx` ON `assessments` (`status`);--> statement-breakpoint
CREATE INDEX `audit_actor_idx` ON `audit_logs` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `audit_action_idx` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE UNIQUE INDEX `education_assignments_uniq` ON `education_assignments` (`patient_id`,`resource_id`);--> statement-breakpoint
CREATE INDEX `education_category_idx` ON `education_resources` (`category`);--> statement-breakpoint
CREATE INDEX `followups_patient_idx` ON `followups` (`patient_id`);--> statement-breakpoint
CREATE INDEX `followups_nurse_idx` ON `followups` (`nurse_id`);--> statement-breakpoint
CREATE INDEX `interventions_patient_idx` ON `interventions` (`patient_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `pathway_steps_uniq` ON `pathway_steps` (`pathway_id`,`ordinal`);--> statement-breakpoint
CREATE UNIQUE INDEX `pathways_uniq` ON `pathways` (`code`,`version`);--> statement-breakpoint
CREATE UNIQUE INDEX `patient_education_reads_uniq` ON `patient_education_reads` (`patient_id`,`resource_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `patient_pathways_uniq` ON `patient_pathways` (`patient_id`,`pathway_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `patients_research_no_uniq` ON `patients` (`research_no`);--> statement-breakpoint
CREATE UNIQUE INDEX `patients_user_uniq` ON `patients` (`user_id`);--> statement-breakpoint
CREATE INDEX `patients_primary_nurse_idx` ON `patients` (`primary_nurse_id`);--> statement-breakpoint
CREATE INDEX `patients_status_idx` ON `patients` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `risk_rules_uniq` ON `risk_rules` (`code`,`version`);--> statement-breakpoint
CREATE UNIQUE INDEX `scale_items_uniq` ON `scale_items` (`scale_id`,`ordinal`);--> statement-breakpoint
CREATE UNIQUE INDEX `scales_code_ver_uniq` ON `scales` (`code`,`version`);--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_uniq` ON `sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `symptom_reports_patient_idx` ON `symptom_reports` (`patient_id`);--> statement-breakpoint
CREATE INDEX `tasks_patient_idx` ON `tasks` (`patient_id`);--> statement-breakpoint
CREATE INDEX `tasks_date_idx` ON `tasks` (`scheduled_date`);--> statement-breakpoint
CREATE INDEX `tasks_status_idx` ON `tasks` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_uniq` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);