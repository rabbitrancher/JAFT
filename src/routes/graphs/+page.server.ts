import { db } from "$lib/server/db";
import { entries, categories } from "$lib/server/db/schema";
import { asc, eq } from "drizzle-orm";

/**
 * Retrieves all entries from the database, including their corresponding category names, sorted by date in ascending order.
 *
 * @returns An array of objects containing entry information
 */
export async function load() {
	const allEntries = await db
		.select({
			id: entries.id,
			date: entries.date,
			amount: entries.amount,
			type: entries.type,
			category: categories.name,
			description: entries.description,
			notes: entries.notes,
		})
		.from(entries)
		.leftJoin(categories, eq(entries.category_id, categories.id))
		.orderBy(asc(entries.date));

	return {
		entries: allEntries,
	};
}
