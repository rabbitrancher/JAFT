PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`amount` real NOT NULL,
	`type` text NOT NULL,
	`category_id` integer,
	`description` text,
	`notes` text,
	`date` text DEFAULT '2026-06-24' NOT NULL,
	`created_at` text DEFAULT '2026-06-24T01:34:25.651Z' NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_entries`("id", "amount", "type", "category_id", "description", "notes", "date", "created_at") SELECT "id", "amount", "type", "category_id", "description", "notes", "date", "created_at" FROM `entries`;--> statement-breakpoint
DROP TABLE `entries`;--> statement-breakpoint
ALTER TABLE `__new_entries` RENAME TO `entries`;--> statement-breakpoint
PRAGMA foreign_keys=ON;