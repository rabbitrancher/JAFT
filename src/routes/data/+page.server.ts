import { db } from "$lib/server/db";
import { entries, categories } from "$lib/server/db/schema";
import { desc } from "drizzle-orm";
import { eq } from "drizzle-orm";

// loads in all entries from the
export async function load() {
	/**
	 * Retrieves all entries from the database, including their corresponding category names,
	 * sorted by date in descending order.
	 *
	 * @returns An array of objects containing entry information
	 */
	const allEntries = await db
		.select({
			id: entries.id,
			date: entries.date,
			description: entries.description,
			amount: entries.amount,
			type: entries.type,
			category: categories.name,
		})
		.from(entries)
		.leftJoin(categories, eq(entries.category_id, categories.id))
		.orderBy(desc(entries.date));

	return { entries: allEntries };
}
