ALTER TABLE `learning_progress_devices` DROP CONSTRAINT `learning_progress_max_progress_ck`;--> statement-breakpoint
ALTER TABLE `learning_progress_devices` DROP CONSTRAINT `learning_progress_resume_progress_ck`;--> statement-breakpoint
ALTER TABLE `learning_progress_devices` MODIFY COLUMN `max_progress` decimal(5,2) NOT NULL;--> statement-breakpoint
ALTER TABLE `learning_progress_devices` MODIFY COLUMN `resume_progress` decimal(5,2);--> statement-breakpoint
ALTER TABLE `annotations` ADD `article_title` varchar(255);--> statement-breakpoint
ALTER TABLE `annotations` ADD `selected_text` text;--> statement-breakpoint
ALTER TABLE `annotations` ADD `heading_id` varchar(255);--> statement-breakpoint
ALTER TABLE `annotations` ADD `heading_text` text;--> statement-breakpoint
ALTER TABLE `annotations` ADD `source_created_at` datetime(3);--> statement-breakpoint
ALTER TABLE `learning_progress_devices` ADD `title` varchar(255);--> statement-breakpoint
ALTER TABLE `learning_progress_devices` ADD `category` varchar(128);--> statement-breakpoint
ALTER TABLE `learning_progress_devices` ADD `first_read_at` datetime(3);--> statement-breakpoint
UPDATE `annotations` SET `article_title` = `article_slug`, `selected_text` = `quote_exact`, `source_created_at` = `created_at` WHERE `article_title` IS NULL OR `selected_text` IS NULL OR `source_created_at` IS NULL;--> statement-breakpoint
UPDATE `learning_progress_devices` SET `title` = `article_slug`, `category` = 'Uncategorized', `first_read_at` = `created_at` WHERE `title` IS NULL OR `category` IS NULL OR `first_read_at` IS NULL;--> statement-breakpoint
ALTER TABLE `annotations` MODIFY COLUMN `article_title` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `annotations` MODIFY COLUMN `selected_text` text NOT NULL;--> statement-breakpoint
ALTER TABLE `annotations` MODIFY COLUMN `source_created_at` datetime(3) NOT NULL;--> statement-breakpoint
ALTER TABLE `learning_progress_devices` MODIFY COLUMN `title` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `learning_progress_devices` MODIFY COLUMN `category` varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE `learning_progress_devices` MODIFY COLUMN `first_read_at` datetime(3) NOT NULL;--> statement-breakpoint
ALTER TABLE `learning_progress_devices` ADD CONSTRAINT `learning_progress_max_progress_ck` CHECK (`learning_progress_devices`.`max_progress` between 0 and 100);--> statement-breakpoint
ALTER TABLE `learning_progress_devices` ADD CONSTRAINT `learning_progress_resume_progress_ck` CHECK (`learning_progress_devices`.`resume_progress` is null or `learning_progress_devices`.`resume_progress` between 0 and 100);
