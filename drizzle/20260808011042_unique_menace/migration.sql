PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL UNIQUE,
	`type` text DEFAULT 'checking' NOT NULL,
	`starting_balance` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_accounts`(`id`, `name`, `type`, `starting_balance`) SELECT `id`, `name`, `type`, `starting_balance` FROM `accounts`;--> statement-breakpoint
DROP TABLE `accounts`;--> statement-breakpoint
ALTER TABLE `__new_accounts` RENAME TO `accounts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL UNIQUE
);
--> statement-breakpoint
INSERT INTO `__new_categories`(`id`, `name`) SELECT `id`, `name` FROM `categories`;--> statement-breakpoint
DROP TABLE `categories`;--> statement-breakpoint
ALTER TABLE `__new_categories` RENAME TO `categories`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`amount` real NOT NULL,
	`type` text NOT NULL,
	`category_id` integer,
	`account_id` integer NOT NULL,
	`to_account_id` integer,
	`description` text,
	`notes` text,
	`date` text DEFAULT '2026-08-08' NOT NULL,
	`created_at` text DEFAULT '2026-08-08T01:10:42.126Z' NOT NULL,
	CONSTRAINT `entries_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`),
	CONSTRAINT `entries_account_id_accounts_id_fk` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`),
	CONSTRAINT `entries_to_account_id_accounts_id_fk` FOREIGN KEY (`to_account_id`) REFERENCES `accounts`(`id`)
);
--> statement-breakpoint
INSERT INTO `__new_entries`(`id`, `amount`, `type`, `category_id`, `account_id`, `to_account_id`, `description`, `notes`, `date`, `created_at`) SELECT `id`, `amount`, `type`, `category_id`, `account_id`, `to_account_id`, `description`, `notes`, `date`, `created_at` FROM `entries`;--> statement-breakpoint
DROP TABLE `entries`;--> statement-breakpoint
ALTER TABLE `__new_entries` RENAME TO `entries`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
DROP INDEX IF EXISTS `accounts_name_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `categories_name_unique`;