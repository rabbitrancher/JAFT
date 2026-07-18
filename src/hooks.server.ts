import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db } from "$lib/server/db";
import { categories } from "$lib/server/db/schema";
import { BASE_CATEGORIES } from "$lib/categories";

// run sql migrations
console.log("Running migrations...");
migrate(db, { migrationsFolder: "drizzle" });
console.log("Migrations complete");

// seed categories
console.log("Starting seed...");
// adds the possible categories to the table used to enforce limited category options.
// for now no way to remove categories except by wiping the table.
await db
	.insert(categories)
	.values(BASE_CATEGORIES.map((name) => ({ name })))
	.onConflictDoNothing();
console.log("Seeded categories successfully");
