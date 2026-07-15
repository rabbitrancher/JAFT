import { db } from "$lib/server/db";
import { entries, categories } from "$lib/server/db/schema";
import { asc, desc, eq, isNotNull } from "drizzle-orm";

/**
 * Retrieves all entries from the database, including their corresponding category names, sorted by date in descending order.
 * Also returns all possible categories and previous descriptions for fuzzy assist during editing.
 *
 * @returns An array of objects containing entry information, an array of strings of all stored category names, and an array of strings storing all past description.
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
		.orderBy(desc(entries.date));

	const sortedCategories = await db.selectDistinct().from(categories).orderBy(asc(categories.name));

	const pastDescriptions = await db
		.selectDistinct({ description: entries.description })
		.from(entries)
		.where(isNotNull(entries.description));

	return {
		entries: allEntries,
		categories: sortedCategories.map((c) => c.name),
		descriptions: pastDescriptions.map((d) => d.description as string),
	};
}
