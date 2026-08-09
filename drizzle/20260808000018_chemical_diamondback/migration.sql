CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'checking' NOT NULL,
	`starting_balance` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_name_unique` ON `accounts` (`name`);
--> statement-breakpoint
INSERT INTO `accounts` (`name`, `type`, `starting_balance`) VALUES ('Main Account', 'checking', 0);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`amount` real NOT NULL,
	`type` text NOT NULL,
	`category_id` integer,
	`account_id` integer NOT NULL,
	`to_account_id` integer,
	`description` text,
	`notes` text,
	`date` text DEFAULT '2026-08-07' NOT NULL,
	`created_at` text DEFAULT '2026-08-07T23:37:53.410Z' NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_entries` ("id", "amount", "type", "category_id", "account_id", "to_account_id", "description", "notes", "date", "created_at")
SELECT "id", "amount", "type", "category_id", (SELECT id FROM accounts WHERE name = 'Main Account'), NULL, "description", "notes", "date", "created_at"
FROM `entries`;
--> statement-breakpoint
DROP TABLE `entries`;
--> statement-breakpoint
ALTER TABLE `__new_entries` RENAME TO `entries`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
