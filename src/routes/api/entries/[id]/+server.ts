import { json, type RequestHandler } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { entries, categories, accounts } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { toTitleCase, toSentenceCase } from "$lib/utils/format";

const account = alias(accounts, "account");
const toAccount = alias(accounts, "to_account");

/**
 * Updates an existing entry.
 *
 * @param {Object} params - The URL parameters containing the entry `id`.
 * @param {Object} request - The HTTP request containing the entry updates.
 * @returns {Response} A JSON response indicating whether the update was successful.
 */
export const PATCH: RequestHandler = async ({ params, request }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) {
		return json({ error: "Invalid id" }, { status: 400 });
	}

	/**
	 * The request body is expected to be in the following format:
	 * {
	 *   allowNewCategories: boolean;
	 *   updates: {
	 *     date?: string;
	 *     amount?: number;
	 *     type?: "income" | "expense" | "transfer";
	 *     account?: string;
	 *     to_account?: string;
	 *     category?: string;
	 *     description?: string;
	 *     notes?: string;
	 *   };
	 * }
	 */
	const body = (await request.json()) as {
		allowNewCategories: boolean;
		updates: {
			date?: string;
			amount?: number;
			type?: "income" | "expense" | "transfer";
			account?: string;
			to_account?: string;
			category?: string;
			description?: string;
			notes?: string;
		};
	};

	const { updates, allowNewCategories } = body;

	/**
	 * Create a new object to store the safe updates, to prevent unauthorized data from being updated.
	 */
	const safeUpdates: Record<string, unknown> = {};

	if (updates.date) {
		safeUpdates.date = String(updates.date);
	}
	if (updates.amount) {
		safeUpdates.amount = Number(updates.amount);
		if (Number(safeUpdates.amount) < 0) {
			return json({ error: "Can't have a negative amount" }, { status: 400 });
		}
	}
	if (updates.type === "income" || updates.type === "expense" || updates.type === "transfer") {
		safeUpdates.type = updates.type;
	}
	if (updates.description) {
		safeUpdates.description = toSentenceCase(String(updates.description));
	}
	if (updates.notes) {
		safeUpdates.notes = String(updates.notes);
	}
	if (updates.account) {
		const account = await db
			.select()
			.from(accounts)
			.where(eq(accounts.name, updates.account))
			.get();

		if (!account) {
			return json({ error: "Invalid account" }, { status: 400 });
		}

		safeUpdates.account_id = account.id;
	}
	if (updates.to_account !== undefined) {
		if (updates.to_account === "") {
			safeUpdates.to_account_id = null;
		} else {
			const account = await db
				.select()
				.from(accounts)
				.where(eq(accounts.name, updates.to_account))
				.get();

			if (!account) {
				return json({ error: "Invalid target account" }, { status: 400 });
			}

			safeUpdates.to_account_id = account.id;
		}
	}
	if (safeUpdates.to_account_id === null && safeUpdates.type === "transfer") {
		return json({ error: "Must provide a target account for a transfer entry" }, { status: 400 });
	}
	if (updates.category) {
		// category is stored as a foreign key, so we need to look up the ID
		// Category names are title case
		const categoryName = toTitleCase(String(updates.category));
		let category = await db
			.select()
			.from(categories)
			.where(eq(categories.name, categoryName))
			.get();

		if (!category) {
			// if it's an unrecognized category and categories are locked, error
			if (!allowNewCategories) {
				return json({ error: "Invalid category" }, { status: 400 });
			}
			// if categories are not locked, insert the new category
			const result = await db.insert(categories).values({ name: categoryName }).returning();
			category = result[0];
		}

		safeUpdates.category_id = category.id;
	}

	const result = await db
		.update(entries)
		.set(safeUpdates)
		.where(eq(entries.id, id))
		.returning({ id: entries.id });

	if (result.length === 0) {
		return json({ error: "Entry not found" }, { status: 404 });
	}

	const updatedEntry = await db
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
		.where(eq(entries.id, id))
		.get();

	return json(updatedEntry);
};

/**
 * Deletes an existing entry.
 *
 * @param {Object} params - The URL parameters containing the entry `id`.
 * @returns {Response} A JSON response indicating whether the deletion was successful.
 */
export const DELETE: RequestHandler = async ({ params }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) {
		return json({ error: "Invalid id" }, { status: 400 });
	}

	const result = await db.delete(entries).where(eq(entries.id, id)).returning({ id: entries.id });

	if (result.length === 0) {
		return json({ error: "Entry not found" }, { status: 404 });
	}

	return json({ success: true });
};
