import type { accounts, categories } from "$lib/server/db/schema";
import type { Entry } from "$lib/types/entries";

type Account = typeof accounts.$inferSelect;
type Category = typeof categories.$inferSelect;

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

	const pastDescriptions = [
		...new Set(
			entries
				.map((entry) => entry.description)
				.filter((description): description is string => description !== null),
		),
	];

	return {
		entries,
		accounts: allAccounts,
		categories: categories.map((c) => c.name),
		descriptions: pastDescriptions,
	};
}
