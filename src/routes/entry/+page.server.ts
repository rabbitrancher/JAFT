import { eq, isNotNull } from "drizzle-orm";
import { db } from "$lib/server/db";
import { entries, categories, accounts } from "$lib/server/db/schema";
import type { Actions } from "./$types";
import { toSentenceCase, toTitleCase } from "$lib/utils/format";

export const actions: Actions = {
	/**
	 * Handles new entry form submission.
	 * - Normalizes category to Title Case and validates against the hardcoded list
	 * - Normalizes description to Sentence case
	 * - Returns { success: false, error } if category is invalid
	 * Returns { success: true } on successful insert
	 */
	default: async ({ request }) => {
		const formData = await request.formData();

		const amount = Number(formData.get("amount"));
		const type = String(formData.get("type")) as TransactionType;
		const accountId = Number(formData.get("account"));

		const toAccountData = formData.get("target-account");
		const toAccountId = toAccountData ? Number(toAccountData) : null;

		const notes = String(formData.get("notes") || "");
		const date = String(formData.get("date"));

		// Sentence case the description input
		const rawDescription = String(formData.get("description") || "");
		const description = rawDescription ? toSentenceCase(rawDescription) : null;

		const db_account = await db.select().from(accounts).where(eq(accounts.id, accountId)).get();
		if (!db_account) {
			return { success: false, error: "Unable to find account" };
		}

		if (type === "transfer") {
			if (!toAccountId) {
				return { success: false, error: "Target account is required for transfers" };
			}

			const db_to_account = await db
				.select()
				.from(accounts)
				.where(eq(accounts.id, toAccountId))
				.get();

			if (!db_to_account) {
				return { success: false, error: "Unable to find target account" };
			}

			const transfer_id = await db
				.select()
				.from(categories)
				.where(eq(categories.name, "Transfer"))
				.get()?.id;

			await db.insert(entries).values({
				amount,
				type,
				account_id: db_account.id,
				to_account_id: db_to_account.id,
				category_id: transfer_id,
				description,
				notes: notes || null,
				date,
			});
		} else {
			const categoryNameFormData = formData.get("category");
			if (!categoryNameFormData) {
				return { success: false, error: "Category is required" };
			}

			// make sure to Title Case the category input
			const categoryName = toTitleCase(String(categoryNameFormData));

			let db_category = await db
				.select()
				.from(categories)
				.where(eq(categories.name, categoryName))
				.get();

			// validate category exists in DB if categories_enforced setting is true.
			// note that base categories are seeded from BASE_CATEGORIES on startup
			if (!db_category) {
				if (formData.get("categories_enforced") === "true") {
					return { success: false, error: "Invalid category" };
				} else {
					// if allowed, insert the new category into the categories table and retrieve the newly entered entry
					await db.insert(categories).values({ name: categoryName });
					db_category = await db
						.select()
						.from(categories)
						.where(eq(categories.name, categoryName))
						.get();

					if (!db_category) {
						return { success: false, error: "Unable to update categories" };
					}
				}
			}

			await db.insert(entries).values({
				amount,
				type,
				account_id: db_account.id,
				category_id: db_category.id,
				description,
				notes: notes || null,
				date,
			});
		}

		return { success: true };
	},
};

/**
 * Loads data needed for the entry form.
 * - categories: hardcoded list from $lib/categories (unless user-modified via unlocking categories in the settings), used for fuzzy search autocomplete
 * - descriptions: unique past descriptions from DB, used for fuzzy search autocomplete
 */
export async function load() {
	const activeAccounts = await db
		.selectDistinct({ id: accounts.id, name: accounts.name })
		.from(accounts)
		.where(eq(accounts.archived, false));

	const dbCategories = await db.selectDistinct({ name: categories.name }).from(categories);

	const pastDescriptions = await db
		.selectDistinct({ description: entries.description })
		.from(entries)
		.where(isNotNull(entries.description));

	return {
		accounts: activeAccounts,
		categories: dbCategories.map((c) => c.name),
		descriptions: pastDescriptions.map((d) => d.description as string),
	};
}
