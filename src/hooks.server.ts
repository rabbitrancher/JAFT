import { db } from "$lib/server/db";
import { categories } from "$lib/server/db/schema";
import { BASE_CATEGORIES } from "$lib/types/categories";

console.log("Setting up database...");
// seed categories by adding the possible categories to the table used to enforce limited category options.
// for now no way to remove categories except by wiping the table.
await db
	.insert(categories)
	.values(BASE_CATEGORIES.map((name) => ({ name })))
	.onConflictDoNothing();
console.log("Seeded categories successfully");
