CREATE TABLE `ai_conversations` (
	`id` varchar(64) character set utf8mb4 collate utf8mb4_bin NOT NULL,
	`user_id` varchar(64) character set utf8mb4 collate utf8mb4_bin NOT NULL,
	`title` varchar(255) NOT NULL,
	`private_learning_context` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `ai_conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_messages` (
	`id` varchar(64) character set utf8mb4 collate utf8mb4_bin NOT NULL,
	`conversation_id` varchar(64) character set utf8mb4 collate utf8mb4_bin NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`mode` enum('fast','deep') NOT NULL,
	`source_metadata` json,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `ai_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `annotations` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`annotation_id` varchar(64) character set utf8mb4 collate utf8mb4_bin NOT NULL,
	`user_id` varchar(64) character set utf8mb4 collate utf8mb4_bin NOT NULL,
	`article_slug` varchar(255) character set utf8mb4 collate utf8mb4_bin NOT NULL,
	`quote_exact` text NOT NULL,
	`quote_prefix` text NOT NULL,
	`quote_suffix` text NOT NULL,
	`note` text NOT NULL,
	`color` varchar(32) NOT NULL,
	`version` bigint unsigned NOT NULL DEFAULT 1,
	`source_updated_at` datetime(3) NOT NULL,
	`deleted_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `annotations_id` PRIMARY KEY(`id`),
	CONSTRAINT `annotations_user_annotation_uq` UNIQUE(`user_id`,`annotation_id`)
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` varchar(64) character set utf8mb4 collate utf8mb4_bin NOT NULL,
	`article_slug` varchar(255) character set utf8mb4 collate utf8mb4_bin NOT NULL,
	`version` bigint unsigned NOT NULL DEFAULT 1,
	`source_updated_at` datetime(3) NOT NULL,
	`deleted_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `favorites_id` PRIMARY KEY(`id`),
	CONSTRAINT `favorites_user_article_uq` UNIQUE(`user_id`,`article_slug`)
);
--> statement-breakpoint
CREATE TABLE `learning_progress_devices` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` varchar(64) character set utf8mb4 collate utf8mb4_bin NOT NULL,
	`article_slug` varchar(255) character set utf8mb4 collate utf8mb4_bin NOT NULL,
	`device_id` varchar(36) character set utf8mb4 collate utf8mb4_bin NOT NULL,
	`read_seconds` int unsigned NOT NULL DEFAULT 0,
	`listen_seconds` int unsigned NOT NULL DEFAULT 0,
	`max_progress` decimal(5,4) NOT NULL DEFAULT 0,
	`resume_heading_id` varchar(255),
	`resume_progress` decimal(5,4),
	`resume_scroll_y` int unsigned,
	`last_activity_at` datetime(3) NOT NULL,
	`completed_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `learning_progress_devices_id` PRIMARY KEY(`id`),
	CONSTRAINT `learning_progress_user_article_device_uq` UNIQUE(`user_id`,`article_slug`,`device_id`),
	CONSTRAINT `learning_progress_max_progress_ck` CHECK(`learning_progress_devices`.`max_progress` between 0 and 1),
	CONSTRAINT `learning_progress_resume_progress_ck` CHECK(`learning_progress_devices`.`resume_progress` is null or `learning_progress_devices`.`resume_progress` between 0 and 1)
);
--> statement-breakpoint
CREATE TABLE `oauth_accounts` (
	`id` varchar(64) character set utf8mb4 collate utf8mb4_bin NOT NULL,
	`account_id` varchar(255) character set utf8mb4 collate utf8mb4_bin NOT NULL,
	`provider_id` varchar(64) character set utf8mb4 collate utf8mb4_bin NOT NULL,
	`user_id` varchar(64) character set utf8mb4 collate utf8mb4_bin NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` datetime(3),
	`refresh_token_expires_at` datetime(3),
	`scope` text,
	`password` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `oauth_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `oauth_accounts_provider_account_uq` UNIQUE(`provider_id`,`account_id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(64) character set utf8mb4 collate utf8mb4_bin NOT NULL,
	`user_id` varchar(64) character set utf8mb4 collate utf8mb4_bin NOT NULL,
	`token` varchar(255) character set utf8mb4 collate utf8mb4_bin NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`ip_address` varchar(64),
	`user_agent` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_token_uq` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `sync_operations` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` varchar(64) character set utf8mb4 collate utf8mb4_bin NOT NULL,
	`operation_id` varchar(64) character set utf8mb4 collate utf8mb4_bin NOT NULL,
	`device_id` varchar(36) character set utf8mb4 collate utf8mb4_bin NOT NULL,
	`entity_type` enum('progress','annotation','favorite') NOT NULL,
	`entity_id` varchar(255) character set utf8mb4 collate utf8mb4_bin NOT NULL,
	`operation` enum('upsert','delete') NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `sync_operations_id` PRIMARY KEY(`id`),
	CONSTRAINT `sync_operations_user_operation_uq` UNIQUE(`user_id`,`operation_id`)
);
--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` varchar(64) character set utf8mb4 collate utf8mb4_bin NOT NULL,
	`preference_key` varchar(128) NOT NULL,
	`preference_value` json NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `user_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_preferences_user_key_uq` UNIQUE(`user_id`,`preference_key`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(64) character set utf8mb4 collate utf8mb4_bin NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`email_verified` boolean NOT NULL DEFAULT false,
	`image` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_uq` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `verifications` (
	`id` varchar(64) character set utf8mb4 collate utf8mb4_bin NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `verifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `ai_conversations` ADD CONSTRAINT `ai_conversations_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_messages` ADD CONSTRAINT `ai_messages_conversation_id_ai_conversations_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `ai_conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `annotations` ADD CONSTRAINT `annotations_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `learning_progress_devices` ADD CONSTRAINT `learning_progress_devices_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `oauth_accounts` ADD CONSTRAINT `oauth_accounts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sync_operations` ADD CONSTRAINT `sync_operations_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_preferences` ADD CONSTRAINT `user_preferences_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ai_conversations_user_updated_idx` ON `ai_conversations` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `ai_messages_conversation_created_idx` ON `ai_messages` (`conversation_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `annotations_user_article_updated_idx` ON `annotations` (`user_id`,`article_slug`,`updated_at`);--> statement-breakpoint
CREATE INDEX `learning_progress_user_article_idx` ON `learning_progress_devices` (`user_id`,`article_slug`);--> statement-breakpoint
CREATE INDEX `oauth_accounts_user_idx` ON `oauth_accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sync_operations_created_idx` ON `sync_operations` (`created_at`);--> statement-breakpoint
CREATE INDEX `verifications_identifier_idx` ON `verifications` (`identifier`);