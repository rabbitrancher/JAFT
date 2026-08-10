import { db } from "$lib/server/db";
import { entries, categories, accounts } from "$lib/server/db/schema";
import { asc, desc, eq, isNotNull } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";

const account = alias(accounts, "account");
const toAccount = alias(accounts, "to_account");

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
			account: account.name,
			to_account: toAccount.name,
			category: categories.name,
			description: entries.description,
			notes: entries.notes,
		})
		.from(entries)
		.leftJoin(categories, eq(entries.category_id, categories.id))
		.leftJoin(account, eq(entries.account_id, account.id))
		.leftJoin(toAccount, eq(entries.to_account_id, toAccount.id))
		.orderBy(desc(entries.date));

	const allActiveAccounts = await db.select().from(accounts).where(eq(accounts.archived, false));

	const sortedCategories = await db.selectDistinct().from(categories).orderBy(asc(categories.name));

	const pastDescriptions = await db
		.selectDistinct({ description: entries.description })
		.from(entries)
		.where(isNotNull(entries.description));

	return {
		entries: allEntries,
		accounts: allActiveAccounts,
		categories: sortedCategories.map((c) => c.name),
		descriptions: pastDescriptions.map((d) => d.description as string),
	};
}
