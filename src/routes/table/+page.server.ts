import { db } from "$lib/server/db";
import { entries as entriesTable } from "$lib/server/db/schema";
import { isNotNull } from "drizzle-orm";
import type { accounts, categories } from "$lib/server/db/schema";

type Account = typeof accounts.$inferSelect;
type Category = typeof categories.$inferSelect;

type Entry = {
	id: number;
	date: string;
	amount: number;
	type: "income" | "expense" | "transfer";
	account: string | null;
	to_account: string | null;
	category: string | null;
	description: string | null;
	notes: string | null;
};

/**
 * Loads the necessary data for the application, including entries, accounts, categories, and past descriptions.
 *
 * @param {Object} params - Parameters for the load function.
 * @param {Function} params.fetch - A function to fetch data from the API.
 *
 * @returns {Promise<Object>} A promise that resolves with an object containing the loaded data.
 */
export async function load({ fetch }) {
	const [entries, allAccounts, categories]: [Entry[], Account[], Category[]] = await Promise.all([
		fetch("/api/entries").then((r) => r.json()),
		fetch("/api/accounts?archived=false").then((r) => r.json()),
		fetch("/api/categories").then((r) => r.json()),
	]);

	const pastDescriptions = await db
		.selectDistinct({ description: entriesTable.description })
		.from(entriesTable)
		.where(isNotNull(entriesTable.description));

	return {
		entries,
		accounts: allAccounts,
		categories: categories.map((c) => c.name),
		descriptions: pastDescriptions.map((d) => d.description as string),
	};
}
